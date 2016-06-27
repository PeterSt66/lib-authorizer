'use strict';
const EventEmitter = require('events').EventEmitter;
const consts = require('./consts');
const lruCache = require('lru-cache');
const AuthorizationError = require('./AuthorizationError');
const defaultlogger = require('./defaultlogger');
const defaultOptions = {};

const defaultRecord = {
    expires: 0
};

class Authorizer extends EventEmitter {

    constructor(options) {
        super();

        this._options = Object.assign({}, defaultOptions, options);

        if (!this._options.authCall) {
            this._options.authCall = global.testing ? this.alwaysOkCall : this.alwaysWrongCall;
        }

        this.logger = this._options.logger;
        if (!this.logger) {
            this.logger = (global.sails && global.sails.log) ? global.sails.log : defaultlogger;
        }
        this.logger.silly('options=', options, this._options);

        this.cache = this.createCache(this._options);

        this._running = 0;
    }

    alwaysOkCall(req, authorizer) {
        authorizer.logger.silly('Always OK');
        return Promise.resolve({});
    }

    alwaysWrongCall(req) {
        return Promise.reject('No valid auth call');
    }

    /*
     Perform all logic to allow proper garbage collection
     */
    destroy() {
        // the line below won't be needed with Node6, it provides
        // a method 'eventNames()'
        const eventNames = Object.keys(this._events);
        eventNames.forEach((event) => {
            this.removeAllListeners(event);
        });
    }

    authorizeAndDecide(req, res, calledAfterSuccess) {
        const self = this;
        this.authorize(req, function resultPromise(resultPr) {
            resultPr
                .then(function foundRecord(authRecord) {
                    // If we made it here, looks like everything's ok, so we'll let the user through
                    self.logger.silly('Request authenticated, record:', authRecord);
                    /* eslint-disable no-param-reassign */
                    req.authRecord = authRecord;
                    calledAfterSuccess();
                })
                .catch(function hasError(err) {
                    self.logger.warn('Got exception on validating:', err);
                    return res.status(401).send().end();
                });
        });
    }


    authorize(req, resultFunc) {
        this.logger.silly('Authorizer cache:', this.cache.dump());
        this.running++;
        this.logger.silly('Running: ', this._running, 'testing:', global.testing);

        // step 0: need a valid request
        if (!req) {
            throw new AuthorizationError('No valid request');
        }
        // step 1: need an authorization token in the req
        const authHeader = req.get('Authorization');

        if (!authHeader && (global.testing || req.baseUrl.startsWith('http://localhost'))) {
            this.sendBackRecord('TESTTOKEN', {
                uid: 'localhost',
                name: 'Local tester'
            }, resultFunc);
            return;
        }

        if (!authHeader) {
            throw new AuthorizationError('No authorization header found');
        }
        const parts = authHeader.split(' ');
        if (parts[0] !== consts.AUTH_HEADER_TYPE) {
            throw new AuthorizationError(`Incorrect authorization type found in header, expected '${consts.AUTH_HEADER_TYPE}', found '${parts[0]}'`);
        }
        const authToken = parts[1];
        if (!authToken) {
            throw new AuthorizationError('No authorization token found after type');
        }

        let authRecord = this.cache.get(authToken);
        this.logger.silly('token found in request:', authToken, 'record from cache:', authRecord);

        if (authRecord && authRecord.expires < Date.now()) {
            this.logger.silly('Record found but is expired, invalidating it');
            authRecord = null;
        }

        if (authRecord) {
            this.sendBackRecord(authToken, authRecord, resultFunc);
            return;
        }
        this.fetchRecord(authToken, resultFunc);
    }

    fetchRecord(authToken, resultFunc) {
        const self = this;

        self._options.authCall(authToken, self)
            .then(function authResult(record) {
                const authRecord = Object.assign({}, defaultRecord, record);
                self.cache.set(authToken, authRecord);
                self.sendBackRecord(authToken, authRecord, resultFunc);
            })
            .catch(function onError(err) {
                self.cache.del(authToken);
                resultFunc(Promise.reject(new AuthorizationError('Could not fetch authorization: ' + err, err)));
            });
    }

    sendBackRecord(authToken, authRecord, resultFunc) {
        this.running--;
        if (authRecord) {
            this.logger.silly('Returning record', authRecord);
            resultFunc(Promise.resolve(authRecord));
            return;
        }
        this.cache.remove(authToken);
        resultFunc(Promise.reject(new AuthorizationError('Last call: could not authorize')));
    }

// /*
// Listen to certain events and execute logic
// This is mostly used for stats monitoring
// */
// _attachListeners() {
//   this.on('success', (d) => {
//     this._successHandler(d);
//   });
//   this.on('timeout', (d) => {
//     this._timeoutHandler(d);
//   });
//   this.on('failure', (d) => {
//     this._failureHandler(d);
//   });
// }


    createCache(options) {
        return lruCache({
            max: options.cacheMaxEntries || 5000,
            maxAge: options.cacheMaxAge || 1000 * 60 * 5 // 60 secs * 5 = 5 mins
        });
    }

}

module
    .exports = Authorizer;

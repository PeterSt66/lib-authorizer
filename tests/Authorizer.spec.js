'use strict';

const chai = require("chai");
const expect = chai.expect;
const should = chai.should();
const EventEmitter = require('events').EventEmitter;
//const sinon = require('sinon');

const Authorizer = require('../index.js');
const logger = require('../lib/defaultlogger');

let authorizer = null;
global.testing = false;

const okAuthHeader = 'Basic aWs6dG9rZW4=';
const wrongAuthHeader = 'Basic 123456=';

const makeRequest = (returnOk) => {
    logger.info('makerequest, ok=', returnOk);
    let req = {};
    req.baseUrl = 'http://testing.local';
    req.get = function (headerName) {
        logger.info('req.get(' + headerName + '): returning good header:', returnOk);
        return returnOk ? okAuthHeader : wrongAuthHeader;
    };
    return req;
};

const shouldGiveError = (promise, calledWhenSucces) => {
    return promise.then(function onResult(result) {
            logger.info('>> shouldGiveError fail: ', result);
            throw new Error('should not be here');
        })
        .catch(function onError(err) {
            logger.info('>> shouldGiveError success: ', err);
            return calledWhenSucces(err);
        });
};


const shouldBeOk = (promise, calledWhenSucces) => {
    logger.info('shouldBeOk init');
    return promise.then(function (result) {
            logger.info('>> shouldBeOk success:', result);
            return calledWhenSucces(result);
        })
        .catch(function (err) {
            logger.info('>> shouldBeOk fail:', err);
            throw new Error('should not be here', err);
        });
};


describe('Authorizer Class', () => {
    // setup tests
    it('Should be an instance of EventEmitter', () => {
        authorizer = new Authorizer();
        expect(authorizer).to.be.instanceof(EventEmitter);
    });

    // other tests
    it('Should reject a token rejected by the authorization call', (done) => {
        authorizer = new Authorizer({
            authCall: () => {
                logger.info('<< authCall called, rejecting with 401');
                return Promise.reject(401);
            }
        });
        return new Promise(function () {
            return authorizer.authorize(makeRequest(false), (resultPr) => {
                logger.info('<< got result:', resultPr);
                return shouldGiveError(resultPr, () => {
                    done();
                });
            });

        });
    });

    it('Should accept a token accepted by the authorization call', () => {
        authorizer = new Authorizer({
            authCall: () => {
                logger.info('<< authCall called, accepting');
                return Promise.resolve({name: 'ik', expires: Date.now() + 3600});
            }
        });
        return new Promise(function (resolve) {
            authorizer.authorize(makeRequest(true), (resultPr) => {
                shouldBeOk(resultPr, (result) => {
                    logger.verbose('GOT:', result);
                    should.exist(result);
                    should.exist(result.name);
                    expect(result.name).to.equal('ik');
                    resolve();
                });
            });

        });
    });

    it('Should not call authorization call if token already accepted once and not expired', () => {
        let called = false;
        authorizer = new Authorizer({
            authCall: () => {
                logger.info('<< authCall called, accepting, already-called:', called);
                called.should.be.false;
                called = true;
                return Promise.resolve({expires: Date.now() + 3600});
            }
        });
        // first time
        authorizer.authorize(makeRequest(true), (resultPr) => {
            shouldBeOk(resultPr, (result) => {
                should.exist(result);
                // second time
                authorizer.authorize(makeRequest(true), (resultPr2) => {
                    shouldBeOk(resultPr2, (result2) => {
                        should.exist(result2);
                        expect(result).to.be.equal(result2);
                    });
                });
            });
        });
    });

    it('Should not call authorization call if token already accepted once and not expired', () => {
        let called = false;
        authorizer = new Authorizer({
            authCall: () => {
                logger.info('<< authCall called, accepting, already-called:', called);
                called.should.be.false;
                called = true;
                return Promise.resolve({expires: Date.now() + 3600});
            }
        });
        // first time
        authorizer.authorize(makeRequest(true), (resultPr) => {
            shouldBeOk(resultPr, (result) => {
                should.exist(result);
                // second time
                authorizer.authorize(makeRequest(true), (resultPr2) => {
                    shouldBeOk(resultPr2, (result2) => {
                        should.exist(result2);
                        expect(result).to.be.equal(result2);
                    });
                });
            });
        });
    });

});

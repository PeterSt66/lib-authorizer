'use strict';

/* eslint-disable no-console */
module.exports = {
    silly: (...args) => {
        console.log('            ]] silly:', ...args);
    },
    verbose: (...args) => {
        console.log('            ]] verbose:', ...args);
    },
    info: (...args) => {
        console.log('            ]] info:', ...args);
    },
    warn: (...args) => {
        console.log('            ]] warn:', ...args);
    }
};


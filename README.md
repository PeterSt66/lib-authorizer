
lib-authorizer
==============

Authorizing layer for use in a sails policy.. 

**Requires Node 4.2.0 or higher but shines with 6.x **
** Expects a Sails 0.12.0 or higher environment **

## Examples

## Methods
Method | Argument(s) | Returns | Description
---|---|---|---
authorize|req, resultFunc|authRecord in resultFunc|tries to authorize the given request, if succesfull calls resultFunc() with authRecord found
authorizeAndDecide|req, res, calledAfterSuccess|401 in response or auth record in req.authRecord|authorizes the given request, decides and rejects with a 401 in the response or calls calledAfterSuccess() with no parms

## Events
(no events are exposed at the moment)

## How to use

```javascript
(later)
```


Option field|Description
---|---|---|---
authCall       | A function returning a Promise in which the autorization service is called, no arguments. result must be an authorizing record
logger         | logger to use, must be 'sails compatible', for an example see lib/defaultlogger.js. if not given it's assigned to the sails logger if found, otherwise the defaultlogger.

## Example
#### hasValidToken.js
Authorizer used in a Sails policy
``` javascript
'use strict'

const Authorizer = require('lib_authorizer');


const authCall = function() {
    return Promise.resolve({
        expires: Date.now() + 3600
    });
}


const authorizer = new Authorizer({
    authCall: authCall
});

module.exports = function hasValidToken(req, res, next) {

    authorizer.authorizeAndDecide(req, res, next);

};
```
     


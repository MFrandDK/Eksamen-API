const express = require('express');
const router = express.Router();
const jwt = require("jsonwebtoken");
const config = require('config');
const jwtKey = config.get('jwt_secret_key');
const Account = require('../models/account')

router.post('/', async (req, res) => {  // async keyword in function definition; due to 'await' in the function body
    // validate req.body (payload) as credentials {email, password}
    // check if the credentials are correct --> it returns the account matching the credentials if OK
    // generate a token by signing the (stringified) account object with the secret key
    // attach the token to the response header
    // responde with account (and token in header)
    // if anything went wrong -->
    //      send standard error response: 'Invalid account email or password'
    //      -- any specifics about the error sent to the client gives extra info to mallicious users (hackers), so don't :) 

    try {
        const { error } = Account.validateCredentials(req.body);    // validate req.body as credentials {email, password}
        if (error) throw { statusCode: 400, errorMessage: 'Badly formatted request', errorObj: error }

        const account = await Account.checkCredentials(req.body);   // awaiting (async keyword in function definition) the result of
                                                                    // of the checkCredentials method (which is a Promise)

        // generate the token
        const token = jwt.sign(JSON.stringify(account), jwtKey);    // the account object is turned into a string, the string gets encrypted with the secret key
                                                                    // token is a string(!)

        res.header('x-authentication-token', token);    // attaching the token to the header, as key - value pair:
                                                        //      'x-authentication-token': token
                                                        //
                                                        // !!!IMPORTANT: for this to work with the browser's CORS rules (Postman does not care about CORS)
                                                        //      the custom header 'x-authentication-token' needs to be exposed
                                                        //      that needs to be done in index.js --> configuring the cors module 

        return res.send(JSON.stringify(account));   // responding with account in response body (token is in the response header)
    } catch (err) {
        // if (err.statusCode == 400) is to inform the client that the REQUEST was wrong (email was missing or malformed),
        // does not inform anything about the internal workings of the API
        // *** this line was added in wad-liloDB-api-v3
        if (err.statusCode == 400) return res.status(err.statusCode).send(JSON.stringify(err));

        const standardError = { statusCode: 401, errorMessage: `Invalid account email or password`, errorObj: {} }
        return res.status(401).send(JSON.stringify(standardError));     // if ANYTHING (other than bad request) went wrong, send a standard error message
                                                                        // (if you need the specific message for debugging,
                                                                        //      change the << errorObj: {} >> part of standardError to << errorObj: err >>
                                                                        //      ...and don't forget to change it back when done fixing the bug
    }

    // return res.send(JSON.stringify({message: `POST /api/accounts/login`}));
})

module.exports = router;    // in JS, each separate file is considered an independent module
                            // router object is exported from this 'module' to be seen in other modules when using the command 'require' 


module.exports = router;
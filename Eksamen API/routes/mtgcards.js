const express = require('express');
const router = express.Router();

const mgtCard = require("../models/card");


//public endpoints
//GET /api/mtgcards - they can see all cards with 'visible' status
//POST /api/mtgcards - POST suggestions to index as 'hidden'. Needs verification from moderators to show as 'visible'

//private endpoints for admins
//GET /api/admin/mtgcards - separate file/route

//GET routes
router.get('/', async (req, res) => {
    res.header('Content-type', 'application/json'); 

    try {
        const mtgcards = await Card.readAll();
        //might need new function that calls certain parts of the index based on search terms
        return res.send(JSON.stringify(authors));
    } catch (err) {
        if (err.statusCode) return res.status(err.statusCode).send(JSON.stringify(err));
        return res.status(500).send(JSON.stringify(err));
    }

});

router.post('/', async (req, res) => {

    // the following piece of code is for testing purposes only!
    // for testing the readByEmail
    try {
        const { error } = Account.validateCredentials(req.body);
        if (error) throw { statusCode: 400, errorMessage: 'Badly formatted request', errorObj: error }

        const account = await Account.readByEmail(req.body.email);

        return res.send(JSON.stringify(account));
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).send(JSON.stringify(err));
        }
        return res.status(500).send(JSON.stringify(err));
    }
    // return res.send(JSON.stringify({message: `POST /api/accounts/login`}));
})


module.exports = router;
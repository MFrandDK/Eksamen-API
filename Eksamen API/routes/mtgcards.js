const express = require('express');
const router = express.Router();

const auth = require('../middleware/authenticate');
const admin = require('../middleware/admin');
const librarian = require('../middleware/librarian');
const check = require('../middleware/checkcardisation');


const mgtCard = require("../models/card");

const Joi = require('joi');
const moderator = require('../middleware/moderator');


//public endpoints
//GET /api/mtgcards - they can see all cards with 'visible' status
//POST /api/mtgcards - POST suggestions to index as 'hidden'. Needs verification from moderators to show as 'visible'

//private endpoints for admins
//GET /api/admin/mtgcards - separate file/route

//GET routes
router.get('/', async (req, res) => {
    // validate query parameters (req.query)
    // based on query parameters, call Card.readAll(queryObj)
    //      prepare the accounts array, based on all queries 
    // respond with accounts array
    // if error respond with error

    try {
        // validate query parameters (req.query)
        // cannot use card.validate as the query parameters are not mandatory (cannot be required)
        const schema = Joi.object({
            cardid: Joi.number()
                .integer()
                .min(1),
            title: Joi.string()
                .max(50)
                .required(),        
            manacost: Joi.number()
                .integer(),
            power: Joi.string()
                .max(50)
                .allow(null),
            toughness: Joi.string()
                .max(50)
                .allow(null),
            link: Joi.string()
                .uri()
                .max(255)
                .required(),
            ability: Joi.string()
                .max(255)
                .allow(null),
            flavortext: Joi.string()
                .max(255),
            cardstatus: Joi.string()
                .max(50)
                .required()
        })

        const { error } = schema.validate(req.query);
        if (error) throw { statusCode: 400, errorMessage: `Badly formatted request`, errorObj: error }

        // based on query parameters, will call Card.readAll(queryObj) one or more times
        const cardsArrays = [];  // will be an array of sets

        // queryKeyValuePairs is an array of [key, value] pairs, where each
        //      key: name of property, value: value of property
        //      of the req.query object
        const queryKeyValuePairs = Object.entries(req.query);

        // the normal for loops (for, forEach, etc.) cannot await Promises in their function body
        // have to use:     for await (value of iterable) {} -- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of
        for await ([key, value] of queryKeyValuePairs) {

            // call Card.readAll(queryObj)
            const cardsArray = await Card.readAll({ query: key, value: value });

            // push the cardsArray into the cardsArrays
            cardsArrays.push(cardsArray);
        }

        // prepare the cards array
        let cards = [];
        if (queryKeyValuePairs.length > 0) {    // there was at least one query
            // have to find the "intersection" of all the arrays in cardsArrays array
            // Set cannot be used for this here, unfortuantely - each object is unique - even if the information is the same in them
            // and Set does not have a method with custom defined comparator function, however Array does --> someArray.find()
            if (cardsArrays.length == 1) {
                cards = Array.from(cardsArrays[0]);    // if there was only 1 query, that is the result
            } else {
                const cardsArray = cardsArray.pop();  // removing the last array from cardsArrays
                cardsArray.forEach(card => {    // for each card in cardsArray
                    let intersect = true;
                    cardsArrays.forEach(caArray => {  // check if card can be found in all the other arrays in cardsArrays
                        const found = caArray.find(au => ca.cardid == card.cardid);   // found is an object or undefined (if not found)
                        intersect = intersect && found; // object is "truthy", undefined is "falsy"
                    })

                    // if intersect is still true, that means the card was found in all arrays (a.k.a. in all the queries)
                    if (intersect) cards.push(card);
                })
            }
        } else {    // there was no query
            cards = await Card.readAll();   // call Card.readAll() with no queryObj to get all cards
        }

        // respond with accounts array
        return res.send(JSON.stringify(cards));

    } catch (err) {
        if (err.statusCode) {   // if error with statusCode 
            return res.status(err.statusCode).send(JSON.stringify(err));
        }
        return res.status(500).send(JSON.stringify(err));   // if no statusCode    
    }

    // return res.send(JSON.stringify({ message: `GET /api/cards` }))
})

router.get('/:cardid', async (req, res) => {
    // validate cardid in req.params
    // call card.readById(req.params.cardid)
    // respond with card
    // if error respond with error

    try {
        // validate cardid in req.params
        const schema = Joi.object({
            cardid: Joi.number()
                .integer()
                .min(1)
                .required()
        })

        const { error } = schema.validate(req.params);
        if (error) throw { statusCode: 400, errorMessage: `Badly formatted request`, errorObj: error }

        // call Card.readById(req.params.cardid)
        const card = await Card.readById(req.params.cardid);

        // respond with card
        return res.send(JSON.stringify(card));

    } catch (err) {
        if (err.statusCode) {   // if error with statusCode 
            return res.status(err.statusCode).send(JSON.stringify(err));
        }
        return res.status(500).send(JSON.stringify(err));   // if no statusCode
    }

    // return res.send(JSON.stringify({ message: `GET /api/cards/${req.params.cardid}` }))
})

router.post('/', [auth, admin, moderator, check], async (req, res) => {
    // validate req.body (payload)
    // new card(req.body)
    // call create() method on the new card object
    // respond with card
    // if error respond with error

    try {
        // validate req.body (payload)
        const { error } = Card.validate(req.body);
        if (error) throw { statusCode: 400, errorMessage: `Badly formatted request`, errorObj: error }

        // new Card(req.body)
        const cardToBeSaved = new Card(req.body);

        // call create() method on the new card object
        const card = await cardToBeSaved.create();

        // respond with card
        return res.send(JSON.stringify(card));

    } catch (err) {
        if (err.statusCode) {   // if error with statusCode 
            return res.status(err.statusCode).send(JSON.stringify(err));
        }
        return res.status(500).send(JSON.stringify(err));   // if no statusCode
    }

    // return res.send(JSON.stringify({ message: `POST /api/cards` }))
})

router.put('/:cardid', [auth, admin, moderator, check], async (req, res) => {
    // !!! CHALLENGE:   we want to allow changing card properties
    // validate cardid (req.params)
    // call card.readById(req.params.cardid)
    // overwrite cardById's properties with as of req.body (payload)
    // validate cardById
    // call card.readByName(query) --> this MAY be 404 Not found! and that's good
    // if cardById.cardid != cardByName.cardid --> CANNOT UPDATE, 403 Forbidden
    // call cardById.update() -- cardById has the updated info, that was overwritten by the payload
    // responde with card
    // if error respond with error

    try {
        // validate cardid in req.params
        const schema = Joi.object({
            cardid: Joi.number()
                .integer()
                .min(1)
                .required()
        })

        let validationResult = schema.validate(req.params);
        if (validationResult.error) throw { statusCode: 400, errorMessage: `Badly formatted request`, errorObj: validationResult.error }

        // call Card.readById(req.params.cardid)
        const cardById = await Card.readById(req.params.cardid);  // cardById will hold the updated values before sent to DB

        // overwrite cardById's properties with as of req.body
        if (req.body.title) {
            cardById.title = req.body.title;
        }
        if (req.body.manacost) {
            cardById.manacost = req.body.manacost;
        }
        if (req.body.power) {
            cardById.power = req.body.power;
        }
        if (req.body.toughness) {
            cardById.toughness = req.body.toughness;
        }
        if (req.body.link) {
            cardById.link = req.body.link;
        }
        if (req.body.ability) {
            cardById.ability = req.body.ability;
        }
        if (req.body.flavortext) {
            cardById.flavortext = req.body.flavortext;
        }
        if (req.body.cardstatus) {
            cardById.cardstatus = req.body.cardstatus;
        }
        


        // validate cardById
        validationResult = Card.validate(cardById);
        if (validationResult.error) throw { statusCode: 400, errorMessage: `Badly formatted request`, errorObj: validationResult.error }

        // call Card.readByName(cardById.title)
        let cardByName;
        try {
            cardByName = await Card.readByName(cardById.title);
            // cardByName found --> so far OK, this could be the same card we are working on (a.k.a. only biolink was updated)
        } catch (innerErr) {
            if (innerErr.statusCode == 404) {   // cardByName NOT found --> that is OK too, the name is changed to something that is not in the DB yet
                cardByName = cardById   // ... because there will be a comparison later (see below)
            } else {
                throw innerErr;    // this means a real error, throw innerErr "outward" to let the outer try-catch structure's catch handle it
            }
        }

        // if cardById.cardid != cardByName.cardid --> CANNOT UPDATE, 403 Forbidden
        if (cardById.cardid != cardByName.cardid) throw { statusCode: 403, errorMessage: `Cannot update card with name: ${cardById.title}`, errorObj: {} }

        // call cardById.update()
        const card = await cardById.update();

        // respond with (updated) card
        return res.send(JSON.stringify(card));

    } catch (err) {
        if (err.statusCode) {   // if error with statusCode 
            return res.status(err.statusCode).send(JSON.stringify(err));
        }
        return res.status(500).send(JSON.stringify(err));   // if no statusCode
    }

    // return res.send(JSON.stringify({ message: `PUT /api/cards/${req.params.cardid}` }))
})
router.delete('/:cardid', [auth, admin, librarian, check], async (req, res) => {
    // validate cardid (in req.params)
    // call card.readById(req.params.cardid)
    // call card.delete()
    //      !!! IMPORTANT:  deleting from a DB is NOT a simple problem, while it is easy to remove a record from a table
    //                      you have to make sure that all references to that record are also removed (from all other tables)
    //                      and even then, the question remains: is the loss of information OK in the system, or
    //                      should 'deletion' be handled differently? read article: https://www.infoq.com/news/2009/09/Do-Not-Delete-Data/
    //      !!! in this project example >>  delete() will return with error if card has any books in the DB
    //                                      yes - that means the Book class has to be partially developed before delete() can be done 
    // respond with card - that has been removed from the DB
    // if error respond with error

    try {
        // validate cardid in req.params
        const schema = Joi.object({
            cardid: Joi.number()
                .integer()
                .min(1)
                .required()
        })

        const { error } = schema.validate(req.params);
        if (error) throw { statusCode: 400, errorMessage: `Badly formatted request`, errorObj: error }

        // call Card.readById(req.params.cardid)
        const card = await Card.readById(req.params.cardid);

        // call card.delete()
        const deletedCard = await card.delete();

        // respond with card - that has been removed from the DB
        return res.send(JSON.stringify(deletedCard));

    } catch (err) {
        if (err.statusCode) {   // if error with statusCode 
            return res.status(err.statusCode).send(JSON.stringify(err));
        }
        return res.status(500).send(JSON.stringify(err));   // if no statusCode
    }

    // return res.send(JSON.stringify({ message: `DELETE /api/cards/${req.params.cardid}` }))
})


module.exports = router;
const Joi = require('joi');
const sql = require('mssql');

const config = require('config');
const con = config.get('dbConfig_UCN');



// angiv constructor
// Schema, static mv.
// validate/validation schema 
// validate credentials

class Card {
    constructor(cardObj) {
        if (cardObj.cardid) {
            this.cardid = cardObj.cardid;
        }
        this.title = cardObj.title;
        this.manacost = cardObj.manacost;
        this.cardlink = cardObj.cardlink;
        if (cardObj.power) {
            this.power = cardObj.power;
        }
        if (cardObj.toughness) {
            this.toughness = cardObj.toughness;
        }
        this.link = cardObj.link
        if (cardObj.ability) {
            this.ability = cardObj.ability;
        }
        if (cardObj.flavortext) {
            this.flavortext = cardObj.flavortext;
        }
        this.cardstatus = cardObj.cardstatus;
        }
    

    static validationSchema() {
        const schema = Joi.object({
            cardid: Joi.number()
                .integer()
                .min(1),
            title: Joi.string()
                .max(50)
                .required(),        // DB: title NOT NULL
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
                .required(),
            subtype: Joi.object({
                subtypeid: Joi.number()
                    .integer()
                    .min(1),
                subtitle: Joi.string()
                    .max(50)
                    .required()
                }),
            maintype: Joi.object({
                maintypeid: Joi.number()
                    .integer()
                    .min(1),
                maintitle: Joi.string()
                    .max(50)
                    .required()
                    
                })
        })

        return schema;
    }

    static validate(cardObj) {
        const schema = Card.validationSchema();

        return schema.validate(cardObj);
    }

    static readAll() {
        return new Promise((resolve, reject) => {
            (async () => {
                // open connection to DB
                // query DB
                // restructure the DB response into the obj format we need
                //      validate the obj
                // if all good --> resolve with the obj(s)
                // if any error --> reject with the error information
                // CLOSE THE DB CONNECTION

                try {
                    const pool = await sql.connect(con);
                    const result = await pool.request()
                    // omskriv query til vores DB
                        // .query(`
                        //     SELECT *
                        //     FROM librcard b
                        //         INNER JOIN librcardAuthor ba
                        //         ON b.cardid = ba.FK_cardid
                        //             INNER JOIN librAuthor a
                        //             ON ba.FK_authorid = a.authorid
                        //     ORDER BY b.cardid, a.authorid
                        // `)

                    const cardBinder = [];  // will collect and restructure the cards in cardBinder - no validation just yet
                    let binderLastIndex = -1;
                    result.recordset.forEach(record => {
                        if (!cardBinder[binderLastIndex] || record.cardid != cardBinder[binderLastIndex].cardid) {
                            // add record as a new card to cardBinder
                            // increment binderLastIndex

                            const newcard = {
                                cardid: record.cardid,
                                title: record.title,
                                manacost: record.manacost,
                                cardlink: record.cardlink,
                                authors: [
                                    {
                                        authorid: record.authorid,
                                        firstname: record.firstname,
                                        lastname: record.lastname,
                                        biolink: record.biolink
                                    }
                                ]
                            }

                            cardBinder.push(newcard);
                            binderLastIndex++;

                        } else {
                            // erstattes af et andet table?
                            // const newAuthor = {
                            //     authorid: record.authorid,
                            //     firstname: record.firstname,
                            //     lastname: record.lastname,
                            //     biolink: record.biolink
                            // }

                            cardBinder[binderLastIndex].authors.push(newAuthor);
                        }
                    })

                    const cards = [];
                    cardBinder.forEach(card => {
                        const { error } = Card.validate(card);
                        if (error) throw { statusCode: 500, errorMessage: `Corrupt Card information in the database, cardid: ${card.cardid}`, errorObject: error }

                        cards.push(new Card(card));
                    })

                    resolve(cards);

                } catch (err) {
                    reject(err);
                }

                sql.close();
            })();
        })
    }

    create() {
        return new Promise((resolve, reject) => {
            (async () => {
                // open connection to DB
                // query DB (INSERT INTO librcard and return info of the new id)
                // query DB (for each author of card INSERT INTO librcardAuthor)
                // restructure the DB response into the obj format we need
                //      validate the obj
                // if all good --> resolve with the obj(s)
                // if any error --> reject with the error information
                // CLOSE THE DB CONNECTION

                try {

                    const pool = await sql.connect(con);
                    // add a card into the librcard table
                    let result = await pool.request()
                        .input('title', sql.NVarChar(), this.title)
                        .input('manacost', sql.Int(), this.manacost)
                        .input('cardlink', sql.NVarChar(), this.cardlink)
                        .query(`
                        INSERT INTO librcard
                            ([title], [manacost], [cardlink])
                        VALUES
                            (@title, @manacost, @cardlink);

                        SELECT *
                        FROM librcard
                        WHERE cardid = SCOPE_IDENTITY()
                    `)

                    // keep tabs on the new cardid
                    if (!result.recordset[0]) throw { statusCode: 500, errorMessage: `INSERT failed.`, errorObj: {} };
                    const cardid = result.recordset[0].cardid;

                    // for each author, add a record in librcardAuthor
                    // however, cannot query the DB inside a forEach loop, because 'await' is not allowed inside a forEach loop
                    // ... so need to prepare a single query string
                    let insertValues = '';
                    this.authors.forEach(author => {
                        insertValues += `(${cardid},${author.authorid}),`;
                    })
                    insertValues = _.trimEnd(insertValues, ',');
                    // ... and query the DB with the pre-built query string
                    result = await pool.request()
                        .query(`
                        INSERT INTO librcardAuthor
                            ([FK_cardid], [FK_authorid])
                        VALUES
                            ${insertValues}    
                    `)

                    // select the card with the new id (aka the one we just inserted)
                    // from the JOINed tables
                    result = await pool.request()
                        .input('cardid', sql.Int(), cardid)
                        .query(`
                        SELECT *
                        FROM librcard b
                            INNER JOIN librcardAuthor ba
                            ON b.cardid = ba.FK_cardid
                                INNER JOIN librAuthor a
                                ON ba.FK_authorid = a.authorid
                        WHERE b.cardid = @cardid
                        ORDER BY a.authorid
                    `)

                    const cardBinder = [];  // will collect and restructure the cards in cardBinder - no validation just yet
                    let binderLastIndex = -1;
                    result.recordset.forEach(record => {
                        if (!cardBinder[binderLastIndex] || record.cardid != cardBinder[binderLastIndex].cardid) {
                            // add record as a new card to cardBinder
                            // increment binderLastIndex

                            const newcard = {
                                cardid: record.cardid,
                                title: record.title,
                                manacost: record.manacost,
                                cardlink: record.cardlink,
                                authors: [
                                    {
                                        authorid: record.authorid,
                                        firstname: record.firstname,
                                        lastname: record.lastname,
                                        biolink: record.biolink
                                    }
                                ]
                            }

                            cardBinder.push(newcard);
                            binderLastIndex++;

                        } else {
                            // add record's author info as new author to cardBinder[binderLastIndex]

                            const newAuthor = {
                                authorid: record.authorid,
                                firstname: record.firstname,
                                lastname: record.lastname,
                                biolink: record.biolink
                            }

                            cardBinder[binderLastIndex].authors.push(newAuthor);
                        }
                    })

                    if (cardBinder.length != 1) throw { statusCode: 500, errorMessage: `Inconsistent DB after INSERT, cardid: ${cardid}`, errorObj: {} }

                    const { error } = Card.validate(cardBinder[0]);
                    if (error) throw { statusCode: 500, errorMessage: `Corrupt Card information in the database, cardid: ${card.cardid}`, errorObject: error }

                    resolve(new Card(cardBinder[0]));

                } catch (err) {
                    reject(err)
                }

                sql.close();
            })();
        })
    }
}

module.exports = Card;


const Joi = require('joi');
const sql = require('mssql');

const config = require('config');
const con = config.get('dbConfig_UCN');


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
            // subtype: Joi.object({
            //     subtypeid: Joi.number()
            //         .integer()
            //         .min(1),
            //     subtitle: Joi.string()
            //         .max(50)
            //         .required()
            //     }),
            // maintype: Joi.object({
            //     maintypeid: Joi.number()
            //         .integer()
            //         .min(1),
            //     maintitle: Joi.string()
            //         .max(50)
            //         .required()
                    
            //     })
        })

        return schema;
    }

    static validate(cardObj) {
        const schema = Card.validationSchema();

        return schema.validate(cardObj);
    }

    // static readById(authorid)
    //
    static readById(cardid) {
        return new Promise((resolve, reject) => {   // *** returns Promise
            (async () => {  // *** async anon function
                // open connection to DB
                // query DB (SELECT all columns FROM author table WHERE authorid)
                // check if exactly one result
                // restructure authorWannabe
                // valdiate authorWannabe
                // resolve with author
                // if error --> reject with error
                // CLOSE DB CONNECTION

                try {
                    // open connection to DB
                    const pool = await sql.connect(con);

                    // query DB (SELECT all columns FROM author table WHERE authorid)
                    const result = await pool.request()
                        .input('cardid', sql.Int(), cardid)
                        .query(`
                            SELECT *
                            FROM mtgCardtable ct
                            WHERE ct.cardid = @cardid
                        `)

                    // check if exactly one result: authorid is primary key in the liloAuthor table, we expect to see exactly one result
                    if (result.recordset.length > 1) throw { statusCode: 500, errorMessage: `Corrupt DB, mulitple cards with cardid: ${cardid}`, errorObj: {} };
                    if (result.recordset.length == 0) throw { statusCode: 404, errorMessage: `card not found by cardid: ${cardid}`, errorObj: {} };

                    // restructure authorWannabe
                    const cardWannabe = {
                        cardid: result.recordset[0].cardid,
                        title: result.recordset[0].title,
                        manacost: result.recordset[0].manacost,
                        power: result.recordset[0].power,
                        toughness: result.recordset[0].toughness,
                        link: result.recordset[0].link,
                        ability: result.recordset[0].ability,
                        flavortext: result.recordset[0].flavortext,
                        cardstatus: result.recordset[0].cardstatus
                        // subtype: {
                        //     subtypeid: result.recordset[0].subtypeid,
                        //     subtitle: result.recordset[0].subtitle
                        // },
                        // maintype: {
                        //    maintypeid: result.recordset[0].maintypeid,
                        //    maintitle:  result.recordset[0].maintitle
                        // }
                    }

                    // valdiate cardWannabe
                    const { error } = Card.validate(cardWannabe);
                    if (error) throw { statusCode: 500, errorMessage: `Corrupt DB, card does not validate: ${cardWannabe.cardid}`, errorObj: error };

                    // resolve with author
                    resolve(new Card(cardWannabe))

                } catch (err) {
                    reject(err) // reject with error
                }

                sql.close();    // CLOSE DB CONNECTION

            })();   // *** IIFE
        })
    }


    // static readByName(cardtitle)
    //
    static readByName(cardtitle) {
        return new Promise((resolve, reject) => {   // *** returns Promise
            (async () => {  // *** async anon function
                // !!! DISCLAIMER:  a 'name' is rarely unique (i.e. John Smith), the firstname-lastname combo would not make a unique key
                // !!!              for the author entity in a real scenario - but there would be many more attributes on record for the authors too
                // !!!              in this example we will treat firstname-lastname as a 'composite key' for the liloAuthor table
                //
                // open connection to DB
                // query DB (SELECT all columns FROM author table WHERE firstname AND lastname)
                // check if exactly one result
                // restructure authorWannabe
                // valdiate authorWannabe
                // resolve with author
                // if error --> reject with error
                // CLOSE DB CONNECTION

                try {
                    // open connection to DB
                    const pool = await sql.connect(con);

                    // query DB (SELECT all columns FROM author table WHERE authorid)
                    const result = await pool.request()
                        .input('cardtitle', sql.NVarChar(), cardtitle)
                        .query(`
                            SELECT *
                            FROM mtgCardtable ct
                            WHERE ct.cardtitle = @cardtitle
                        `)

                    // check if exactly one result: firstname-lastname is composite key in the liloAuthor table, we expect to see exactly one result
                    if (result.recordset.length > 1) throw { statusCode: 500, errorMessage: `Corrupt DB, mulitple cards with name: ${cardtitle}`, errorObj: {} };
                    if (result.recordset.length == 0) throw { statusCode: 404, errorMessage: `Card not found by name: ${cardtitle}`, errorObj: {} };

                    // restructure cardWannabe
                    const cardWannabe = {
                        cardid: result.recordset[0].cardid,
                        title: result.recordset[0].title,
                        manacost: result.recordset[0].manacost,
                        power: result.recordset[0].power,
                        toughness: result.recordset[0].toughness,
                        link: result.recordset[0].link,
                        ability: result.recordset[0].ability,
                        flavortext: result.recordset[0].flavortext,
                        cardstatus: result.recordset[0].cardstatus,
                        subtype: {
                            subtypeid: result.recordset[0].subtypeid,
                            subtitle: result.recordset[0].subtitle
                        },
                        maintype: {
                           maintypeid: result.recordset[0].maintypeid,
                           maintitle:  result.recordset[0].maintitle
                        }
                    }

                    // valdiate authorWannabe
                    const { error } = Card.validate(cardWannabe);
                    if (error) throw { statusCode: 500, errorMessage: `Corrupt DB, card does not validate: ${cardWannabe.cardid}`, errorObj: error };

                    // resolve with author
                    resolve(new Card(cardWannabe))
                } catch (err) {
                    reject(err) // reject with error
                }

                sql.close();    // CLOSE DB CONNECTION

            })();   // *** IIFE
        })
    }


    // static readAll(queryObj)
    //  queryObj: { query, value }
    //      query: 'firstname' or 'lastname' (see API def document)
    //      value: a string - in both cases
    //
    static readAll(queryObj) {
        return new Promise((resolve, reject) => {   // *** returns Promise
            (async () => {  // *** async anon function
                // prepare query string
                // open connection to DB
                // query DB with query string --> if queryObj, there is a WHERE clause and that needs input()
                // restructure the result
                // validate the result
                // resolve with array of authors
                // if error --> reject with error
                // CLOSE THE DB CONNECTION

                try {
                    // prepare query string
                    let queryString = `
                        SELECT *
                        FROM mtgCardtable ct
                    `;

                    let qcolumnname;
                    let qtype;
                    if (queryObj) {
                        switch (queryObj.query) {
                            case ('cardtitle'):
                                qcolumnname = 'cardtitle';
                                qtype = sql.NVarChar();
                                break;
                            default: break;
                        }

                        queryString += `
                            WHERE ct.${qcolumnname} = @var
                        `;
                    }

                    // open connection to DB
                    const pool = await sql.connect(con);

                    // query DB with query string --> if queryObj, there is a WHERE clause and that needs input()
                    let result;
                    if (queryObj) {
                        result = await pool.request()
                            .input('var', qtype, queryObj.value)
                            .query(queryString)
                    } else {
                        result = await pool.request()
                            .query(queryString)
                    }

                    // restructure and validate the result
                    const cards = [];
                    result.recordset.forEach(record => {
                        // restructure the result
                        const cardWannabe = {
                            cardid: result.recordset[0].cardid,
                            title: result.recordset[0].title,
                            manacost: result.recordset[0].manacost,
                            power: result.recordset[0].power,
                            toughness: result.recordset[0].toughness,
                            link: result.recordset[0].link,
                            ability: result.recordset[0].ability,
                            flavortext: result.recordset[0].flavortext,
                            cardstatus: result.recordset[0].cardstatus
                            // subtype: {
                            //     subtypeid: result.recordset[0].subtypeid,
                            //     subtitle: result.recordset[0].subtitle
                            // },
                            // maintype: {
                            //    maintypeid: result.recordset[0].maintypeid,
                            //    maintitle:  result.recordset[0].maintitle
                            // }
                        }

                        // valdiate authorWannabe
                        const { error } = Card.validate(cardWannabe);
                        if (error) throw { statusCode: 500, errorMessage: `Corrupt DB, card does not validate: ${cardWannabe.cardid}`, errorObj: error };

                        // push a new Author object into authors array
                        authors.push(new Card(cardWannabe));
                    })

                    // resolve with array of authors
                    resolve(cards)

                } catch (err) {
                    reject(err);    // reject with error
                }

                sql.close();    // CLOSE DB CONNECTION

            })();   // *** IIFE
        })
    }


    // create()
    //
    create() {
        return new Promise((resolve, reject) => {   // *** returns Promise
            (async () => {  // *** async anon function
                // check if author with firstname-lastname exists
                // open connection to DB
                // query DB --> INSERT INTO liloAuthor; SELECT WHERE authorid = SCOPE_IDENTITY()
                // check integrity (a.k.a. exactly 1 result)
                // "restructure" result --> authorid
                // close db
                // call Author.readById(authorid)
                // resolve with author
                // if error --> reject with error
                // CLOSE DB CONNECTION

                // check if author with firstname-lastname exists
                try {
                    // check by name if author exists
                    const card = await Card.readByName(this.cardtitle);

                    // if found, that is an error
                    const error = { statusCode: 409, errorMessage: `Card already exists`, errorObj: {} }
                    return reject(error);   // return makes sure we are done here, the Promise is returned

                } catch (err) {
                    // if there was an error that was not the 404 error --> that means a real error
                    // if there was NO statusCode OR statusCode is NOT EQUAL 404
                    if (!err.statusCode || err.statusCode != 404) {
                        return reject(err);    // reject with error, return makes sure we are done here, the Promise is returned
                    }
                }

                try {
                    // open connection to DB
                    const pool = await sql.connect(con);

                    if (!this.power) {
                        this.power = null;
                    }

                    if (!this.toughness) {
                        this.toughness = null;
                    }

                    if (!this.ability) {
                        this.ability = null;
                    }

                    if (!this.flavortext) {
                        this.flavortext = null;
                    }

                    // query DB --> INSERT INTO liloAuthor; SELECT WHERE authorid = SCOPE_IDENTITY()
                    const resultCard = await pool.request()
                        .input('cardtitle', sql.NVarChar(), this.cardtitle)
                        .input('manacost', sql.NVarChar(), this.manacost)
                        .input('power', sql.NVarChar(), this.power)
                        .input('toughness', sql.NVarChar(), this.toughness)
                        .input('link', sql.NVarChar(), this.link)
                        .input('ability', sql.NVarChar(), this.ability)
                        .input('flavortext', sql.NVarChar(), this.flavortext)
                        .input('cardstatus', sql.NVarChar(), this.cardstatus)
                        .query(`
                            INSERT INTO mtgCardtable
                                ([title], [manacost], [power], [toughness],[link],[ability],[flavortext],[cardstatus])
                            VALUES
                            (@title, @manacost, @power, @toughness, @link, @ability, @flavortext, @cardstatus);
                            SELECT *
                            FROM mtgCardtable ct
                            WHERE ct.cardid = SCOPE_IDENTITY()
                        `)

                    // check integrity (a.k.a. exactly 1 result)     
                    if (resultCard.recordset.length != 1) throw { statusCode: 500, errorMessage: `INSERT INTO card table failed`, errorObj: {} }

                    // "restructure" result
                    const cardid = resultCard.recordset[0].cardid;

                    // close db
                    sql.close();

                    // call Author.readById(authorid) 
                    const card = await Card.readById(cardid);

                    // resolve with author
                    resolve(card);

                } catch (err) {
                    reject(err);    // reject with error
                }

                sql.close();    // CLOSE DB CONNECTION

            })();   // *** IIFE
        })
    }


    // update()
    //
    update() {
        return new Promise((resolve, reject) => {   // *** returns Promise
            (async () => {  // *** async anon function
                // !!! CHALLENGE:   we want to allow changing firstname, lastname and biolink
                //                  however, firstname-lastname is treated as composite key
                //                  -->     we should not allow changing the firstname-lastname to
                //                          something that already exists on another author
                //      This is not something we can manage here easily, so we will do that in the route handler (see authors.js PUT /api/authors/:authorid)
                //      That, however, makes this update() method much simpler                  
                //
                // call Author.readById(this.authorid)
                // open connection to DB
                // query DB --> UPDATE liloAuthor WHERE authorid
                // close db
                // call Author.readById(this.authorid)
                // resolve with author
                // if error --> reject with error
                // CLOSE DB CONNECTION

                try {
                    let tmpResult;
                    // call Author.readById(this.authorid)
                    tmpResult = await Card.readById(this.cardid);

                    // open connection to DB
                    const pool = await sql.connect(con);

                    // query DB --> UPDATE liloAuthor WHERE authorid
                    tmpResult = await pool.request()
                        .input('cardtitle', sql.NVarChar(), this.cardtitle)
                        .input('manacost', sql.NVarChar(), this.manacost)
                        .input('power', sql.NVarChar(), this.power)
                        .input('toughness', sql.NVarChar(), this.toughness)
                        .input('link', sql.NVarChar(), this.link)
                        .input('ability', sql.NVarChar(), this.ability)
                        .input('flavortext', sql.NVarChar(), this.flavortext)
                        .input('cardstatus', sql.NVarChar(), this.cardstatus)
                        .query(`
                            UPDATE mtgCardtable 
                            SET cardtitle = @cardtitle, manacost = @manacost, power = @power, toughness = @toughness, link = @link, ability = @ability, flavortext = @flavortext, cardstatus = @cardstatus
                            WHERE cardid = @cardid
                        `)

                    // close db
                    sql.close();

                    // call Author.readById(this.authorid)
                    const card = await Card.readById(this.cardid);

                    // resolve with author
                    resolve(card);

                } catch (err) {
                    // reject with error
                    reject(err);
                }

                sql.close();    // CLOSE DB CONNECTION

            })(); // *** IIFE
        })
    }


    // delete()
    //
    delete() {
        return new Promise((resolve, reject) => {   // *** returns Promise
            (async () => {  //  *** async anon function
                // call Author.readById(this.authorid) - make sure the author with authorid (primary key) exists
                // check for any books with this.authorid
                //      if yes --> error
                // open connection to DB
                // query DB liloAuthor --> DELETE WHERE authorid
                // resolve with author
                // if error --> reject with error
                // CLOSE DB CONNECTION

                try {
                    // call Author.readById(this.authorid)
                    const card = await Card.readById(this.cardid);

                    // open connection to DB
                    const pool = await sql.connect(con);

                    // query DB liloAuthor --> DELETE WHERE authorid
                    let tmpResult;
                    tmpResult = await pool.request()
                        .input('cardid', sql.Int(), this.cardid)
                        .query(`
                            DELETE FROM mtgCardtable
                            WHERE cardid = @cardid
                        `)

                    // resolve with author
                    resolve(card);

                } catch (err) {
                    // reject with error
                    reject(err);
                }

                sql.close();    // CLOSE DB CONNECTION

            })();   // IIFE
        })
    }
}

module.exports = Card;


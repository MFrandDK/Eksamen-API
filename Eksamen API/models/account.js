const config = require('config');
const con = config.get('dbConfig_UCN');
const sql = require('mssql');
const Joi = require('joi');
const bcrypt = require('bcryptjs');

class Account {
    // * constructor
    // * validate - for the Account object
    // * validateCredentials  - for email/password
    // * checkCredentials
    // read method(s):
    //      * readByEmail(email)
    //      + readById(accountid)
    //      readAll(queryObj)
    // create method:
    //      * create(password)
    // update method(s)
    //      + update()
    //      + updatePassword(password)
    // delete method:
    //      x delete()  - needs method from Loan class


    // constructor(accountObj)  gets called when a new object instance is created based on the class
    //                          e.g.    const account = new Account(accountInfoObject);
    constructor(accountObj) {
        if (accountObj.accountid) {     // accountid (and any other entity's id) may or may not exist - as the id is assigned by the DB
            this.accountid = accountObj.accountid;
        }
        this.email = accountObj.email;  // email MUST be there, or we cannot treat the info as an account
        if (accountObj.role) {  // role is mandatory, however, all new accounts created will be assigned a default role value
            // it should not be a 'frontend' task to know what the default role is, thus role may not exist (just like the id)
            this.role = {   // however, if role exists, it MUST have a roleid
                roleid: accountObj.role.roleid
            }
            if (accountObj.role.rolename) { // rolename is optional, that is mostly info for the frontend to identify what the roleid stands for
                this.role.rolename = accountObj.role.rolename;
            }
        }
    }


    // validate - Account object
    // static validationSchema() returns the Joi schema to validate with
    // e.g. const schema = Account.validationSchema();
    // if the schema is separated from the actual vaidation (like here)
    //      it can be reused in other validation schemas as a 'sub' schema
    //      though it is unlikely to use the account's schema as such
    //
    static validationSchema() {     // the schema must be the same structure as the object to be validated
        const schema = Joi.object({
            accountid: Joi.number() // the data type .number(), and the data format constraints .integer().min(1) define what is expected
                .integer()
                .min(1),
            email: Joi.string()
                .email()
                .max(255)
                .required(),    // .required() specifies what properties MUST be present
            role: Joi.object({  // the schema follow the embedded structure of the object to be validated, i.e. the role property is an object itself
                roleid: Joi.number()
                    .integer()
                    .min(1)
                    .required(),     // has to be checked if works when no role obj is present
                rolename: Joi.string()
                    .max(50)
            })  // by default, only the specified properties are allowed to exist in the object to be validated
            // if anything else is there, the validate method will return with error
        });

        return schema;
    }


    // static validate(accountObj) returns the validation result, based on validationSchema
    // e.g. const { error } = Account.validate(accountObj);
    // if there was a validation error, the information is in the error object, if no errors, then error object is undefined
    //
    static validate(accountObj) {
        const schema = Account.validationSchema();

        return schema.validate(accountObj);
    }


    // validateCredentials  - for email/password
    // static validateCredentials(credentialsObj) returns the validation result for credentials bundle (a.k.a. email and password)
    // e.g. const { error } = Account.validateCredentials(credentialsObj)
    // credentialsObj is NOT an Account object
    // 
    static validateCredentials(credentialsObj) {
        const schema = Joi.object({
            email: Joi.string()
                .email()
                .required(),
            password: Joi.string()
                .min(3)
                .required()
        })

        return schema.validate(credentialsObj);
    }


    // checkCredentials
    // static checkCredentials(credentialsObj) returns a Promise
    //      if successful - resolves with account, where account.email == credentialsObj.email
    //      if unsuccessful - rejects with error
    // e.g. const account = await Account.checkCredentials(credentialsObj)
    //
    static checkCredentials(credentialsObj) {
        return new Promise((resolve, reject) => {   // *** *** *** returns a Promise
            (async () => {  // *** *** *** asynchronous anonymus function expression
                // call Account.readByEmail to find account
                // open connection to DB
                // query the DB for the account's (hashed)password
                // verify the hashedpassword and the pasword from credentials if they match
                // resolve with the account
                // if any error --> reject with error
                // CLOSE THE DB CONNECTION

                try {
                    // !!! IMPORTANT: you cannot have two DB connections open at the same time
                    //      since we open and close a connection in every class method with DB access
                    //      we CANNOT call another while a connection is already open
                    const account = await Account.readByEmail(credentialsObj.email);    // calls Account.readByEmail with the credentials' email
                    // and awaits for the answer (it is a Promise)
                    // on success, account is the Account object belonging to the
                    // credentials' email --> and now we know the accountid
                    // on error, we land in the catch block (and done)
                    // (not finding the account results in an error 404)

                    const pool = await sql.connect(con);    // see !!! IMPORTANT; we open the connection AFTER the account was found by readByEmail
                    // but that is perfect here: if there was no matching account, nothing left to do
                    const result = await pool.request() // need to find the (hashed)password information matching the accountid
                        .input('accountid', sql.Int(), account.accountid)   // setting up the accountid as SQL variable, the value is in the account object
                        .query(`
                            SELECT *
                            FROM mtgPassword p
                            WHERE p.FK_accountid = @accountid
                        `)  // the mtgPassword table has a FK_accountid column, we need the accountid
                    // (in credentialsObj there are email and password, had to use readByEmail to get the accountid)

                    // we expect to see exactly 1 result
                    // no matter if there are more or no results, that means there is something seriously wrong with the DB's consistency
                    if (result.recordset.length != 1) throw { statusCode: 500, errorMessage: `Corrupt DB, corrupted password information on accountid: ${account.accountid}`, errorObj: {} };

                    // "restructuring" the information - this step here is unnecessary, but in other cases (e.g. dealing with a date)
                    // a data conversion might be mandatory 
                    const hashedpassword = result.recordset[0].hashedpassword;  // result.recordset[0] exists, because we have 1 result

                    // verifying the password
                    const credentialsOK = bcrypt.compareSync(credentialsObj.password, hashedpassword);  // using bcrypt to compare the stored hash and the raw password
                    // returns true if OK
                    if (!credentialsOK) throw { statusCode: 401, errorMessage: `Invalid account email or password`, errorObj: {} }; // if not OK, error

                    resolve(account);   // resolve with account

                } catch (err) {
                    reject(err);    // reject with error
                }

                sql.close();    // CLOSE THE DB CONNECTION

            })();   // *** *** *** Immediately Invoked Function Expression (IIFE) --> (function expression)();
        })
    }


    // readByEmail
    // staic readByEmail(email) returns a Promise
    //      if successful - resolves with account, where account.email == email
    //      if unsuccessful - rejects with error
    // e.g. const account = await Account.readByEmail(email)
    //
    static readByEmail(email) {
        return new Promise((resolve, reject) => {   // *** *** *** returns a Promise
            (async () => {  // *** *** *** asynchronous anonymus function expression
                //  there has to be an async function, because we want to use async calls within the function body
                //  such as i.e. anything regarding the DB, where we need to await the resolution of the call before moving on

                // open connection to DB
                // query the account table joined with the role table where email is the account's email
                // check if we have exactly 1 result
                // validate the account
                // resolve account
                // if any error --> reject with error
                // CLOSE THE DB CONNECTION

                try {   // try-catch structure, the code is read and executed line by line in the try block, as long as there are no errors
                    //  in case of error, the try block is terminated instantly, and the code continues executing
                    //  from the start of the catch block

                    const pool = await sql.connect(con);    // open DB connection, it creates a 'pool' of communication resources between the backend and the DB
                    const result = await pool.request()     // formulating and sending a request to the DB via the communication pool
                        .input('email', sql.NVarChar(), email)  // if the DB request contains variables, thos need to be redefined for the use in SQL
                        // input('SQL variable name string', SQL data type, JS variable containing the value) 
                        .query(`    
                            SELECT *
                            FROM mtgAccount ac
                                INNER JOIN mtgRole r
                                ON ac.FK_roleid = r.roleid
                            WHERE ac.email = @email
                        `)  // query() means that the DB request will be formulated as an SQL query string (there are other options, but those are not covered in the course)
                    //  the SQL query string follows the standard rules and format of sql queries (in T-SQL, as this communicates with a mssql DB)
                    //  all SQL variables with @ in the name have to be defined via subsequent input() methods!

                    // as the emails in the mtgAccount table should be UNIQUE, we expect to see exactly one result
                    // all other cases are deemed error, albeit different errors
                    if (result.recordset.length > 1) throw { statusCode: 500, errorMessage: `Corrupt DB, mulitple accounts with email: ${email}`, errorObj: {} };
                    if (result.recordset.length == 0) throw { statusCode: 404, errorMessage: `Account not found by email: ${email}`, errorObj: {} };

                    // result.recordset is an array of objects, with each object corresponding to a row in the DB query's result table
                    // need to convert the result.recordset into the format of Account object
                    // !!! we KNOW there is a result.recordset[0] --> because there is exactly 1 element in the result.recordset array
                    const accountWannabe = {
                        accountid: result.recordset[0].accountid,
                        email: result.recordset[0].email,
                        role: {
                            roleid: result.recordset[0].roleid,
                            rolename: result.recordset[0].rolename
                        }
                    }   // the property keys (left side) are from the Account object's definition,
                    // the property values (right side) correspond to the DB column names

                    // after restructuring the DB result into the object-wannabe, it has to be validated    
                    const { error } = Account.validate(accountWannabe);
                    if (error) throw { statusCode: 500, errorMessage: `Corrupt DB, account does not validate: ${accountWannabe.accountid}`, errorObj: error };

                    // all is well and done, resolve with a new Account object,
                    // that is instantiated via the Account constructor based on the object-wannabe
                    resolve(new Account(accountWannabe));

                } catch (err) { // if anything went wrong, or an error was thrown in the try block, we land here
                    reject(err);    // reject the Promise with the 'err' error information
                }

                sql.close();    // CLOSE THE DB CONNECTION

            })();   // *** *** *** Immediately Invoked Function Expression (IIFE) --> (function expression)();
            //  in the first set of brackets, there is a function expression (the definition of a function)
            //  while the second set of brackets is empty --> that signals JS to execute the function
            //  ... and since the function has been defined and right away executed, thus the name IIFE
        })
    }


    // readById
    // staic readById(accountid) returns a Promise
    //      if successful - resolves with account, where account.accountid == accountid
    //      if unsuccessful - rejects with error
    // e.g. const account = await Account.readById(accountid)
    // identical to readByEmail, only difference is in the WHERE clause in the sql query 
    // minimal comments, check readByEmail for details
    //
    static readById(accountid) {
        return new Promise((resolve, reject) => {   // *** *** *** returns a Promise
            (async () => {  // *** *** *** asynchronous anonymus function expression
                // open connection to DB
                // query the account table joined with the role table where accountid is the account's id
                // check if we have exactly 1 result
                // validate the account
                // resolve account
                // if any error --> reject with error
                // CLOSE THE DB CONNECTION

                try {
                    const pool = await sql.connect(con);    // open DB connection
                    const result = await pool.request()     // query the account table joined role table, where accountid matches
                        .input('accountid', sql.Int(), accountid)  // setting up accountid as SQL variable
                        .query(`    
                            SELECT *
                            FROM mtgAccount ac
                                INNER JOIN mtgRole r
                                ON ac.FK_roleid = r.roleid
                            WHERE ac.accountid = @accountid
                        `)

                    // accountid is primary key in the mtgAccount table, we expect to see exactly one result
                    if (result.recordset.length > 1) throw { statusCode: 500, errorMessage: `Corrupt DB, mulitple accounts with accountid: ${accountid}`, errorObj: {} };
                    if (result.recordset.length == 0) throw { statusCode: 404, errorMessage: `Account not found by accountid: ${accountid}`, errorObj: {} };

                    // need to convert the result.recordset into the format of Account object
                    const accountWannabe = {
                        accountid: result.recordset[0].accountid,
                        email: result.recordset[0].email,
                        role: {
                            roleid: result.recordset[0].roleid,
                            rolename: result.recordset[0].rolename
                        }
                    }

                    // after restructuring the DB result into the object-wannabe, it has to be validated    
                    const { error } = Account.validate(accountWannabe);
                    if (error) throw { statusCode: 500, errorMessage: `Corrupt DB, account does not validate: ${accountWannabe.accountid}`, errorObj: error };

                    // resolve with a new Account object
                    resolve(new Account(accountWannabe));

                } catch (err) { // if anything went wrong
                    reject(err);    // reject with error 
                }

                sql.close();    // CLOSE THE DB CONNECTION

            })();   // *** *** *** Immediately Invoked Function Expression (IIFE) --> (function expression)();
        })
    }


    // readAll - with query
    // staic readById(queryObj) returns a Promise
    //      if successful - resolves with all accounts, where "queryObj.query" == "queryObj.value" (if no queryObj, returns with all)
    //      if unsuccessful - rejects with error
    // e.g. const accounts = await Account.readAll(queryObj)
    //
    //  queryObj: { query, value }
    //      query: 'email' or 'roleid' (see API def document)
    //      value: an email or a roleid - depending on query 
    //
    static readAll(queryObj) {
        return new Promise((resolve, reject) => {   // *** *** *** returns a Promise
            (async () => {  // *** *** *** asynchronous anonymus function expression
                // based on queryObj, prepare sql query string
                // open connection to DB
                // query DB with query string --> if queryObj, there is a WHERE clause and that needs input()
                // restructure the result
                // validate the result
                // resolve with array of accounts
                // if error --> reject with error
                // CLOSE THE DB CONNECTION

                try {
                    // prepare query string
                    let queryString = `
                        SELECT *
                        FROM mtgAccount ac
                            INNER JOIN mtgRole r
                            ON ac.FK_roleid = r.roleid
                    `;

                    let qcolumnname;
                    let qtype;
                    if (queryObj) {
                        switch (queryObj.query) {
                            case ('email'):
                                qcolumnname = 'email';
                                qtype = sql.NVarChar();
                                break;
                            case ('roleid'):
                                qcolumnname = 'FK_roleid';
                                qtype = sql.Int();
                                break;
                            default: break;
                        }

                        queryString += `
                            WHERE ac.${qcolumnname} = @var
                        `   // 'qcolumnname' is the name of the column in the mtgAccount (aliased as 'ac' ) 
                        // using 'var' as the sql variable name, will need to setup the input with that name (see below)
                    }

                    const pool = await sql.connect(con);    // open connection to DB

                    // query the DB
                    let result;
                    if (queryObj) { // if there is a queryObj
                        result = await pool.request()
                            .input('var', qtype, queryObj.value)    // the WHERE clause needs an input, calling it 'var'
                            // the sql data type is in variable 'qtype' (see switch structure above)
                            .query(queryString)     // this queryString is with a WHERE clause
                    } else {
                        result = await pool.request()
                            .query(queryString)     // this queryString has no WHERE clause (because there was no queryObj)
                    }

                    // restructure the result AND validate in one go (inside the forEach loop)
                    // the result table has one row per account
                    const accounts = [];
                    result.recordset.forEach(record => {
                        // need to convert the record into the format of Account object
                        const accountWannabe = {
                            accountid: record.accountid,
                            email: record.email,
                            role: {
                                roleid: record.roleid,
                                rolename: record.rolename
                            }
                        }

                        // after restructuring the record into the object-wannabe, it has to be validated    
                        const { error } = Account.validate(accountWannabe);
                        if (error) throw { statusCode: 500, errorMessage: `Corrupt DB, account does not validate: ${accountWannabe.accountid}`, errorObj: error };

                        // push the account into the accounts array
                        accounts.push(new Account(accountWannabe));
                    })

                    // resolve with accounts array
                    resolve(accounts);

                } catch (err) {
                    reject(err);
                }

                sql.close();

            })();   // *** *** *** Immediately Invoked Function Expression (IIFE) --> (function expression)();
        })

    }


    // create method
    // e.g.:
    //  const myNewAccount = new Account(accountObj)
    //  mwNewAccount.create(password)
    //
    //      non-static class method:    it is called by the OBJECT, not through the class (as seen with e.g. Account.readByEmail)
    //                                  that also means, that we have access to the OBJECT's properties via tha 'this' keyword
    //                                  e.g. this.email, this.accaddress, etc.
    //                                  --> regarding the create(password), as the password is not a property of the account object, we handle it as an input parameter
    //
    create(password) {
        return new Promise((resolve, reject) => {   // *** *** *** returns a Promise
            (async () => {  // *** *** *** asynchronous anonymus function expression
                // check if account already exists based on this.email
                // if found --> REJECT with error, because the resource already exists!
                // if NOT found --> carry on
                //      open connection to DB
                //      query the DB with INSERT INTO mtgAccount table AND SELECT from the mtgAccount table by the newly inserted identity
                //          SCOPE_IDENTITY()
                //      hash the password
                //      query the DB with INSERT INTO mtgPassword with the new id
                //      
                //          restructure the DB (account) result
                //          validate the accountWannabe
                //          ^^ replaced with call Account.readByEmail
                //
                //      close DB connection
                //      call Account.readByEmail(this.email)
                //      resolve with account
                //      if error --> reject with error
                //      CLOSE THE DB CONNECTION

                // !!! IMPORTANT: you cannot have two DB connections open at the same time
                //      since we open and close a connection in every class method with DB access
                //      we CANNOT call another while a connection is already open

                // before a new (unique) resource (i.e. account) can be created, have to check if it is already there 
                try {
                    const account = await Account.readByEmail(this.email);  // success means there IS ALREADY an account with the email

                    // ... and that is considered an error in this case
                    const error = { statusCode: 409, errorMessage: `Account already exists`, errorObj: {} }
                    return reject(error);  // reject with an error 409 - Conflict, return makes sure we are done here, the Promise is returned

                } catch (err) { // if the readByEmail returned with an error, we land here automatically
                    // however, there are two scenarios for error:
                    //  a) the account was not found (does not exist)
                    //  b) there was an actual error
                    //
                    // in case a) we have manually set the error info with statusCode: 404
                    // in case b)   if there is a statusCode, it is something else than 404,
                    //              but can be error w/o statusCode (e.g. DB error, typo, etc) that we did not handle manually
                    //
                    // ^^ based on the above,
                    //      if there is a statusCode and it is 404, that is good for us: the account does not exist and no errors happened (will carry on) 
                    //      meaning --> if there was NO statusCode OR statusCode is NOT EQUAL 404 --> we have an actual error, and should reject with error
                    //
                    if (!err.statusCode || err.statusCode != 404) { // if there was NO statusCode OR statusCode is NOT EQUAL 404
                        return reject(err);    // reject with error, return makes sure we are done here, the Promise is returned
                    }
                }

                try {   // +++ +++ +++ if we reach this point, we are certain that the account does not exist yet and no errors happened (so far... ;) )
                    const pool = await sql.connect(con);    // await opening connection to the DB
                    const resultAccount = await pool.request()  // query the DB, account table
                        .input('email', sql.NVarChar(), this.email)             // setting up email as SQL variable, info is in this.email
                        .query(`
                            INSERT INTO mtgAccount
                                ([email])
                            VALUES
                                (@email);
                            SELECT *
                            FROM mtgAccount ac
                            WHERE ac.accountid = SCOPE_IDENTITY()
                        `)  // the DB handles the FK_roleid DEFAULT value, set to 2, as of member
                    // there are two sql queries concatenated here: 1) INSERT INTO; 2) SELECT * FROM WHERE SCOPE_IDENTITY()
                    // nr 2) ensures that we have a resultAccount - (an array that represent) a table with a single row with the newly inserted account

                    // do we have exactly 1 new line inserted?
                    // in any other case than 1 record in resultAccount.recordset, something went wrong
                    if (resultAccount.recordset.length != 1) throw { statusCode: 500, errorMessage: `INSERT INTO account table failed`, errorObj: {} }

                    // +++ +++ +++ if we reach this point, we are half done - the account is in the DB, but the password is not in the DB yet

                    // inserting the HASHED password into the mtgPassword table
                    const hashedpassword = bcrypt.hashSync(password);   // create a hashedpassword from the (raw)password - we got password as the create method's input parameter
                    const accountid = resultAccount.recordset[0].accountid; // the newly inserted account's accountid after the successful insert
                    // resultAccount.recordset[0] exists because there IS one record resultAccount.recordset 

                    const resultPassword = await pool.request()     // query the DB, password table
                        .input('accountid', sql.Int(), accountid)       // setting up accountid as SQL variable, info in local variable accountid (see above)
                        .input('hashedpassword', sql.NVarChar(), hashedpassword) // setting up hashedpassword as SQL variable, info in local variable hashedpassword (see above)
                        .query(`
                            INSERT INTO mtgPassword
                                ([FK_accountid], [hashedpassword])
                            VALUES
                                (@accountid, @hashedpassword);
                            SELECT *
                            FROM mtgPassword p
                            WHERE p.FK_accountid = @accountid
                        `)  // two concatenated sql queries, 1) INSERT INTO; 2) SELECT * FROM WHERE -- note there is no SCOPE_IDENTITY() here
                    // the mtgPassword table does not have an IDENTITY column, we access the password via the FK_accountid
                    // (there is a 1-1 relation between mtgAccount and mtgPassword, see the ERD in ./scripts)

                    // do we have exactly 1 new line inserted?
                    // in any other case than 1 record in resultPassword.recordset, something went wrong
                    if (resultPassword.recordset.length != 1) throw { statusCode: 500, errorMessage: `INSERT INTO account table failed`, errorObj: {} }
                    // console.log(resultPassword.recordset[0]);    // for testing purposes, to check if the password looks as we would expect

                    // +++ +++ +++ if we reach this point, we are done with INSERT, but still need to prepare the account object to resolve the Promise with
                    // luckily, we have a method for that already: Account.readByEmail(email) 

                    sql.close();    // but to call the other method, have to close the DB connection here (the readByEmail method will open/close the connection for itself) 

                    const account = await Account.readByEmail(this.email);  // awaiting the result of readByEmail
                    // on success, we have account (in the format we need it in)

                    resolve(account);   // resolve with account

                } catch (err) { // on any error
                    reject(err); // reject with error
                }

                sql.close();    // CLOSE THE DB CONNECTION
                // this is mandatory here, because if any error happens, the sql.close() might never happen in the 'try' block
                // good thing, that sql.close() does not care if there was no connection to close - that does not yield an error

            })();   // *** *** *** Immediately Invoked Function Expression (IIFE) --> (function expression)();
        })
    }


    // update() method
    // e.g.:
    //  const myAccount = await Account.readById(accountid);
    //  // --> overwrite myAccount properties with new values
    //  myAccount.update()
    //
    update() {
        return new Promise((resolve, reject) => {   // *** *** *** returns a Promise
            (async () => {  // *** *** *** asynchronous anonymus function expression
                // call Account.readById(this.accountid) - make sure the account with accountid (primary key) exists
                // open connection to DB
                // query DB with UPDATE WHERE accountid
                // close DB connection
                // call Account.readById(this.accountid) - to read the now updated info from the DB
                // resolve with account
                // if error --> reject with error
                // CLOSE THE DB CONNECTION

                try {
                    let tmpResult;
                    tmpResult = await Account.readById(this.accountid);     // call Account.readById(this.accountid)
                    // purely for ensuring the account with accountid exists
                    // console.log(tmpResult); 

                    const pool = await sql.connect(con);    // open connection to DB
                    tmpResult = await pool.request()     // query DB with UPDATE WHERE accountid, do not care much for the result
                        .input('accountid', sql.Int(), this.accountid)    // setting up accountid as SQL variable, for the WHERE clause
                        .input('roleid', sql.Int(), this.role.roleid)   // setting up roleid as SQL variable
                        .query(`
                        UPDATE mtgAccount
                        SET FK_roleid = @roleid
                        WHERE accountid = @accountid
                    `)  // neither accountid nor email may be updated

                    // console.log(tmpResult);

                    sql.close();    // close DB connection, to allow for calling readById

                    const account = await Account.readById(this.accountid); // call Account readById(this.accountid) - now with the updated information from the DB

                    resolve(account);   // resolve with account

                } catch (err) { // on any error
                    reject(err);    // reject with error
                }

                sql.close();    // CLOSE THE DB CONNECTION

            })();   // *** *** *** Immediately Invoked Function Expression (IIFE) --> (function expression)();
        })
    }


    // updatePassword(password) method
    // e.g.:
    //  const myAccount = await Account.readById(accountid);
    //  myAccount.updatePassword(password)
    //
    updatePassword(password) {
        return new Promise((resolve, reject) => {   // *** *** *** returns a Promise
            (async () => {  // *** *** *** asynchronous anonymus function expression
                // call Account.readById(this.accountid) - make sure the account with accountid (primary key) exists
                // generate hashed password
                // open connection to DB
                // query DB mtgPassword with UPDATE WHERE FK_accountid = accountid
                // resolve with account (the account was not changed, only the password belonging to account)
                // if error --> reject with error
                // CLOSE THE DB CONNECTION

                try {
                    let tmpResult;
                    const account = await Account.readById(this.accountid); // call Account.readById(this.accountid)

                    const hashedpassword = bcrypt.hashSync(password);   // generate hashed password

                    const pool = await sql.connect(con);    // open connection to DB
                    tmpResult = await pool.request()    // query DB mtgPassword with UPDATE WHERE FK_accountid = accountid
                        .input('accountid', sql.Int(), this.accountid)
                        .input('hash', sql.NVarChar(), hashedpassword)
                        .query(`
                            UPDATE mtgPassword
                            SET hashedpassword = @hash
                            WHERE FK_accountid = @accountid
                        `)

                    resolve(account);   // resolve with account

                } catch (err) { // on any error
                    reject(err);    // reject with error
                }

                sql.close();    // CLOSE THE DB CONNECTION

            })();   // *** *** *** Immediately Invoked Function Expression (IIFE) --> (function expression)();
        })
    }

    
    // delete() method
    // e.g.:
    //  const someAccount = await Account.readById(accountid);
    //  someAccount.delete()
    //
    delete() {
        return new Promise((resolve, reject) => {   // *** *** *** returns a Promise
            (async () => {  // *** *** *** asynchronous anonymus function expression
                // call Account.readById(this.accountid) - make sure the account with accountid (primary key) exists
                // open connection to DB
                // query DB mtgPassword --> DELETE WHERE FK_accountid = accountid
                // query DB mtgAccount --> DELETE WHERE accountid
                // resolve with account
                // if error --> reject with error

                try {
                    // call Account.readById(this.accountid)
                    const account = await Account.readById(this.accountid);

                    let tmpResult;
                    const pool = await sql.connect(con);    // open connection to DB
                    tmpResult = await pool.request()    // query DB mtgPassword
                        .input('accountid', sql.Int(), this.accountid)
                        .query(`
                            DELETE FROM mtgPassword
                            WHERE FK_accountid = @accountid
                        `)
                    tmpResult = await pool.request()    // query DB mtgAccount
                        .input('accountid', sql.Int(), this.accountid)
                        .query(`
                            DELETE FROM mtgAccount
                            WHERE accountid = @accountid
                        `)

                    resolve(account);   // resolve with account

                } catch (err) { // on any error
                    reject(err);    // reject with error
                }

                sql.close();    // CLOSE THE DB CONNECTION

            })();   // *** *** *** Immediately Invoked Function Expression (IIFE) --> (function expression)();
        })
    }
}

module.exports = Account;   // in JS, each separate file is considered an independent module
                            // Account class is exported from this 'module' to be seen in other modules when using the command 'require'
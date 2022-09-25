const express = require('express');
const app = express();
const env = require('dotenv').config();
const config = require('config');
const cors = require('cors');

const resJSON = require('./middleware/resJSON');    // middleware to set response header 'Content-type' to 'application/json'


const mtgcards = require('./routes/mtgcards');
const login = require('./routes/login');
const accounts = require('./routes/accounts');

app.use(express.json());
app.use(resJSON);


const corsOptions = {
    exposedHeaders: ['x-authentication-token']  // the custom header for the authentication token (see ./routes/login.js)
                                                // needs to be exposed, or the browser will not see it
}
app.use(cors(corsOptions));

// route handlers will be called when the url's first part
// (after the server:port) is matched with the specified routing rule (/pattern)
// order matters: the more specific rules should be defined first
app.use('/api/accounts/login', login);  
app.use('/api/mtgcards', mtgcards);                                  
app.use('/api/accounts', accounts);     



app.listen(config.get('port'), () => console.log(`Listening on port ${config.get('port')}...`));

// *** .env *** config ***
// since neither the .env nor the config's .json files can be commented, will do it here
//
// .env:
//      environment variables are 'key'='value' pairs, i.e. PORT=2090
//      keep secrets in the environment, as it lives outside your codebase
//      dotenv module emulates an environment defined by the .env file
//      the .env file is in the project's root folder
//      NEVER submit your .env file to public repository (add it to the .gitignore list)
//
// config:
//      the module allows for easy management of differenet configurations, e.g. test environment, production environment, etc.
//      config's json files live in the ./config folder
//      currently we have only 1 environment specified: default
//      the custom-environment-variables.json file has to AND may contain only 'key':'value' pairs, where the 'value' is an environment variable
//      the current configuration (default) is a merge of the default.json and custom-environment-variables.json files
//      the 'dbConfig_UCN' configuration variable is an object that follows the structure of the mssql module's DB connection string
//          "dbConfig_UCN": {
//              "user": "DB_USER",
//              "password": "DB_PASSWORD",
//              "database": "DB_NAME",
//              "server": "DB_HOST",
//              "options": {
//                  "encrypt": true,
//                  "trustServerCertificate": true
//              }
//          } 
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

const jwt = require("jsonwebtoken");
const config = require("config");
const jwtKey = config.get('jwt_secret_key');

module.exports = (req, res, next) => {
  // check if token is in 'x-authentication-token' request header
  // decrypt the token --> account
  // attach the account to the request object --> req.account
  // move to the next() in the request pipeline
  // if error respond with error

  try {
      // check if token is in 'x-authentication-token' request header
      const token = req.header('x-authentication-token');
      if (!token) throw { statusCode: 401, errorMessage: `Access denied: no token provided`, errorObj: {} }

      // decrypt the token
      const account = jwt.verify(token, jwtKey);  // if jwt.verify fails (token is incorrect) jsonwebtoken throws an error with {name:"JsonWebTokenError", ...}

      // attach the account to the request object
      req.account = account;

      // move to the next() in the request pipeline
      next();

  } catch (err) { // if error
      if (err.name == 'JsonWebTokenError') {  // if this is a jwt.verify error
          return res.status(401).send(JSON.stringify({ statusCode: 401, errorMessage: `Access denied: invalid token`, errorObj: {} }));
      }
      if (err.statusCode) {   // if error with statusCode, send error with status: statusCode 
          return res.status(err.statusCode).send(JSON.stringify(err));
      }
      return res.status(500).send(JSON.stringify(err));   // if no statusCode, send error with status: 500
  }
}

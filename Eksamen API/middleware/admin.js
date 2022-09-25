module.exports = (req, res, next) => {
    // !!! has to be chained AFTER authenticate in the request pipeline
    // !!! design choice for role management >>
    //          each role will be checked independently (no hierarchy)
    //          when a role is allowed, a "flag" will be set on req.account as authorised
    //          if authorised flag exists next() is called automaically
    //
    //          usage at endpoints: [auth, role1, role2, role3, ..., check] where role1, role2, role3 etc. are the allowed roles to access the endpoint
    //                              if any one role is allowed, check grants access to the endpoint

    // check if req.account exists
    // check if req.account.role.rolename is the same as authorisedRole (the role we want to allow access to)
    //      if yes -->  req.account.authorised = true
    //                  next()
    // next() --> move onto the next function in the request pipeline
    // if error respond with error

    const authorisedRole = 'admin'; // the role to allow access to

    try {
        // check if req.account exists
        if (!req.account) throw { statusCode: 401, errorMessage: `Access denied: authentication required`, errorObj: {} }

        // check if req.account.role.rolename is authorisedRole
        if (req.account.role && req.account.role.rolename == authorisedRole) { // !!! to check req.account.role.rolename, have to make sure that req.account.role is there too to avoid JS error
            req.account.authorised = true;  // setting the "flag"
            return next();
        }

        // move to the next function in the request pipeline
        return next()

    } catch (err) { // if error
        if (err.statusCode) {   // if error with statusCode, send error with status: statusCode 
            return res.status(err.statusCode).send(JSON.stringify(err));
        }
        return res.status(500).send(JSON.stringify(err));   // if no statusCode, send error with status: 500
    }
}

// disclaimer:  authorised is the British English form of the same word, authorized is the North American (USA, Canada) spelling
//              the http status codes were "invented" in the USA, thus officially follow the NA spelling "401 Unauthorized"
//              I prefer the British spelling, thus my "flag" is called req.account.authorised
//              sorry for the inconvenience
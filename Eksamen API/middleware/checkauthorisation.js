module.exports = (req, res, next) => {
    try {
        // does the "flag" req.account.authorised exist? - if yes, move along
        if (req.account.authorised) return next();

        // reaching this point, can conclude that the account is not authorised
        throw { statusCode: 401, errorMessage: `Access denied: authorisation failed`, errorObj: {} }

    } catch (err) { // if error
        if (err.statusCode) {   // if error with statusCode, send error with status: statusCode 
            return res.status(err.statusCode).send(JSON.stringify(err));
        }
        return res.status(500).send(JSON.stringify(err));   // if no statusCode, send error with status: 500

    }
}
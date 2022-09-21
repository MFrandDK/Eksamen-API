module.exports = (req, res, next) => {
    res.header('Content-type', 'application/json'); // setting the response header 'Content-type' to 'application/json' 
    return next();  // moving to next() in the request pipeline
}
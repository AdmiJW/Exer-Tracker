const express = require('express');
const rateLimiter = require('express-rate-limit');
const User = require('../models/User.js');
const mongoose = require('mongoose');
const router = express.Router();

// Rate limiter for API calls.
const limiter = rateLimiter({
    windowMs: 1000 * 60 * 3,         // 3 Min window
    max: 180                         // ~1 request allowed per second.
});


router.use(limiter);

// Registration of new user
router.post('/users', async (req,res)=> {

    if (!req.body.username)
        return res.status(400).json({error: "Invalid username"});

    const newUser = new User({
        username: req.body.username
    });

    //  Attempting to save an existing username will result in promise rejection. Note that
    try {
        const { username, _id } = await newUser.save();
        return res.status(200).json({
            username, _id
        });
    } catch (err) {
        if (err.code === 11000)
            return res.status(400).json({error: `Username "${req.body.username}" already exists!`});
        return res.status(500).json({error: err});
    }
});

// Login API for session
router.post('/login', async (req,res)=> {
    if (!req.body['login-credential'])
        return res.status(400).json({error: 'Invalid Username/ID'});
    const login_cred = req.body['login-credential'];

    // Start by attempting to login by ID
    let user;
    try {
        user = await User.findById(login_cred);
    } catch (err) {
        if (err.kind !== 'ObjectId')
            return res.status(500).json({error: err.reason});
    }

    // Failed to login by ID. Find via username instead
    if (!user) {
        try {
            user = await User.findOne({ username: login_cred });
        } catch (err) {
            return res.status(500).json({error: err.reason});
        }
    }

    // No user found
    if (!user)
        return res.status(400).json({error: `No user with username/ID ${login_cred} found! Have you registered yet?`});
    
    // User is found. Save the user's id in the session for access
    req.session.user_id = user._id;
    req.session.username = user.username;
    req.session.isLoggedIn = true;

    if (req.body['login-remember'])
        req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30;      // If remember login is set, set expiry to 30 days

    res.status(200).json({success: true});
});

// Get a full list of users
router.get('/users', async (req,res)=> {
    try {
        res.status(200).json( await User.find({}, { username: 1 }));
    } catch (err) {
        return res.status(500).json({error: err});
    }
});

// Get the user's ID
router.get('/users/getID', async (req,res)=> {
    if (!req.session.user_id)
        return res.status(401).json({error: "Unable to locate session. Please try to login again"});
    
    res.status(200).json({user_id: req.session.user_id});
});


// Add a new exercise to specific user
router.post('/users/:_id/exercises', async (req, res)=> {
    let { description, duration, date, type } = req.body;
    const { _id } = req.params;

    if (!date) date = Date();

    //  Input validation
    if (description === undefined || duration === undefined)
        return res.json({error: "Description and duration field are both required!"});
    if (type && ['aerobic', 'anaerobic'].indexOf(type) === -1)
        return res.json({error: "Invalid exercise type. It must be either 'aerobic' or 'anaerobic'"});
    type = type? type: 'aerobic';
    date = new Date(date);
    if (date.toString() === "Invalid Date")
        return res.json({error: "Date provided is not valid"});

    // Update user with the provided informations, if found.
    // First try to update by ID. If fails, try use ID as username.
    const log = { type, description, duration, date };
    let respond;
    try {
        respond = await User.findByIdAndUpdate( _id , {
            $push: { log }
        }, { new: true });
    } catch (err) {
        if (!err.name === 'CastError')
            return res.json({error: err});
    }

    // If search by ID fails, or no records are modified with search by id, try using username
    if (!respond ) {
        try {
            respond = await User.findOneAndUpdate({ username: _id }, {
                $push: { log }
            }, { new: true });
        } catch (err) {
            return res.json({error: err});
        }
    } 

    //  Still, no user found
    if (!respond)
        return res.json({error: `No user having id/username of ${_id} found!`});

    res.json({
        _id: respond._id,
        username: respond.username,
        date: date.toDateString(),
        duration: Number(duration),
        description,
        type
    });
});


// Obtain log of specific user via path parameter
router.get('/users/:_id/logs', async (req,res)=> {
    const { _id } = req.params;
   
    if (!_id)
        return res.status(400).json({error: "Invalid id/username"});
    if (req.query.limit) {
        req.query.limit = Number.parseInt(req.query.limit);
        if (!req.query.limit)
            return res.status(400).json({error: `Invalid query parameter: limit`});
    } 

    //  Build up the query parameters
    const dateFilter = { $and: [] };
    //  Check the 'from' query
    if (req.query.from) {
        const from = new Date(req.query.from);
        if (from.toString() === 'Invalid Date')
            return res.status(400).json({error: `Invalid query parameter "from=${req.query.from}".`});
        dateFilter['$and'].push( {'$gte': ['$$session.date', from ] } );
    }
    //  Check the 'to' query
    if (req.query.to) {
        const to = new Date(req.query.to);
        if (to.toString() === 'Invalid Date')
            return res.status(400).json({error: `Invalid query parameter "to=${req.query.to}".`});
        dateFilter['$and'].push( {'$lte': ['$$session.date', to ] } );
    }

    // We will also try to match documents by ID. If failed to parse, objID will remain as undefined
    let objID;
    try {
        objID = mongoose.Types.ObjectId(_id);
    } catch (err) { console.err(err); }

    const response = await User.aggregate([
        { $match: { $or: [ { _id: objID }, { username: _id } ] } },     // Match by id or username
        { $project: {                                                   // Projection object. We want username and list of logs
            username: "$username",
            log: {
                $filter: {
                    input: "$log",
                    as: "session",
                    cond: dateFilter['$and'].length? dateFilter: true    //If dateFilter is not empty object (contains lte or gte), use as filter condition. Otherwise, we want all logs
                }
            }
        } },
    ]);
    
    if (response.length === 0)
        return res.status(404).json({error: `No user having id/username of ${_id} found!`});

    const sliced = req.query.limit? response[0].log.slice(-req.query.limit): response[0].log;

    return res.status(200).json({
        _id: response[0]._id,
        username: response[0].username,
        log: sliced,
        count: sliced.length
    });
});


// Log out route, to destroy session
router.get('/logout', (req, res)=> {
    req.session.destroy((err)=> {
        if (err)
            res.status(500).json({err: err});
        res.status(200).redirect('/');
    });
});


module.exports = router;


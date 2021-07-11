const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const User = require('./models/User.js');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const rateLimiter = require('express-rate-limit');


const app = express();

require('dotenv').config();


//=================================
// DATABASE
//=================================
const store = new MongoDBStore({
    uri: process.env.MONGO_URL,
    collection: 'active-sessions'
});
store.on('error', (e)=> {
    console.error(`\nError encountered when creating session store\n${e}`);
});


mongoose.connect(process.env.MONGO_URL, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});

mongoose.connection.on('error', (err)=> {
    console.error("Unable to connect to database at " + process.env.MONGO_URL + "\n" + err);
});
mongoose.connection.once('open', ()=> {
    console.log("MongoDB connected at URL: " + process.env.MONGO_URL);
});



//=================================
// MIDDLEWARES
//=================================
// Session
app.use( session({
    secret: process.env.SECRET,
    resave: false,
    rolling: true,
    saveUninitialized: false,
    store: store
    // By default, the session should last until the user exits the browser. If specify remember me, then we set to large expiry
}));

// Rate limiter for basic DOS attack prevention
const limiter = rateLimiter({
    windowMs: 1000 * 60 * 5,         // 5 Min window
    max: 150                         // ~1 request allowed per 2 second.
});
const staticRouteLimiter = rateLimiter({
    windowMs: 1000 * 60,             // 1 Min window
    max: 600                         // ~1 request allowed per .5 second
});


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use('/public', staticRouteLimiter);
app.use('/public', express.static('./public'));
app.use( express.json());
app.use( express.urlencoded({
    extended: false
}));

//  CORS - to allow access from FreeCodeCamp
if (!process.env.DISABLE_XORIGIN) {
    app.use(function(req, res, next) {
        var allowedOrigins = ['https://narrow-plane.gomix.me', 'https://www.freecodecamp.com'];
        var origin = req.headers.origin || '*';
        if(!process.env.XORIG_RESTRICT || allowedOrigins.indexOf(origin) > -1){
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        }
        next();
    });
}

//=================================
// ROUTES
//=================================
app.get('/', limiter, (req,res)=> {
    res.status(200).render('homepage', {isLoggedIn: req.session.isLoggedIn, username: req.session.username});
});


app.get('/register', limiter, (req,res)=> {
    if (req.session.isLoggedIn)
        return res.status(303).redirect('/');

    res.status(200).render('register', {isLoggedIn: false});
});

app.get('/login', limiter, (req,res)=> {
    if (req.session.isLoggedIn)
        return res.status(303).redirect('/');

    res.status(200).render('login', {isLoggedIn: false});
});

app.get('/exercise', limiter, (req,res)=> {
    if (!req.session.isLoggedIn)
        return res.status(401).redirect('/login', {isLoggedIn: false});
    
    res.status(200).render('exercise', {isLoggedIn: true, username: req.session.username});
})


//=================================
// API
//=================================
app.use('/api', limiter);

// Registration of new user
app.post('/api/users', async (req,res)=> {

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
app.post('/api/login', async (req,res)=> {
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
app.get('/api/users', async (req,res)=> {
    try {
        res.status(200).json( await User.find({}, { username: 1 }));
    } catch (err) {
        return res.status(500).json({error: err});
    }
});

// Add a new exercise to specific user
app.post('/api/users/:_id/exercises', async (req, res)=> {
    let { description, duration, date } = req.body;
    const { _id } = req.params;

    if (!date) date = Date();

    //  Input validation
    if (description === undefined || duration === undefined)
        return res.json({error: "Description and duration field are both required!"});
    date = new Date(date);
    if (date.toString() === "Invalid Date")
        return res.json({error: "Date provided is not valid"});

    // Update user with the provided informations, if found.
    // First try to update by ID. If fails, try use ID as username.
    const log = { description, duration, date };
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
        description
    });
});


// Obtain log of specific user via path parameter
app.get('/api/users/:_id/logs', async (req,res)=> {
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
    } catch (err) {}

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
app.get('/api/logout', (req, res)=> {
    req.session.destroy((err)=> {
        if (err)
            res.status(500).json({err: err});
        res.status(200).redirect('/');
    });
})




//================================================================================================
app.listen(process.env.PORT || 3000, ()=> {
    console.log(`Web application started at port ${process.env.PORT || 3000}`);
});




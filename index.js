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


// Rate limiter for Static files
const staticRouteLimiter = rateLimiter({
    windowMs: 1000 * 60,             // 1 Min window
    max: 600                         // ~1 request allowed per .5 second
});

// Templating engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use('/public', staticRouteLimiter, express.static('./public'));
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
app.use('/', require('./routes/view.js'));

//=================================
// API Route
//=================================
app.use('/api', require('./routes/api.js') );


//=========================================
app.listen(process.env.PORT || 3000, ()=> {
    console.log(`Web application started at port ${process.env.PORT || 3000}`);
});




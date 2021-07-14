const express = require('express');
const router = express.Router();
const rateLimiter = require('express-rate-limit');

// Rate limiter for basic DOS attack prevention
const limiter = rateLimiter({
    windowMs: 1000 * 60 * 5,         // 5 Min window
    max: 150                         // ~1 request allowed per 2 second.
});

router.use(limiter);

router.get('/', (req,res)=> {
    res.status(200).render('homepage', {isLoggedIn: req.session.isLoggedIn, username: req.session.username});
});


router.get('/register', (req,res)=> {
    if (req.session.isLoggedIn)
        return res.status(303).redirect('/');

    res.status(200).render('register', {isLoggedIn: false});
});

router.get('/login', (req,res)=> {
    if (req.session.isLoggedIn)
        return res.status(303).redirect('/');

    res.status(200).render('login', {isLoggedIn: false});
});

router.get('/exercise', (req,res)=> {
    if (!req.session.isLoggedIn)
        return res.status(401).redirect('/login', {isLoggedIn: false});
    
    res.status(200).render('exercise', {isLoggedIn: true, username: req.session.username});
});

router.get('/history', (req,res)=> {
    if (!req.session.isLoggedIn)
        return res.status(401).redirect('/login', {isLoggedIn: false});

    res.status(200).render('history', {isLoggedIn: true, username: req.session.username});
});


module.exports = router;
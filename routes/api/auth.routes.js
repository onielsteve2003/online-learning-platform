const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken')
const { 
    registerUser,
    loginUser
}  = require('../../controllers/authController')

// Register a new user
router.post('/register', registerUser)
router.post('/login', loginUser)

// Google Authentication
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

// google Auth callback
router.get('/google/callback', passport.authenticate('google', {failureRedirect: '/login'}), 
    (req, res) => {
        const token = jwt.sign({ id: req.user._id, role: req.user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    }
)

// Facebook Authentication
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }))

// Facebook Auth callback
router.get('/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login'}), 
    (req, res) => {
        const token = jwt.sign({ id: req.user._id, role: req.user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    }
)

module.exports = router;
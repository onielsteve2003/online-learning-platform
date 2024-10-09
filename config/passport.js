const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const facebookStrategy = require('passport-facebook').Strategy
const User = require('../models/user')

// Passport Serialize and Deserialize User
passport.serializeUser((user, done) => {
    done(null, user.id)
})

passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => done(err, user))
})

// Google OAuth Strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: '/auth/google/callback'
        },
        async(accessToken, refreshToken, profile, done) => {
            try {
                let user = await User.findOne({ googleId: profile.id })

                if(!user) {
                    user = new user({
                        name: profile.displayName,
                        // Some profiles do not return emails
                        email: profile.emails[0].value,
                        googleId: profile.id
                    })
                    await user.save()
                }

                done(null, user)
            } catch (err) {
                done(err, false, err.message)
            }
        }
    )
)

// Facebook OAuth Strategy
passport.use(
    new facebookStrategy(
        {
            clientID: process.env.FACEBOOK_APP_ID,
            clientSecret: process.env.FACEBOOK_APP_SECRET,
            callbackURL: '/auth/facebook/callback',
            // Request specific fields from facebook
            profileFields: ['id', 'email', 'name']
        },
        async(accessToken, refreshToken, profile, done) => {
            try {
                let user = await User.findOne({ facebookId: profile.id })

                if(!user) {
                    user = new User({
                        name: profile.name.givenName + ' ' + profile.name.familyName,
                        email: profile.emails[0].value,
                        facebookId: profile.id
                    })
                    await user.save()
                }

                done(null, user)
            } catch (err) {
                done(err, false, err.message);
            }
        }
    )
)
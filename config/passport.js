const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const User = require("../models/user");  // Adjust the path if needed

// Local Strategy for username/password authentication
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Google Strategy for OAuth authentication
passport.use(
      new GoogleStrategy(
            {
                  clientID: process.env.GOOGLE_CLIENT_ID,
                  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                  callbackURL: process.env.GOOGLE_CALLBACK_URL,
            },
            async (accessToken, refreshToken, profile, done) => {
                  try {
                        const username = profile.displayName;

                        // Check if the user already exists based on the username
                        let user = await User.findOne({ username });
                        if (user) {
                              return done(null, user); // If user exists, log them in
                        }

                        // Check if the user already exists based on their email
                        const existingUser = await User.findOne({ email: profile.emails[0].value });
                        if (existingUser) {
                              existingUser.googleId = profile.id;
                              existingUser.photoURL = profile.photos[0].value;
                              await existingUser.save();
                              return done(null, existingUser); 
                        }

                        // If no user found, create a new one
                        const newUser = new User({
                              googleId: profile.id,
                              email: profile.emails[0].value,
                              displayName: profile.displayName,
                              photoURL: profile.photos[0].value,
                              username: profile.displayName, // Set the username as the display name
                        });
                        await newUser.save();
                        return done(null, newUser); // Create and login the new user
                  } catch (err) {
                        console.error("Error during Google OAuth:", err);
                        return done(err, null);
                  }
            }
      )
);

module.exports = passport;

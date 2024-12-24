if (process.env.NODE_ENV !== "production") {
      require("dotenv").config();
}

const express = require("express");
const app = express();
const port = 8080;
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const path = require("path");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utlis/ExpressError");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const User = require("./models/user");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error("Google API keys are missing. Ensure they are set in the .env file.");
}

const dbUrl = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/wanderlust";
const store = MongoStore.create({
      mongoUrl: dbUrl,
      crypto: { secret: process.env.SECRET },
      touchAfter: 24 * 60 * 60,
});

store.on("error", () => {
      console.log("Error in Mongo Session store");
});

const sessionOptions = {
      store,
      secret: process.env.SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
            expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
            maxAge: 1000 * 60 * 60 * 24 * 7,
            httpOnly: true,
      },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

passport.use(
      new GoogleStrategy(
            {
                  clientID: process.env.GOOGLE_CLIENT_ID,
                  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                  callbackURL: "http://localhost:8080/auth/google/callback",
            },
            async (accessToken, refreshToken, profile,done) => {
                  try {
                        const username = profile.displayName;
                        let user = await User.findOne({ username });
                        if (user) {
                              return done(null, user);
                              // return res.redirect('/listings');
                        }

                        const existingUser = await User.findOne({ email: profile.emails[0].value });
                        if (existingUser) {
                              existingUser.googleId = profile.id; 
                              existingUser.photoURL = profile.photos[0].value;
                              await existingUser.save();
                              return done(null, existingUser);
                        }

                        const newUser = new User({
                              googleId: profile.id,
                              email: profile.emails[0].value,
                              displayName: profile.displayName,
                              photoURL: profile.photos[0].value,
                              username: profile.displayName,
                        });
                        await newUser.save();
                        return done(null, newUser);
                  } catch (err) {
                        console.error("Error during Google OAuth:", err);
                        return done(err, null);
                  }
            }
      )
);

app.get('/auth/google', (req, res, next) => {
      passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
      req.flash('success', `Welcome, ${req.user.username}!`);
});

app.get(
      '/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/login', failureFlash: true }),
      (req, res) => {
            if (req.user) {
                  req.flash('success', `Welcome back, ${req.user.username}!`);
                  return res.redirect('/listings');
            }
            req.flash('error', 'Google authentication failed.');
            res.redirect('/login');
      }
);

const reviewRouter = require("./routes/review");
const listingRouter = require("./routes/listing");
const userRouter = require("./routes/user");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);

mongoose.connect(dbUrl)
      .then(() => console.log("Connected to DB"))
      .catch((err) => console.log(err));

app.use((req, res, next) => {
      res.locals.success = req.flash('success');
      res.locals.error = req.flash('error');
      res.locals.currUser = req.user;
      next();
});

app.use((err, req, res, next) => {
      if (err.message && err.message.includes('currUser is not defined')) {
            req.flash('error', 'Please log in to access this page.');
            return res.redirect('/login');
      }
      next(err);
});


app.get("/", (req, res) => {
      res.redirect("/listings");
});

app.use((req, res, next) => {
      res.locals.currUser = req.user;
      next();
});
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

app.use((err, req, res, next) => {
      let { status = 500, message = "Something went wrong!" } = err;
      res.status(status).render("error.ejs", { err });
});

app.listen(port, () => {
      console.log(`Server running on port ${port}`);
});
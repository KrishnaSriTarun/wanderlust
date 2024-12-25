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
const passport = require("./config/passport");
const User = require("./models/user");
const authRouter = require("./routes/auth"); 

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error("Google API keys are missing. Ensure they are set in the .env file.");
}

// Database connection
const dbUrl = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/wanderlust";
mongoose
      .connect(dbUrl)
      .then(() => console.log("Connected to DB"))
      .catch((err) => console.error("Database connection error:", err));

// Session store configuration
const store = MongoStore.create({
      mongoUrl: dbUrl,
      crypto: { secret: process.env.SECRET },
      touchAfter: 24 * 60 * 60,
});
store.on("error", (err) => {
      console.error("Error in Mongo Session store:", err);
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

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// Set view engine
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Set local variables middleware
app.use((req, res, next) => {
      res.locals.success = req.flash("success");
      res.locals.error = req.flash("error");
      res.locals.currUser = req.user || null;
      next();
});

// Routes
const reviewRouter = require("./routes/review");
const listingRouter = require("./routes/listing");
const userRouter = require("./routes/user");

app.get("/", (req, res) => {
      res.redirect("/listings");
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);
app.use("/auth", authRouter);  // Auth routes for Google login

// Error handling
app.use((err, req, res, next) => {
      console.error(err.stack);
      const { status = 500, message = "Something went wrong!" } = err;
      res.status(status).render("error", { err });
});

// Start server
app.listen(port, () => {
      console.log(`Server running on port ${port}`);
});

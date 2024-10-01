const User = require('../models/user');

// Render Signup Form
module.exports.renderSignupForm = (req, res) => {
    res.render('users/signup');
};

module.exports.signup = async (req, res, next) => {
    try {
        const { username, email, phoneNumber, password } = req.body;
        const newUser = new User({ username, email, phoneNumber }); // Include phone number
        const registeredUser = await User.register(newUser, password);
        
        // Automatically log in the user after registration
        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", "Welcome to WanderLust! You registered successfully");
            res.redirect('/listings');
        });
    } catch (err) {
        req.flash("error", err.message);
        res.redirect('/signup');
    }
};

// Render Login Form
module.exports.renderLoginForm = (req, res) => {
    res.render('users/login.ejs');
};

// Handle User Login
module.exports.login = async (req, res) => {
    req.flash('success', 'Welcome back to WanderLust');
    const redirectUrl = res.locals.redirectUrl || '/listings';
    res.redirect(redirectUrl);
};

// Handle User Logout
module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success', "You have logged out!");
        res.redirect('/listings');
    });
};

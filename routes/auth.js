const express = require("express");
const passport = require("passport");
const router = express.Router();

// Google OAuth routes
router.get("/google",(req,res,next)=>{
      req.flash("success", "Welcome back!"),
      passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
}
      
);

router.get(
      "/google/callback",
      passport.authenticate("google", { failureRedirect: "/login", failureFlash: true }),
      (req, res) => {
            if (req.user) {
                  req.flash("success", `Welcome back, ${req.user.username}!`);
                  return res.redirect("/listings");
            }
            req.flash("error", "Google authentication failed.");
            res.redirect("/login");
      }
);

module.exports = router;

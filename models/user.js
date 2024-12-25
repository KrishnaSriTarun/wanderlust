const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema({
      username: {
            type: String,
            required: true,
            unique: true,
      },
      email: {
            type: String,
            required: true,
            unique: true, // Ensure unique email addresses
            match: [/.+\@.+\..+/, 'Please fill a valid email address'], 
      },
      phoneNumber: {
            type: String,
      },
      displayName: {
            type: String,
            default: '', 
      },
      photoURL: {
            type: String,
            default: '', 
      },
      }, 
      { timestamps: true });

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model('User', userSchema);
module.exports = User;

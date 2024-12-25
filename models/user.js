const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema(
      {
            username: {
                  type: String,
                  required: true,
                  unique: true,
            },
            email: {
                  type: String,
                  required: true,
                  unique: true, 
                  match: [/.+\@.+\..+/, 'Please fill a valid email address'],
            },
            phoneNumber: {
                  type: String,
                  required: true, 
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
      { timestamps: true }
);

// Middleware to normalize phoneNumber
userSchema.pre('save', function (next) {
      if (this.phoneNumber.startsWith('0')) {
            this.phoneNumber = this.phoneNumber.slice(1); 
      }
      next();
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model('User', userSchema);
module.exports = User;

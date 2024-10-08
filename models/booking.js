const mongoose = require('mongoose');
const Schema=mongoose.Schema;

const bookingSchema = new Schema({
      listingId: {
            type: Schema.Types.ObjectId,
            ref: 'Listing',
            required: true
      },
      userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
      },
      checkInDate: {
            type: Date,
            required: true
      },
      checkOutDate: {
            type: Date,
            required: true,
            validate: {
                  validator: function(v) {
                        return v > this.checkInDate;
                  },
                  message: 'Check-out date must be after check-in date.'
            }
      },
      numberOfGuests: {
            type: Number,
            required: true
      },
      totalPrice: { 
            type: Number, 
            required: true 

      },
      paymentMethod: { 
            type: String 
      },
      status: {
            type: String,
            enum: ['pending', 'confirmed', 'cancelled'],
            default: 'confirmed'
      },
      createdAt: { 
            type: Date, 
            default: Date.now 
      }
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;

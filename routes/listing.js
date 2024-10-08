const express = require('express');
const router = express.Router();
const wrapAsync = require('../utlis/wrapAsync');
const { isLoggedIn, validateListing, isOwner, ensureAuthenticated } = require('../middleware')
const listingController = require('../controllers/listings');
const multer = require('multer')
const { storage } = require('../cloudConfig')
const upload = multer({ storage });
const Listing = require('../models/listing');
const Booking = require('../models/booking')


//index and create routes

router.route('/')
      .get(wrapAsync(listingController.index))
      .post(ensureAuthenticated, isLoggedIn, validateListing, upload.single('listing[image]'), wrapAsync(listingController.createListing))


// //index route
// router.get('/',wrapAsync(listingController.index));
// //Create Route
// router.post('/',isLoggedIn, validateListing ,wrapAsync(listingController.createListing));

//new route
router.get('/new', ensureAuthenticated, isLoggedIn, listingController.renderNewForm);
router.get('/category/:category',ensureAuthenticated, isLoggedIn, listingController.categoryListings)

//show, update and delete routes
router.route('/:id')
      .get(wrapAsync(listingController.showListing))
      .put(ensureAuthenticated, isOwner, isLoggedIn, validateListing, upload.single('listing[image]'), wrapAsync(listingController.updateListing))
      .delete(ensureAuthenticated, isOwner, isLoggedIn, wrapAsync(listingController.destroyListing))

// //Show Route
// router.get('/:id',wrapAsync(listingController.showListing));
// //Update Route
// router.put('/:id', isOwner ,isLoggedIn,validateListing ,wrapAsync(listingController.updateListing));
// //Delete Route
// router.delete('/:id',isOwner, isLoggedIn,wrapAsync(listingController.destroyListing));



//Edit Route
router.get('/:id/edit', isOwner, ensureAuthenticated, isLoggedIn, wrapAsync(listingController.renderEditForm));

router.get('/:id/book',ensureAuthenticated, isLoggedIn, async (req, res) => {
      try {
            const listing = await Listing.findById(req.params.id);
            if (!listing) {
                  return res.status(404).send('Listing not found');
            }
            res.render('listings/booking', { listing, bookingConfirmed: false });
      } catch (error) {
            console.error(error);
            res.status(500).send('Server error');
      }
});


// Booking route
router.post('/:id/book',ensureAuthenticated, isLoggedIn, async (req, res) => {
      const { checkInDate, checkOutDate, numberOfGuests, paymentMethod } = req.body;
      const listingId = req.params.id;
      const userId = req.user ? req.user._id : null;
      console.log('Booking request received:', req.body);
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      if (!userId) {
            return res.status(401).json({ error: 'You must be logged in to book a listing.' });
      }
      if (checkIn >= checkOut) {
            return res.status(400).json({ error: 'Check-out date must be after check-in date.' });
      }
      try {
            const listing = await Listing.findById(listingId);
            if (!listing) {
                  return res.status(404).json({ error: 'Listing not found.' });
            }

            //calculate the total price
            function calculateTotalPrice(checkIn, checkOut, numberOfGuests) {
                  const dailyRate = listing.price;
                  const timeDifference = checkOut - checkIn;
                  const days = Math.ceil(timeDifference / (1000 * 3600 * 24)); 
                  return dailyRate * days * numberOfGuests;
            }

            // Check for overlapping bookings
            const existingBooking = await Booking.findOne({
                  listingId,
                  $or: [
                        { checkInDate: { $lt: checkOut, $gte: checkIn } },
                        { checkOutDate: { $gt: checkIn, $lte: checkOut } },
                        { checkInDate: { $lte: checkIn }, checkOutDate: { $gte: checkOut } }
                  ]
            });

            if (existingBooking) {
                  console.log('Conflict with existing booking:', existingBooking);
                  req.flash("error","This listing is already booked for the selected dates. Please choose other dates.");
                  return res.render('listings/booking', {listing,bookingConfirmed: false});
            }

            // Create the booking
            const booking = new Booking({
                  listingId,
                  userId,
                  checkInDate: checkIn,
                  checkOutDate: checkOut,
                  numberOfGuests,
                  paymentMethod,
                  totalPrice: calculateTotalPrice(checkIn, checkOut, numberOfGuests)
            });

            await booking.save();
            console.log('Booking successfully created:', booking);
            const confirmationData = {
                  listing: {
                      title: listing.title // Pass the listing title to the confirmation
                  },
                  checkInDate: booking.checkInDate.toISOString().split('T')[0], // Format the date
                  checkOutDate: booking.checkOutDate.toISOString().split('T')[0], // Format the date
                  numberOfGuests: booking.numberOfGuests,
                  paymentMethod: booking.paymentMethod,
                  totalPrice: booking.totalPrice
              };
              
              // Render the confirmation page with the relevant data    
              res.render('listings/booked', confirmationData);
      } catch (err) {
            console.error("Error during booking:", err.message); // Log error message
            console.error("Request Body:", req.body); // Log request body for debugging
            res.status(500).json({ error: 'Server Error' }); // Return structured error response
      }
});

module.exports = router;

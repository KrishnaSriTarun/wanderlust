const Listing = require('../models/listing');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });
const Booking = require('../models/booking');

module.exports.index = async (req, res) => {
      const allListings = await Listing.find({});
      allListings.forEach(listing => {
            listing.formattedPrice = listing.price.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
      });
      res.render('./listings/index.ejs', { allListings });
};

module.exports.renderNewForm = (req, res) => {
      res.render('./listings/new.ejs');
}

module.exports.showListing = async (req, res) => {
      let { id } = req.params;
      const listing = await Listing.findById(id).populate({ path: 'reviews', populate: { path: "author" } }).populate('owner');
      if (!listing) {
            req.flash("error", "Listing you requested for doesn't exist");
            return res.redirect('/listings');
      }
      res.render('./listings/show.ejs', { listing });
};

module.exports.createListing = async (req, res) => {
      // let {title,description,image,price,location,country}=req.body;
      let response = await geocodingClient.forwardGeocode({
            query: req.body.listing.location,
            limit: 1,
      })
            .send()
      let url = req.file.path;
      let filename = req.file.filename;
      const newListing = new Listing(req.body.listing);
      newListing.owner = req.user._id;
      newListing.image = { url, filename };
      newListing.geometry = response.body.features[0].geometry;

      let savedList = await newListing.save();
      req.flash("success", "New listing Created");
      res.redirect('/listings');
};

module.exports.renderEditForm = async (req, res) => {
      let { id } = req.params;
      const listing = await Listing.findById(id);
      if (!listing) {
            req.flash("error", "Listing you requested for doesn't exist");
            return res.redirect('/listings');
      }
      let originalImageUrl = listing.image.url;
      originalImageUrl = originalImageUrl.replace('/upload', '/upload/w_300');
      res.render('./listings/edit.ejs', { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
      let response = await geocodingClient
            .forwardGeocode({
                  query: req.body.listing.location,
                  limit: 1,
            })
            .send();
      const { id } = req.params;
      let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing }, { runValidators: true });
      listing.geometry = response.body.features[0].geometry;
      await listing.save();
      if (typeof req.file !== "undefined") {
            let url = req.file.path;
            let filename = req.file.filename;
            let image = { url, filename };
            listing.image = image;
            await listing.save();
      }
      req.flash("success", "Listing Updated");
      res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
      let { id } = req.params;
      let deletedListing = await Listing.findByIdAndDelete(id);
      console.log(deletedListing);
      req.flash("success", "Listing Deleted");
      res.redirect('/listings');
};

module.exports.categoryListings = async (req, res) => {
      let cat = req.params;
      const allListings = await Listing.find({});
      let categories = await Listing.find(cat);
      categories.forEach(category => {
            category.formattedPrice = category.price.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
      });
      res.render('./listings/category.ejs', { categories, allListings })
};
module.exports.BookingListing = async (req, res) => {
      try {
            const { id } = req.params;
            const listing = await Listing.findById(id);
            res.render('listings/booking', { listing, bookingConfirmed: false });
      } catch (error) {
            console.error(error);
            res.status(500).send("An error occurred while fetching the listing");
      }
};
module.exports.BookedListing = async (req, res) => {
      const { checkInDate, checkOutDate, numberOfGuests, paymentMethod } = req.body;
      const listingId = req.params.id;
      const userId = req.user ? req.user._id : null;
      const listing = await Listing.findById(listingId);
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      if (checkIn >= checkOut) {
            req.flash("error", `Check-out date must be after check-in date.`);
            return res.render('listings/booking', { listing, bookingConfirmed: false });
      }
      function calculateTotalPrice(checkIn, checkOut, numberOfGuests) {
            const dailyRate = listing.price;
            const timeDifference = checkOut - checkIn;
            const days = Math.ceil(timeDifference / (1000 * 3600 * 24));
            return dailyRate * days * numberOfGuests;
      }
      const existingBooking = await Booking.findOne({
            listingId,
            $or: [
                  { checkInDate: { $lt: checkOut, $gte: checkIn } },
                  { checkOutDate: { $gt: checkIn, $lte: checkOut } },
                  { checkInDate: { $lte: checkIn }, checkOutDate: { $gte: checkOut } }
            ]
      });
      if (existingBooking) {
            req.flash("error", `This listing is already booked from ${existingBooking.checkInDate.toDateString()} to ${existingBooking.checkOutDate.toDateString()}. Please choose dates after ${existingBooking.checkOutDate.toDateString()}.`);
            return res.render('listings/booking', { listing, bookingConfirmed: false });
      }
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
      const confirmationData = {
            listing: {
                  title: listing.title
            },
            checkInDate: booking.checkInDate.toISOString().split('T')[0],
            checkOutDate: booking.checkOutDate.toISOString().split('T')[0],
            numberOfGuests: booking.numberOfGuests,
            paymentMethod: booking.paymentMethod,
            totalPrice: booking.totalPrice
      };
      res.render('listings/booked', confirmationData);
};
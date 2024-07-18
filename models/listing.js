const mongoose=require('mongoose');
const Review=require('./review');
const { required } = require('joi');
const Schema=mongoose.Schema;

let listingSchema=new Schema({
      title:{
            type:String,
            required:true
      },
      description:{
            type:String
      },
      image: {
            url:String,
            filename:String
            // type: String,
            // default:"https://images.unsplash.com/photo-1625505826533-5c80aca7d157?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGdvYXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60",
            // set: (v) =>
            //       v === ""
            //       ? "https://images.unsplash.com/photo-1625505826533-5c80aca7d157?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGdvYXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60"
            //       : v,
            },
      price:{
            type:Number
      },
      location:{
            type:String
      },
      country:{
            type:String
      },
      reviews:[
            {
                  type:Schema.Types.ObjectId,
                  ref:'Review',
            }
      ],
      owner:{
            type:Schema.Types.ObjectId,
            ref:'User',
      },
      geometry:{
            type: {
                  type: String, 
                  enum: ['Point'], 
                  required: true
            },
            coordinates: {
                  type: [Number],
                  required: true
            }
      },
      category:{
            type:String,
            required:true,
            enum:['Trending','Rooms','Iconic-Cities','Mountains','Castles','Amazing-Pools','Camping','Farms','Beach','Boats','Arctic','Others']
      }
});

listingSchema.post("findOneAndDelete",async(listing)=>{
      if(listing){
            await Review.deleteMany({_id:{$in:listing.reviews}},);
      }
});


const Listing=mongoose.model('Listing',listingSchema);
module.exports =Listing;
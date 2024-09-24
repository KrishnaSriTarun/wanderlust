const mongoose=require('mongoose');
const Listing=require('../models/listing');
const initData=require('./data');

// Connect to MongoDB

async function main(){
      await mongoose.connect('mongodb://127.0.0.1:27017/wanderlust');
};

main().then(res=>{
      console.log("Connected to DB");
}).catch(err=>{
      console.log(err);
});

const initDB = async () => {
      await Listing.deleteMany({});
      initData.data=initData.data.map((obj)=>({...obj,owner:'66923c13bbd0e78e23827357'}))
      await Listing.insertMany(initData.data);
      console.log('data was saved');
};

initDB();
if(process.env.NODE_ENV !== 'production'){  //we dont want for production phase
      require('dotenv').config()
};

const express=require('express');
const app=express();
const port=8080;
const mongoose=require('mongoose');
const methodOverride=require('method-override');
const path=require('path');
const ejsMate=require('ejs-mate');
const ExpressError=require('./utlis/ExpressError');
const session=require('express-session');
const MongoStore=require('connect-mongo');
const flash=require('connect-flash');
const passport=require('passport');
const LocalStrategy=require('passport-local');
const User=require('./models/user')


const reviewRouter=require('./routes/review')
const listingRouter=require('./routes/listing')
const userRouter=require('./routes/user');



app.set('view engine','ejs');
app.set('views',path.join(__dirname, 'views'))
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended:true }));
app.use(methodOverride('_method'));
app.engine('ejs',ejsMate)


const dbUrl=process.env.ATLASDB_URL;


// Connect to MongoDB
async function main(){
      await mongoose.connect(dbUrl);
};

main().then(res=>{
      console.log("Connected to DB");
}).catch(err=>{
      console.log(err);
});


// app.get('/',(req,res)=>{
//       res.send('Welcome to Wanderlust API');
// }); 

const store=MongoStore.create({
      mongoUrl:dbUrl,
      crypto:{
            secret:process.env.SECRET
      },
      touchAfter:24*60*60,
});

store.on('error',()=>{
      console.log("Error in Mongo Session store",err);
});

const sessionOptions={
      store,
      secret:process.env.SECRET,
      resave:false,
      saveUninitialized:false,
      cookie:{
            expires:Date.now() + 1000*60*60*24*7,
            maxAge:1000*60*60*24*7,
            httpOnly: true,
      }
}


app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req,res,next)=>{
      res.locals.success=req.flash('success');
      res.locals.error=req.flash('error');
      res.locals.currUser=req.user;
      next();
})  

//listings Routes

app.use('/listings',listingRouter);
app.use('/listings/:id/reviews',reviewRouter);
app.use('/',userRouter);


app.all("*",(req,res,next)=>{
      next(new ExpressError(404,"Page Not Found"));
})

app.use((err,req,res,next)=>{
      let {status=500,message="Something went wrong!"}=err;
      // res.status(status).send(message);
      res.status(status).render('error.ejs',{err});
});

app.listen(port,()=>{
      console.log(`Server running on port ${port}`);
});
if(process.env.NODE_ENV!="production"){
    require('dotenv').config();
} 
const express=require("express");
const app=express();
const mongoose=require("mongoose");
const dbUrl=process.env.ATLASDB_URL;
const path=require("path");
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
const methodOverride=require("method-override");
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname,"/public")));
const ejsMate=require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
app.engine("ejs",ejsMate);
const session=require("express-session");
const MongoStore=require('connect-mongo');
const flash=require("connect-flash");
const passport=require("passport");
const LocalStrategy=require("passport-local");
const User=require("./models/user.js");

const listingsRouter=require("./routes/listing.js");
const reviewsRouter=require("./routes/review.js");
const userRouter=require("./routes/user.js");

main()
    .then(()=>{
        console.log("connected to DB");
    })
    .catch((err)=>{
        console.log(err);
    });

async function main(){
   // console.log("MongoDB Connection String:",dbUrl); 
    await mongoose.connect(dbUrl);
}

const store=MongoStore.create({
    mongoUrl:dbUrl,
    crypto:{
        secret:process.env.SECRET,
    },
    touchAfter: 24*3600,
});

store.on("error",()=>{
    console.log("Error in Mongo Session Store",err);
});

const sessionOptions={
    store,
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires:Date.now()+7*24*60*60*1000,
        maxAge:7*24*60*60*1000,
        httpOnly:true,
    }
};

// app.get("/",(req,res)=>{
//     res.send("Hi,Iam root");
// });

app.use(session(sessionOptions));
app.use(flash()); // it should be before routes

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    res.locals.currUser=req.user;
    next();
})

app.get("/demoUser",async(req,res)=>{
    let fakeUser=new User({
        email:"student@gmail.com",
        username:"delta-structure"
    });
    let registeredUser=await User.register(fakeUser,"helloworld");
    res.send(registeredUser);
})

app.use("/listings",listingsRouter);
app.use("/listings/:id/reviews",reviewsRouter);
app.use("/",userRouter);

app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"Page not Found!"));
});
// Error Handling
app.use((err,req,res,next)=>{
    let {statusCode=500,message="something went wrong"}=err;
   // res.status(statusCode).send(message);
   res.status(statusCode).render("error.ejs",{message});
});

app.listen(8080,()=>{
    console.log("Server is listening on port:8080");
})
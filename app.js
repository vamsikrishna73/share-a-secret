require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook');
const findOrCreate = require("mongoose-findorcreate"); 


// const bcrypt = require('bcrypt');
// const saltRounds = 10;
//const encryption = require('mongoose-encryption');


const app = express();

app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(session({
    secret:"Our little secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

const url = process.env.MONGO_URL;
mongoose.connect(url);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

//const secret = process.env.key;
//userSchema.plugin(encryption,{secret: process.env.key, encryptedFields: ["password"]});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
passport.deserializeUser(function(user, done) {
    done(null, user);
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://share-a-secret-production.up.railway.app/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



let port = process.env.PORT;

if(port == null || port == ""){
    port = 3000;
}


app.listen(port,function() {
    console.log("server started at port 3000");
    //console.log("mongodb+srv://"+process.env.dbUser+":"+process.env.pass+"@cluster0.z04gxte.mongodb.net/todolistDB")
    
});

app.get("/",function(req,res){
    res.render("home");
})

app.get('/auth/google',
  passport.authenticate('google', { scope:
      [ 'email', 'profile' ] }
));
app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
});

app.get("/register",function(req,res){
    res.render("register");
})

app.get("/login", function(req,res){
    res.render("login");
})

// app.post("/register", function(req,res){
    
    
//     bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//         const newUser = new User({email: req.body.username, password: hash});
//         newUser.save().then(function(response,err){
//             if(!err){
//                 res.render("secrets");
//             }
//             else{
//                 console.log(err);
//             }
//         })
//     });
    
    
// });
app.get("/secrets", function(req, res){
    User.find({"secret": {$ne: null}}).then(function(foundUsers){
      if (!foundUsers){
        console.log(foundUsers);
      } else {
        if (foundUsers) {
          res.render("secrets", {usersWithSecrets: foundUsers});
        }
      }
    });
  });
  
  app.get("/submit", function(req, res){
    if (req.isAuthenticated()){
      res.render("submit");
    } else {
      res.redirect("/login");
    }
  });
  
  app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;
  
  //Once the user is authenticated and their session gets saved, their user details are saved to req.user.
    // console.log(req.user.id);
  
    User.findById(req.user._id).then(function(foundUser,err){
      
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          foundUser.secret = submittedSecret;
          foundUser.save().then(function(){
            res.redirect("/secrets");
          });
        }
      }
    });
  });
  
  app.post('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });
  
  app.post("/register", function(req, res){
  
    User.register({username: req.body.username}, req.body.password, function(err, user){
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function(){
          res.redirect("/secrets");
        });
      }
    });
  
  });
  
  app.post("/login", function(req, res){

    const user = new User({
      username: req.body.username,
      password: req.body.password
    });
  
    req.login(user, function(found,err){
      if (found) {
        // console.log(err);
        passport.authenticate("local")(req, res, function(){
            res.redirect("/secrets");
          });
      } else {
        console.log(err);
      }
    });
  
  });
  


// app.post("/login", function(req,res){
//     const user = req.body.username;
//     const pass = req.body.password;

//     User.findOne({email: user}).then(function(foundItem,err){
//         if(!err){
//             if(foundItem){
//                 bcrypt.compare(pass, foundItem.password).then(function(result) {
//                     if(result == true){
//                         res.render("secrets");
//                     };
//                 });
//             }
//             else{
//                 res.send('<script>alert("incorrect password")</script>');
//             }
//         }
//         else{
//             console.log(err);
//         }
//     })
// })







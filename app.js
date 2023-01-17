//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const { functionsIn } = require('lodash');
let exists = false;

let today = new Date();
let time=today.getHours();
let dd = String(today.getDate()).padStart(2, '0');
let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
let yyyy = today.getFullYear();

let date = dd + '/' + mm + '/' + yyyy;



const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set("strictQuery",false);
mongoose.connect("mongodb+srv://Krishnansu:testing123@canteen.u3cbmpx.mongodb.net/userDB",{ useNewUrlParser: true }, function (err) { 
  if (err) throw err;  });

//Ayuthentication
const userSchema = new mongoose.Schema ({
  googleId: String,
  userName: String,
  mobile: String,
  email:String,
  password:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);


passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});



passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://bewildered-loafers-colt.cyclic.app/auth/google/home",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOne( {googleId : profile.id}, function( err, foundUser ){
      if( !err ){                                                          //Check for any errors
          if( foundUser ){
              exists = true;                                          // Check for if we found any users
              return cb( null, foundUser );                  //Will return the foundUser
          }else {
              // return ["false",profile.id];                                                        //Create a new User
              const newUser = new User({
                  googleId : profile.id
              });
              newUser.save( function( err ){
                  if(!err){
                      return cb(null, newUser);                //return newUser
                  }
              });
          }
      }else{
          console.log( err );
      }
    });
    // User.findOrCreate({ googleId: profile.id}, function (err, user) {
    //   return cb(err, user);
    // });
  }
));

const menueSchema = {
  name: {
      type: String,
      required: true
  },
  description: String,
  price:{
      type: Number,
      required: true
  },
  menuImg:String,
  
};

const cartSchema = {
  Id: String,
  items: [{
    itemId: String,
  }],
  cart_status:Boolean
};

const orderSchema = {
  Id: String,
  items: [{
    itemId: String,
  }],
  accept_status:Boolean,
  reject_status:Boolean,
  completion_status:Boolean,
  orderDate: String
};

const Item = mongoose.model("Item",menueSchema);
const Cart = mongoose.model("Cart",cartSchema);
const Order = mongoose.model("Order",orderSchema);

app.get("/", function(req, res){
  res.render("starting");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
  
);


app.get("/auth/google/home",
  passport.authenticate('google', { failureRedirect: "/" }),
  function(req, res) {
    // Successful authentication, redirect to home.
    if(exists){
      exists = false;
      res.redirect("/studentHome");

    }else{
      res.redirect("/newUser");
    }
    
    }
    
  );

  app.get("/staffLogin",function(req,res){
    res.render("staffLogin");

  });

  app.get("/staffLogin/err",function(req,res){
    res.render("staffLoginErr");

  });

app.get("/newUser",function(req,res){
  res.render("newUser");
  
});

app.post("/newUser",function(req,res){
  const name = req.body.name;
  const mobile = req.body.mobile;
  User.findById(req.user.id, function(err,foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.userName = name;
        foundUser.mobile=  mobile;
        foundUser.save(function(){
          res.redirect("/studentHome");
        });
      }
    }
  });
});

app.post("/studentHome",function(req,res){
  
  res.redirect("/studentHome");
  

});



app.get("/studentHome",function(req,res){
  
  
  Item.find({},function(err,foundItems){
    res.render("studentHome",{
      items: foundItems,
    });
  })    
});

app.get("/logout",function(req,res){

  req.logout(function(err){
      if(err){
          console.log(err);
      }
      else
      {
          res.redirect("/");
      }
  });
  
});


app.post("/login",function(req,res){
  const email= req.body.email;
  const password= req.body.password;
  console.log(email,password);

  User.findOne({email: email,password:password},function(err,foundUser){
      if(err)
      {
          console.log(err);
      }
      else
      {
          if(foundUser){

              res.redirect("/staffHome");
              
          }
          else
          {
              res.redirect("/staffLogin/err");
          }
      }
  })
});



///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get("/staffHome",function(req,res){

  Item.find({},function(err,foundItems){    
      if(!err)
      {
        Order.find({},function(err,foundOrders){
          res.render("staffHome",{
            items: foundItems,
            orders:foundOrders
          });
        })
      }
    
  })  
    
});


app.get("/newItem",function(req,res){
  res.render("newItem");
});


app.post("/newItem",function(req,res){
  const itemName = req.body.itemName;
  const price = req.body.price;
  const imgURL = req.body.imgURL;
  const description = req.body.description;
  

  const newItem = new Item({
    name: itemName,
    price: price,
    menuImg: imgURL,
    description: description
  });
  
    newItem.save();
    res.redirect("/staffHome");
  


});





app.post("/delete",function(req,res){
  
  const checkedItemId = (req.body.deleteItem);


    Item.findByIdAndRemove(checkedItemId,function(err){
      if(err)
      {
        console.log(err);
      }
      else
      {
        console.log("Deleted one item successfully");
        res.redirect("/staffHome");
      }
    });
  
});


app.get("/placeOrder",function(req,res){
  const stuID = req.user._id;
  
  Cart.findOne({Id: stuID},function(err,foundCart){
    if(!err){
          Item.find({},function(err ,foundItem){
            if(!err){
              User.find({_id:stuID},function(err ,foundUser){
                if(!err){
                  res.render("placeOrder",{foundItem: foundItem,foundCart:foundCart,foundUser:foundUser});
                }
              
            });
            
    }});
                
        

    }
  });
});



app.post("/staffHome1",function(req,res){
  const orderID = req.body.AcceptStatus;
  console.log(orderID);
    
  Order.findOne({_id:orderID},function(err,order){
      if(!err)
      {if(order){
        order.accept_status=true;
        
        order.save();
        res.redirect("/staffHome#pending-order");
      }
        
      }

  });

});

app.post("/completion",function(req,res){
  const OrderID = req.body.success;
  Order.findOne({_id:OrderID},function(err,order){
    if(!err)
    {if(order){
      order.completion_status=true;
      
      order.save();
      res.redirect("/ordersReceived");
    }
      
    }

});
})

app.post("/staffHome0",function(req,res){
  const orderID = req.body.RejectStatus;
  console.log(orderID);
    
  Order.findOne({_id:orderID},function(err,order){
      if(!err)
      {if(order){
        order.reject_status=true;
        
        order.save();
        res.redirect("/staffHome#pending-order");
      }
        
      }

  });


});






app.post("/placeOrder",function(req,res){   // ADD ITEMS TO ORDER COLLECTION AND DELETE IT FROM CART
  const stuID = req.user._id;

  Cart.find({Id:stuID},function(err,foundCart){
    if(!err)
    {
      let ord=[];
      console.log(foundCart);
      ord.push(...foundCart[0].items);
      console.log(ord);
    
      

      const newOrder = new Order({
        Id: foundCart[0].Id,
        items: ord,
        completion_status:false,
        reject_status:false,
        accept_status:false,
        orderDate: date
        
      });
      newOrder.save();
      
      
    }
  });

  Cart.findOneAndRemove({Id:stuID},function(err,cart){
    if(err)
      {
        console.log(err);
      }
      else
      {
        console.log("Removed Cart");
        res.redirect("/orders");
      }

  });
   

        
});


app.get("/orders",function(req,res){       
  const id = req.user._id;
  Order.find({Id:id},function(err,foundOrders){
    if(!err)
    {
      Item.find({},function(err,foundItems){
        if(!err)
        {
          console.log(foundOrders);
          res.render("orders",{orders: foundOrders,items:foundItems});
          
        }
      });
    }
    
  });



});

app.get("/ordersReceived",function(req,res){          //SEND ORDER+USER+ITEM COLLECTION
  Order.find({},function(err,foundOrders){
    Item.find({},function(err,foundItems){
      User.find({},function(err,foundUsers){
        console.log(foundOrders,foundItems,foundUsers);
        res.render("ordersReceived",{orders: foundOrders,items: foundItems, users:foundUsers});

      })
    })
    
  });

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


app.get("/cart",function(req,res){
  
  
  const id = req.user._id;

  Cart.findOne({Id:id},function(err,foundCart){
    if(!err){
      
     Item.find({},function(err,foundItems){
      if(!err){
        // console.log(foundCart);
        if(foundCart){
          res.render("cart",{foundItems: foundItems,foundCart:foundCart});
        }
        else
        {
          res.render("cart",{foundItems: foundItems,foundCart:[]});
        }
        
        
      }
     });
    }
    
  });
 
  

});

app.post("/cart/delete",function(req,res){
  const stuID = req.user._id;
  const itemID = req.body.remove;
  Cart.findOne({Id:stuID},function(err,cart){
    
    cart.items = cart.items.filter(function(item){
      if(item.itemId != itemID){
        return item;
      }
    }); 
    cart.save();
    res.redirect("/cart");
  });
});

app.post("/cart",function(req,res){
  const stuID = req.user._id;
  console.log(stuID);
  const itemID = req.body.addToCart; //
  
  Cart.findOne({Id: stuID},function(err,cart){
    let flag = false;
    if(!err){
      if(cart){
        // for(let i =0;i< cart.items.length;i++){
        //   if(cart.items[i].itemId === itemID){
        //     flag = true;
        //     break;
        //   }
        // }
        if(!flag){
          cart.items.push({itemId: itemID});
          cart.cart_status = false;
          cart.save();
          flag = true;
        }
        
        
      }else{
        const newCart = new Cart({
          Id: stuID,
          items: [{
            itemId: itemID,
          }],
          cart_status: false
        });
        newCart.save();
      }
      res.redirect("/studentHome#pricing");
    }
  });
});



app.listen(3000, function() {
  console.log("Server started on port 3000.");
});

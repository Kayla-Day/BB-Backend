const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// require database connection
const dbConnect = require("./db/dbConnect");
const User = require("./db/userModel");
const auth = require("./auth");

// execute database connection
dbConnect();

const favicon = require("express-favicon");

app.use(favicon(__dirname + "/public/favicon.png"));

// Curb Cores Error by adding a header here
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  next();
});

// body parser configuration
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (request, response, next) => {
  response.json({ message: "Hey! This is your server response!" });
  next();
});

// register endpoint
app.post("/register", (request, response) => {
  // hash the password
  bcrypt
    .hash(request.body.password, 10)
    .then((hashedPassword) => {
      // create a new user instance and collect the data
      const user = new User({
        email: request.body.email,
        password: hashedPassword,
        balance: request.body.balance,
      });

      // save the new user
      user
        .save()
        // return success if the new user is added to the database successfully
        .then((result) => {
          response.status(201).send({
            message: "User Created Successfully",
            result,
          });
        })
        // catch erroe if the new user wasn't added successfully to the database
        .catch((error) => {
          response.status(500).send({
            message: "Error creating user",
            error,
          });
        });
    })
    // catch error if the password hash isn't successful
    .catch((e) => {
      response.status(500).send({
        message: "Password was not hashed successfully",
        e,
      });
    });
});

// login endpoint
app.post("/login", (request, response) => {
  // check if email exists
  User.findOne({ email: request.body.email })

    // if email exists
    .then((user) => {
      // compare the password entered and the hashed password found
      bcrypt
        .compare(request.body.password, user.password)

        // if the passwords match
        .then((passwordCheck) => {
          // check if password matches
          if (!passwordCheck) {
            return response.status(400).send({
              message: "Passwords does not match",
              error,
            });
          }

          //   create JWT token
          const token = jwt.sign(
            {
              userId: user._id,
              userEmail: user.email,
            },
            "RANDOM-TOKEN",
            { expiresIn: "24h" }
          );

          //   return success response
          response.status(200).send({
            message: "Login Successful",
            email: user.email,
            token,
          });
        })
        // catch error if password do not match
        .catch((error) => {
          response.status(400).send({
            message: "Passwords does not match",
            error,
          });
        });
    })
    // catch error if email does not exist
    .catch((e) => {
      response.status(404).send({
        message: "Email not found",
        e,
      });
    });
});

//Testing Deposit and Withdrawal functionality
// Deposit
app.post("/deposit", async (req, res) => {
  // const { email, amount } = req.body;
  const amount = Number(req.body.amount);
  const email = req.body.email;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.balance += amount;
    await user.save();

    res.send({ message: "Deposit successful", balance: user.balance });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// withdraw
app.post("/withdraw", async (req, res) => {
  // const { email, amount } = req.body;
  const amount = Number(req.body.amount);
  const email = req.body.email;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    user.balance -= amount;
    await user.save();

    res.send({
      message: "Withdrawal successful",
      balance: user.balance,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/logout", (req, res) => {
  // This is where you handle the logout
  // Simply respond with a success message as the client-side handles token removal
  return res.json({ message: "Logout successful" });
});

// free endpoint
app.get("/free-endpoint", (request, response) => {
  response.json({ message: "" });
});

// protected endpoint
app.get("/auth-endpoint", auth, (request, response) => {
  const email = request.user.userEmail;
  const balance = Number(request.user.userBalance);

  return response.send({
    email,
    balance,
  });
});

// app.get("/data", auth, (request, response) => {
//   const email = request.user.userEmail;
//   const balance = request.user.balance;

//   return response.send({
//     email,
//     balance,
//   });
// });

// app.get("/auth-endpoint", auth, (request, response) => {
//   const email = User.email;
//   const balance = User.balance;

//   response.send({
//     message: "",
//     email,
//     balance,
//   });
// });

module.exports = app;

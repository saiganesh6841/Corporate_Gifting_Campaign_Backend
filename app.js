const express = require("express");
const path = require("path");
var multer = require("multer");
var session = require("express-session");
var cookieParser = require("cookie-parser");
const MongoStore = require("connect-mongo");
var cors = require("cors");
const user = require("./routes/user");
const admin = require("./routes/admin");
const AuthController = require("./api/controller/services/AuthController");
require("dotenv").config();
const cron = require("node-cron");

var app = express();

// mongodb configuration
const mongoose = require("mongoose");
const connectionUrl =
  process.env.MONGODB_URI_PROD || process.env.MONGODB_URI_DEV;
if (!(connectionUrl === undefined || connectionUrl?.length <= 0)) {
  mongoose.set("debug", false);
  mongoose.Promise = global.Promise;
  mongoose.connect(connectionUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  let db = mongoose.connection;
  db.once("open", function () {
    console.log("Db connnected");
  });
  db.on("error", function (err) {
    console.error(err);
  });
}

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ],
    credentials: true,
  }),
);

app.use(
  express.json({
    limit: "50mb",
  }),
);
app.use(
  express.urlencoded({
    extended: true,
  }),
);
app.use(multer());
app.use(
  session({
    secret: "flora",
    resave: false, //don't save session if unmodified
    saveUninitialized: true,
    store: new MongoStore({
      mongoUrl: connectionUrl,
      //touchAfter: 24 * 3600, // time period in seconds
      ttl: 30 * 24 * 60 * 60, // = 14 days. Default
      autoRemove: "native", // Default
    }),
    rolling: true,
    cookie: {
      originalMaxAge: 30 * 24 * 60 * 60 * 1000,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      secure: false,
      // expires: new Date(Date.now() + 300000),
    },
  }),
);
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "build")));
app.use("/app", express.static(path.join(__dirname, "build")));
app.use(express.static(path.join(__dirname, "public")));

app.use("/", function (req, res, next) {
  AuthController.checkRequestAuth(req, res, next);
});

app.use("/user", user);
app.use("/admin", admin);

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});
module.exports = app;

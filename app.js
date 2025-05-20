const express = require("express");
const path = require("path");
var multer = require("multer");
const MongoStore = require("connect-mongo");
var cors = require("cors");
const user = require("./routes/user");
const admin = require("./routes/admin");
const AuthController = require("./api/controller/services/AuthController");
require("dotenv").config();

var app = express();

// mongodb configuration
const mongoose = require("mongoose");
const connectionUrl = process.env.MONGODB_CONNECTION_STRING_DEVELOPMENT;
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
  })
);

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
// app.use(multer());

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

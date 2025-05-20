#!/usr/bin/env node

/**
 * Module dependencies.
 */

var app = require("../app");
//var UserSocketController = require('../api/controller/services/UserSocketController');
var debug = require("debug")("limitless-test:server");
require("dotenv").config();

var http = require("http");
const https = require("https"),
  fs = require("fs");

/**
 * Create ssl keys
 */

const ssl_options = {
  // key: fs.readFileSync("./hoblist.com.key"),
  // cert: fs.readFileSync("./hoblist.com.pem")
};

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || "4000");

// var port = normalizePort(process.env.SECURE_PORT || "8080");
// app.set('port', port);
app.set("port", port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);
// var server = https.createServer(ssl_options, app);
// initialise socket io object for this server
//var io = require('socket.io')(server);
/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
console.log(`server listening to port ${port}`);
server.on("error", onError);
server.on("listening", onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== "listen") {
    throw error;
  }

  var bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  debug("Listening on " + bind);
}

// initialise Socket io object in service controller, this is for the socket io communication
//UserSocketController.initSocket(io);
// io.on('connection', function(socket) {
//   UserSocketController.initSocket(io, socket);
//
// });

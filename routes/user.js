const express = require('express');
const router = express.Router();
const UserController = require("../api/controller/user/UserController");
router.route("/accountLogin").post(UserController.login);
router.route("/verify/otp").post(UserController.verifyOtp);
router.route("/profile").get(UserController.userProfile);
module.exports = router;
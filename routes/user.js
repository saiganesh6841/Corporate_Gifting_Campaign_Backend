const express = require("express");
const router = express.Router();
const UserController = require("../api/controller/user/UserController");
const { userAuth } = require("../middleware/userAuth");

// authentication routes
router.route("/accountLogin").post(UserController.login);
router.route("/verify/otp").post(UserController.verifyOtp);

// logout routes
router.route("/logout").get(UserController.logout);

// user routes
router.route("/profile").get(userAuth, UserController.userProfile);

// project routes 
// router
//   .route("/project/list/pending")
//   .get(userAuth, ProjectController.queryAllPendingProjects);

module.exports = router;

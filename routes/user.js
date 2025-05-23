const express = require("express");
const router = express.Router();
const UserController = require("../api/controller/user/UserController");
const { userAuth } = require("../middleware/userAuth");
const ProjectController = require("../api/controller/user/ProjectController");
const AttendanceController = require("../api/controller/user/AttendanceController");
// authentication routes
router.route("/accountLogin").post(UserController.login);
router.route("/verify/otp").post(UserController.verifyOtp);

// logout routes
router.route("/logout").get(UserController.logout);

// user routes
router.route("/profile").get(userAuth, UserController.userProfile);

// project routes
router.route("/project/list").get(userAuth, ProjectController.queryProjects);
// file upload routes
router.route("/upload/files").put( UserController.uploadFiles);

// attendance routes
router.route("/checkIn").get(userAuth, AttendanceController.checkIn);
router.route("/checkOut").get(userAuth, AttendanceController.checkOut);
router.route("/checkIns/list").get(userAuth, AttendanceController.queryAllCheckins);
module.exports = router;

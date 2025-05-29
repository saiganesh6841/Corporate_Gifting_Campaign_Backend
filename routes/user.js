const express = require("express");
const router = express.Router();
const UserController = require("../api/controller/user/UserController");
const { userAuth } = require("../middleware/userAuth");
const ProjectController = require("../api/controller/user/ProjectController");
const AttendanceController = require("../api/controller/user/AttendanceController");
const TaskController = require("../api/controller/user/TaskController");
const RoomController = require("../api/controller/user/RoomController");

// authentication routes
router.route("/accountLogin").post(UserController.login);
router.route("/verify/otp").post(UserController.verifyOtp);

// logout routes
router.route("/logout").get(UserController.logout);

// user routes
router.route("/profile").get(userAuth, UserController.userProfile);

// project routes
router
  .route("/project/list/pending")
  .get(userAuth, ProjectController.queryAllPendingProjects);

router.route("/project/list/all").get(userAuth, ProjectController.queryAllProjects);
router
  .route("/project/count")
  .get(userAuth, ProjectController.projectAndTaskCounts);
router
  .route("/project/details")
  .post(userAuth, ProjectController.projectDetails);
router
  .route("/project/submit")
  .post(userAuth, ProjectController.submitProjectUploads);

router
  .route("/project/uploads/list")
  .post(userAuth, ProjectController.queryAllUploads);

// file upload routes
router.route("/upload/files").put(UserController.uploadFiles);

// attendance routes
router.route("/checkIn").get(userAuth, AttendanceController.checkIn);
router.route("/checkOut").get(userAuth, AttendanceController.checkOut);
router
  .route("/checkIns/list")
  .get(userAuth, AttendanceController.queryAllCheckins);

// Task routes

router.route("/task/list").get(userAuth, TaskController.queryTasks);

// room routes
router.route("/room/tasks/list").post(userAuth, RoomController.taskDetails);
router.route("/room/task/submit").post(userAuth, RoomController.submitTask);

module.exports = router;

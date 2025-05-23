const express = require("express");
const router = express.Router();
const UserController = require("../api/controller/admin/UserController");
const ProjectController = require("../api/controller/admin/ProjectController");
const AuthController = require("../api/controller/admin/AuthController");
const RoleController = require("../api/controller/admin/RoleController");
const RoomController = require("../api/controller/admin/RoomController");
const { adminAuth } = require("../middleware/adminAuth");

// authentication
router.route("/accountLogin").post(AuthController.accountLogin);
router.route("/verifyOtp").post(AuthController.verifyOtp);
router.route("/resendOtp").post(AuthController.resendOtp);
router.route("/islogin").get(adminAuth, AuthController.accountLoginStatus);
router.route("/logout").get(adminAuth, AuthController.logout);

// user routes
router.route("/user/getAll").post(adminAuth, UserController.getAllUser);
router.route("/user/create").post(adminAuth, UserController.createUser);
router.route("/user/get").post(adminAuth, UserController.getUserById);
router.route("/user/update").post(adminAuth, UserController.updateUser);
router.route("/user/delete").post(adminAuth, UserController.deleteUser);

// project routes
router
  .route("/project/create")
  .post(adminAuth, ProjectController.createProject);

//   room routes
router.route("/room/create").post(adminAuth, RoomController.createRoom);
router.route("/room/update").post(adminAuth, RoomController.updateRoom);

// roles routes
router.route("/role/create/").post(adminAuth, RoleController.createRole);

module.exports = router;

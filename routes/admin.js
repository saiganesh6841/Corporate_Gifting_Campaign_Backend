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
router.route("/user/create").post(adminAuth, UserController.createUser);

// roles routes
router.route("/role/create/").post(adminAuth, RoleController.createRole);

router
  .route("/project/create")
  .post(adminAuth, ProjectController.createProject);

//   room routes
router.route("/room/create").post(adminAuth, RoomController.createRoom);
router.route("/room/update").post(adminAuth, RoomController.updateRoom);

module.exports = router;

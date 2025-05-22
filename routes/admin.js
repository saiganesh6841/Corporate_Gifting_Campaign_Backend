const express = require("express");
const router = express.Router();
const UserController = require("../api/controller/admin/UserController");
const ProjectController = require("../api/controller/admin/ProjectController");
const AuthController = require("../api/controller/admin/AuthController");
const RoleController = require("../api/controller/admin/RoleController");
const { adminAuth } = require("../middleware/adminAuth");

// authentication
router.route("/accountLogin").post(AuthController.accountLogin);
router.route("/verifyOtp").post(AuthController.verifyOtp);
router.route("/islogin").get(adminAuth, UserController.accountLoginStatus);

// user routes
router.route("/create/user").post(adminAuth, UserController.createUser);

// roles routes
router.route("/create/role").post(adminAuth, RoleController.createRole);

router
  .route("/create/project")
  .post(adminAuth, ProjectController.createProject);
module.exports = router;

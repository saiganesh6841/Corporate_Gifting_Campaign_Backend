const express = require("express");
const router = express.Router();
const UserController = require("../api/controller/admin/UserController");
const ProjectController = require("../api/controller/admin/ProjectController");
const AuthController = require("../api/controller/admin/AuthController");
const RoleController = require("../api/controller/admin/RoleController");

// authentication
router.route("/accountLogin").post(AuthController.accountLogin);
router.route("/verifyOtp").post(AuthController.verifyOtp);

// user routes
router.route("/create/user").post(UserController.createUser);

// roles routes
router.route("/create/role").post(RoleController.createRole);

router.route("/create/project").post(ProjectController.createProject);
module.exports = router;

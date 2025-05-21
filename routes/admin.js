const express = require("express");
const router = express.Router();
const UserController = require("../api/controller/admin/UserController");
const ProjectController = require("../api/controller/admin/ProjectController")

router.route("/create/user").post(UserController.createUser);
router.route("/create/project").post(ProjectController.createProject);

router.route("/list/workers").post(UserController.queryAllWorkers);
module.exports = router;

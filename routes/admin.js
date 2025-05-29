const express = require("express");
const router = express.Router();
const UserController = require("../api/controller/admin/UserController");
const ProjectController = require("../api/controller/admin/ProjectController");
const AuthController = require("../api/controller/admin/AuthController");
const RoleController = require("../api/controller/admin/RoleController");
const RoomController = require("../api/controller/admin/RoomController");
const { adminAuth } = require("../middleware/adminAuth");
const TaskController = require("../api/controller/admin/TaskController");
const AwsController = require("../api/controller/admin/AwsController");
const DropdownContorller = require("../api/controller/admin/DropdownContorller");

// apis
router.route("/upload/file").put(AwsController.uploadFiles);

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
router.route("/project/message").post(adminAuth, ProjectController.addMessage);

// task routes
router.route("/task/create").post(adminAuth, TaskController.createTask);
router.route("/task/getAll").post(adminAuth, TaskController.getAllTask);
router.route("/task/get").post(adminAuth, TaskController.getTaskById);
router.route("/task/view").post(adminAuth, TaskController.taskView);
router.route("/task/update").post(adminAuth, TaskController.updateTask);
router.route("/task/delete").post(adminAuth, TaskController.deleteTask);


//   room routes
router.route("/room/create").post(adminAuth, RoomController.createRoom);
router.route("/room/update").post(adminAuth, RoomController.updateRoom);
router.route("/room/delete").post(adminAuth, RoomController.deleteRoom);
router.route("/room/getAll").post(adminAuth, RoomController.getAllRoom);
router.route("/room/get").post(adminAuth, RoomController.getRoomById);

// roles routes
router.route("/role/create").post(adminAuth, RoleController.createRole);
router.route("/role/list").post(adminAuth, RoleController.listRole);
router.route("/role/get").post(adminAuth, RoleController.getRoleById);
router.route("/role/update").post(adminAuth, RoleController.updateRole);
router.route("/role/delete").post(adminAuth, RoleController.deleteRole);

// dropdown routes
router
  .route("/dropdown/project")
  .post(adminAuth, DropdownContorller.getProjects);
router.route("/dropdown/floors").post(adminAuth, DropdownContorller.getFloors);
router.route("/dropdown/flats").post(adminAuth, DropdownContorller.getFlats);
router.route("/dropdown/rooms").post(adminAuth, DropdownContorller.getRooms);
router
  .route("/dropdown/workers")
  .post(adminAuth, DropdownContorller.getWorkers);

module.exports = router;

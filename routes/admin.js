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
// const ScheduleTimeController = require("../api/controller/admin/ScheduleTimeController");
const AttendenceController = require("../api/controller/admin/AttendenceController");
const DashboardController = require("../api/controller/admin/DashboardController");
const ProgressTimeline = require("../api/controller/admin/ProgressTimeline");

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
router
  .route("/project/update")
  .post(adminAuth, ProjectController.updateProject);
router.route("/project/list").post(adminAuth, ProjectController.listProject);
router.route("/project/get").post(adminAuth, ProjectController.getById);
router.route("/project/view").post(adminAuth, ProjectController.projectView);
router
  .route("/project/delete")
  .post(adminAuth, ProjectController.deleteProject);
router
  .route("/project/worker")
  .post(adminAuth, ProjectController.projectWorker);
router
  .route("/project/roomView")
  .post(adminAuth, ProjectController.projectRoomView);
router
  .route("/project/roomImageDetails")
  .post(adminAuth, ProjectController.roomImageDetails);
router
  .route("/project/deleteImage")
  .post(adminAuth, ProjectController.deleteImage);
router.route("/project/message").post(adminAuth, ProjectController.addMessage);
router
  .route("/project/message/list")
  .post(adminAuth, ProjectController.messageList);

// project dropdowns
router
  .route("/project/dropdown/room")
  .post(adminAuth, ProjectController.getRoomDropdown);
router
  .route("/project/dropdown/supervisor")
  .post(adminAuth, ProjectController.getSupervisorDropdown);
router
  .route("/project/dropdown/worker")
  .post(adminAuth, ProjectController.getWorkerDropdown);

// progressTime line
router
  .route("/progress/get")
  .post(adminAuth, ProgressTimeline.getProgressTimeline);

// task routes
router.route("/task/create").post(adminAuth, TaskController.createTask);
router.route("/task/getAll").post(adminAuth, TaskController.getAllTask);
router.route("/task/get").post(adminAuth, TaskController.getTaskById);
router.route("/task/view").post(adminAuth, TaskController.taskView);
router.route("/task/update").post(adminAuth, TaskController.updateTask);
router.route("/task/delete").post(adminAuth, TaskController.deleteTask);
router.route("/task/message/list").post(adminAuth, TaskController.listTaskMessage);
// router.route("/task/message/add").post(adminAuth, TaskController.addMessage);

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

// attendence
router
  .route("/attendence/list")
  .post(adminAuth, AttendenceController.listAttendence);

// schedule timing routes
// router
//   .route("/schedule/create")
//   .post(adminAuth, ScheduleTimeController.createTiming);
// router.route("/schedule/list").post(adminAuth, ScheduleTimeController.listTiming);
// router.route("/schedule/get").post(adminAuth, ScheduleTimeController.getTimingById);
// router
//   .route("/schedule/update")
//   .post(adminAuth, ScheduleTimeController.updateTiming);
// router
//   .route("/schedule/delete")
//   .post(adminAuth, ScheduleTimeController.deleteTiming);

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

// dashboard routes
router
  .route("/dashboard/count")
  .post(adminAuth, DashboardController.dashboardCount);
router
  .route("/dashboard/graph")
  .get(adminAuth, DashboardController.dashboardGraph);

module.exports = router;

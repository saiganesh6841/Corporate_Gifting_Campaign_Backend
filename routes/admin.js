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
router.route("/islogin").get(AuthController.accountLoginStatus);
router.route("/logout").get(AuthController.logout);

// user routes
router.route("/user/getAll").post(UserController.getAllUser);
router.route("/user/create").post(UserController.createUser);
router.route("/user/get").post(UserController.getUserById);
router.route("/user/update").post(UserController.updateUser);
router.route("/user/delete").post(UserController.deleteUser);

// project routes
router.route("/project/create").post(ProjectController.createProject);
router.route("/project/update").post(ProjectController.updateProject);
router.route("/project/deleteFloor").post(ProjectController.deleteFloor);
router.route("/project/deleteFlat").post(ProjectController.deleteFalt);
router.route("/project/list").post(ProjectController.listProject);
router.route("/project/get").post(ProjectController.getById);
router.route("/project/view").post(ProjectController.projectView);
router.route("/project/delete").post(ProjectController.deleteProject);
router.route("/project/worker").post(ProjectController.projectWorker);
router.route("/project/roomView").post(ProjectController.projectRoomView);
router
  .route("/project/roomImageDetails")
  .post(ProjectController.roomImageDetails);
router.route("/project/deleteImage").post(ProjectController.deleteImage);
router.route("/project/message").post(ProjectController.addMessage);
router.route("/project/message/list").post(ProjectController.messageList);

// project dropdowns
router.route("/project/dropdown/room").post(ProjectController.getRoomDropdown);
router
  .route("/project/dropdown/supervisor")
  .post(ProjectController.getSupervisorDropdown);
router
  .route("/project/dropdown/worker")
  .post(ProjectController.getWorkerDropdown);

// progressTime line
router.route("/progress/get").post(ProgressTimeline.getProgressTimeline);

// task routes
router.route("/task/create").post(TaskController.createTask);
router.route("/task/getAll").post(TaskController.getAllTask);
router.route("/task/get").post(TaskController.getTaskById);
router.route("/task/view").post(TaskController.taskView);
router.route("/task/update").post(TaskController.updateTask);
router.route("/task/delete").post(TaskController.deleteTask);
router
  .route("/task/projectDropdown")
  .post(TaskController.projectsByTaskDropdown);

router.route("/task/message/list").post(TaskController.listTaskMessage);
// router.route("/task/message/add").post( TaskController.addMessage);

//   room routes
router.route("/room/create").post(RoomController.createRoom);
router.route("/room/update").post(RoomController.updateRoom);
router.route("/room/delete").post(RoomController.deleteRoom);
router.route("/room/getAll").post(RoomController.getAllRoom);
router.route("/room/get").post(RoomController.getRoomById);

// roles routes
router.route("/role/create").post(RoleController.createRole);
router.route("/role/list").post(RoleController.listRole);
router.route("/role/get").post(RoleController.getRoleById);
router.route("/role/update").put(RoleController.updateRole);
router.route("/role/delete").post(RoleController.deleteRole);

// attendence
router.route("/attendence/list").post(AttendenceController.listAttendence);

// schedule timing routes
// router
//   .route("/schedule/create")
//   .post( ScheduleTimeController.createTiming);
// router.route("/schedule/list").post( ScheduleTimeController.listTiming);
// router.route("/schedule/get").post( ScheduleTimeController.getTimingById);
// router
//   .route("/schedule/update")
//   .post( ScheduleTimeController.updateTiming);
// router
//   .route("/schedule/delete")
//   .post( ScheduleTimeController.deleteTiming);

// dropdown routes
router.route("/dropdown/project").post(DropdownContorller.getProjects);
router.route("/dropdown/floors").post(DropdownContorller.getFloors);
router.route("/dropdown/flats").post(DropdownContorller.getFlats);
router.route("/dropdown/rooms").post(DropdownContorller.getRooms);
router.route("/dropdown/workers").post(DropdownContorller.getWorkers);

// dashboard routes
router.route("/dashboard/count").post(DashboardController.dashboardCount);
router.route("/dashboard/graph").get(DashboardController.dashboardGraph);
router.route("/dashboard/projects").get(DashboardController.dashboardProject)

module.exports = router;

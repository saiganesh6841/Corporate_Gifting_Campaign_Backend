const express = require('express');
const router = express.Router();
const UserController = require("../api/controller/user/UserController");
router.route("/accountLogin").post(UserController.login);
module.exports = router;
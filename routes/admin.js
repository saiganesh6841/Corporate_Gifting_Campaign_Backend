const express = require("express");
const router = express.Router();
const UserController = require("../api/controller/admin/UserController");

router.route("/createUser").post(UserController.createUser);
module.exports = router;

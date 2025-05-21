const { returnCode } = require("../../../config/responseCode");
const roleConfig = require("../../../config/roleConfig");
const Role = require("../../model/Role");
const UtilController = require("../services/UtilController");

module.exports = {
  createRole: async (req, res, next) => {
    try {
      let createObj = req.body;
      //   const userId = req.user.userId;
      let roleCount = await Role.countDocuments({
        name: createObj.name.trim(),
        // createdBy: userId,
      });
      var addRoledata = {
        name: createObj.name,
        active: createObj.active,
        //   createdBy: userId,
        permission: roleConfig.permission,
      };
      if (roleCount === 0) {
        await Role.create(addRoledata);
        responseCode = returnCode.validSession;
        UtilController.sendSuccess(req, res, next, {
          responseCode,
          message: "Role created successfully",
          data: addRoledata,
        });
      } else {
        responseCode = returnCode.duplicate;
        UtilController.sendError(req, res, next, {
          responseCode,
          message: "Role already exists",
        });
      }
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },
};

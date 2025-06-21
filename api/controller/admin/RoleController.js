const { returnCode } = require("../../../config/responseCode");
const roleConfig = require("../../../config/roleConfig");
const Role = require("../../model/Role");
const UtilController = require("../services/UtilController");

module.exports = {
  createRole: async (req, res, next) => {
    try {
      let createObj = req.body;
      const userId = req.user.userId;
      let roleCount = await Role.countDocuments({
        name: createObj.name.trim(),
        createdBy: userId,
      });
      var addRoledata = {
        name: createObj.name,
        active: createObj.active,
        createdBy: userId,
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
  listRole: async (req, res, next) => {
    try {
      const { ...filters } = req.body;
      let queryObj = {
        active: filters.active ?? true,
      };
      if (filters.active === "All") {
        delete queryObj.active;
      }

      let sortOrder = {};

      sortOrder = {
        updatedAt: -1,
      };

      let page = 0;
      let pageSize = 10;
      if (
        !UtilController.isEmpty(filters.page) &&
        !UtilController.isEmpty(filters.pageSize)
      ) {
        page = Number(filters.page);
        pageSize = Number(filters.pageSize);
      }

      let searchKey = filters.keyword ?? "";

      if (!UtilController.isEmpty(filters.startDate)) {
        queryObj["$and"] = [
          { createdAt: { $gte: filters.startDate } },
          {
            createdAt: {
              $lte: filters.endDate || Math.floor(new Date() / 1000),
            },
          },
        ];
      }

      const pipeline = [
        {
          $match: queryObj,
        },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdByUser",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "updatedBy",
            foreignField: "_id",
            as: "updatedByUser",
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            active: 1,
            createdAt: 1,
            updatedAt: 1,
            // createdBy: 1,
            // permission: 1,
            // createdByUser: 1,
            createdByUser: {
              $arrayElemAt: ["$createdByUser.fullName", 0],
            },
            updatedByUser: {
              $arrayElemAt: ["$updatedByUser.fullName", 0],
            },
          },
        },
        ...(searchKey
          ? [
              {
                $match: {
                  $or: [
                    { name: { $regex: searchKey, $options: "i" } },
                    { createdByUser: { $regex: searchKey, $options: "i" } },
                    { updatedByUser: { $regex: searchKey, $options: "i" } },
                  ],
                },
              },
            ]
          : []),
        { $sort: sortOrder },
        { $skip: page * pageSize },
        { $limit: pageSize },
      ];

      const result = await Role.aggregate(pipeline);
      let pageCount = await Role.countDocuments(queryObj);

      UtilController.sendSuccess(req, res, next, {
        rows: result,
        pages: Math.ceil(pageCount / pageSize),
        filterRecords: pageCount,
        message: "success",
        responseCode: returnCode.validSession,
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },
  getRoleById: async (req, res, next) => {
    try {
      const { recordId } = req.body;
      if (!recordId) {
        return UtilController.sendError(req, res, next, {
          message: "Role ID is required",
          responseCode: returnCode.invalidRequest,
        });
      }

      const role = await Role.findById(recordId).lean();
      if (!role) {
        return UtilController.sendError(req, res, next, {
          message: "Role not found",
          responseCode: returnCode.notFound,
        });
      }

      UtilController.sendSuccess(req, res, next, {
        data: role,
        message: "Role retrieved successfully",
        responseCode: returnCode.validSession,
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },
  updateRole: async (req, res, next) => {
    try {
      const { roleId, ...updateObj } = req.body;
      if (!roleId) {
        return UtilController.sendError(req, res, next, {
          message: "Role ID is required",
          responseCode: returnCode.invalidRequest,
        });
      }

      // 🔍 Check if another role with the same name exists (excluding the one being updated)
      if (name) {
        const existingRole = await Role.findOne({
          _id: { $ne: roleId },
          name: name,
        });

        if (existingRole) {
          return UtilController.sendError(req, res, next, {
            message: "A role with the same name already exists",
            responseCode: returnCode.duplicate,
          });
        }

        updateObj.name = name;
      }

      updateObj.updatedAt = Math.floor(new Date() / 1000);
      updateObj.updatedBy = req.user.userId;

      const role = await Role.findByIdAndUpdate(
        roleId,
        { $set: updateObj },
        { new: true }
      ).lean();

      if (!role) {
        return UtilController.sendError(req, res, next, {
          message: "Role not found",
          responseCode: returnCode.notFound,
        });
      }

      UtilController.sendSuccess(req, res, next, {
        data: role,
        message: "Role updated successfully",
        responseCode: returnCode.validSession,
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },
  deleteRole: async (req, res, next) => {
    try {
      const { recordIds } = req.body;
      if (!recordIds) {
        return UtilController.sendError(req, res, next, {
          message: "Role ID is required",
          responseCode: returnCode.invalidRequest,
        });
      }
      if (!Array.isArray(recordIds) || recordIds.length === 0) {
        return UtilController.sendSuccess(req, res, next, {
          message: "roleid array is required",
          responseCode: returnCode.invalidInput,
        });
      }

      await Role.updateMany(
        { _id: { $in: recordIds } },
        { $set: { active: false } }
      );

      UtilController.sendSuccess(req, res, next, {
        message: "Role deleted successfully",
        responseCode: returnCode.validSession,
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },
};

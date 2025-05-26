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
        createdAt: -1,
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

      if (!UtilController.isEmpty(searchKey)) {
        queryObj["$or"] = [{ name: { $regex: searchKey, $options: "i" } }];
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
          },
        },
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
};

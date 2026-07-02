const { returnCode } = require("../../../config/responseCode");
const Organization = require("../../model/organization");
const UtilController = require("../services/UtilController");

module.exports = {
  createOrganization: async (req, res, next) => {
    try {
      let createObj = req.body;
      const userId = req.user.userId;

      if (!createObj?.name) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Organization name is required",
        });
      }

      createObj.createdBy = userId;
      createObj.updatedBy = userId;

      const organization = new Organization(createObj);
      await organization.save();

      organization.orgId = organization._id.toString();
      await organization.save();

      let responseCode = returnCode.validSession;
      UtilController.sendSuccess(req, res, next, {
        responseCode,
        message: "Organization created successfully",
        data: organization,
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },

  editOrganization: async (req, res, next) => {
    try {
      let updateObj = req.body;
      const userId = req.user.userId;
      const { _id } = req.body;

      if (!_id) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Organization id is required",
        });
      }

      const organization = await Organization.findById(_id);
      if (!organization) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.dataNotFound,
          message: "Organization not found",
        });
      }

      delete updateObj._id;
      delete updateObj.orgId;
      delete updateObj.createdBy;
      delete updateObj.createdAt;

      updateObj.updatedBy = userId;
      updateObj.updatedAt = Math.floor(Date.now() / 1000);

      Object.assign(organization, updateObj);
      await organization.save();

      let responseCode = returnCode.validSession;
      UtilController.sendSuccess(req, res, next, {
        responseCode,
        message: "Organization updated successfully",
        data: organization,
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },

  getOrganizationDetails: async (req, res, next) => {
    try {
      const { _id } = req.query;

      let filter = { active: true };
      if (_id) {
        filter._id = _id;
      }

      if (_id) {
        const organization = await Organization.findOne(filter);
        if (!organization) {
          return UtilController.sendError(req, res, next, {
            responseCode: returnCode.dataNotFound,
            message: "Organization not found",
          });
        }

        let responseCode = returnCode.validSession;
        return UtilController.sendSuccess(req, res, next, {
          responseCode,
          message: "Organization details fetched successfully",
          data: organization,
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      if (req.query.search) {
        filter.name = { $regex: req.query.search, $options: "i" };
      }

      const organizations = await Organization.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalCount = await Organization.countDocuments(filter);

      let responseCode = returnCode.validSession;
      UtilController.sendSuccess(req, res, next, {
        responseCode,
        message: "Organization list fetched successfully",
        data: {
          organizations,
          totalCount,
          page,
          limit,
        },
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },
  listOrganization: async (req, res, next) => {
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
            orgId: 1,
            name: 1,
            email: 1,
            mobileNumber: 1,
            contactPersonName: 1,
            city: 1,
            state: 1,
            pincode: 1,
            gstNumber: 1,
            logo: 1,
            active: 1,
            createdAt: 1,
            updatedAt: 1,
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
                    { email: { $regex: searchKey, $options: "i" } },
                    { mobileNumber: { $regex: searchKey, $options: "i" } },
                    { contactPersonName: { $regex: searchKey, $options: "i" } },
                    { city: { $regex: searchKey, $options: "i" } },
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

      const result = await Organization.aggregate(pipeline);
      let pageCount = await Organization.countDocuments(queryObj);

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
  deleteOrganization: async (req, res, next) => {
    try {
      const { orgIds } = req.body;
      const userId = req.user.userId;

      if (!Array.isArray(orgIds) || orgIds.length === 0) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Organization id(s) are required",
        });
      }

      const result = await Organization.updateMany(
        { _id: { $in: orgIds }, active: true },
        {
          $set: {
            active: false,
            updatedBy: userId,
            updatedAt: Math.floor(Date.now() / 1000),
          },
        },
      );

      if (result.matchedCount === 0) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.dataNotFound,
          message: "Organization not found",
        });
      }

      let responseCode = returnCode.validSession;
      UtilController.sendSuccess(req, res, next, {
        responseCode,
        message: "Organization deleted successfully",
        data: "",
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },
};

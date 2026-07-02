const User = require("../../model/User");
const UtilController = require("../services/UtilController");
const { returnCode } = require("../../../config/responseCode");
const Tag = require("../../model/Tag");
const Role = require("../../model/Role");
var CryptoJS = require("crypto-js");
const { default: mongoose } = require("mongoose");

module.exports = {
  // getAllUser: async (req, res, next) => {
  //   try {
  //     const { ...filters } = req.body;
  //     let queryObj = {
  //       active: filters.active ?? true,
  //     };
  //     if (filters.active === "All") {
  //       delete queryObj.active;
  //     }
  //     if (
  //       UtilController.isEmpty(filters.userType) ||
  //       filters.userType === "All"
  //     ) {
  //       // Default and "All" both exclude employees
  //       queryObj.userType = { $ne: "employee" };
  //     } else {
  //       // Filter by selected user type
  //       queryObj.userType = filters.userType;
  //     }
  //     let sortOrder = {};

  //     sortOrder = {
  //       updatedAt: -1,
  //     };

  //     let page = 0;
  //     let pageSize = 10;
  //     if (
  //       !UtilController.isEmpty(filters.page) &&
  //       !UtilController.isEmpty(filters.pageSize)
  //     ) {
  //       page = Number(filters.page);
  //       pageSize = Number(filters.pageSize);
  //     }

  //     let searchKey = filters.keyword ?? "";

  //     // if (!UtilController.isEmpty(filters.userType)) {
  //     //   queryObj["userType"] = filters.userType;
  //     // }

  //     // if (filters.userType === "All") {
  //     //   delete queryObj.userType;
  //     // }

  //     if (!UtilController.isEmpty(filters.startDate)) {
  //       queryObj["$and"] = [
  //         { createdAt: { $gte: filters.startDate } },
  //         {
  //           createdAt: {
  //             $lte: filters.endDate || Math.floor(new Date() / 1000),
  //           },
  //         },
  //       ];
  //     }

  //     // if (!UtilController.isEmpty(searchKey)) {
  //     //   queryObj["$or"] = [
  //     //     { fullName: { $regex: searchKey, $options: "i" } },
  //     //     { userId: { $regex: searchKey, $options: "i" } },
  //     //     { userType: { $regex: searchKey, $options: "i" } },
  //     //     { mobileNumber: { $regex: searchKey, $options: "i" } },
  //     //     { email: { $regex: searchKey, $options: "i" } },
  //     //   ];
  //     // }
  //     // console.log("queryObj: ", queryObj);

  //     const pipeline = [
  //       {
  //         $match: queryObj,
  //       },
  //       {
  //         $lookup: {
  //           from: "users",
  //           localField: "createdBy",
  //           foreignField: "_id",
  //           as: "createdByUser",
  //         },
  //       },
  //       {
  //         $lookup: {
  //           from: "users",
  //           localField: "updatedBy",
  //           foreignField: "_id",
  //           as: "updatedByUser",
  //         },
  //       },
  //       {
  //         $addFields: {
  //           createdBy: { $arrayElemAt: ["$createdByUser.fullName", 0] },
  //         },
  //       },
  //       {
  //         $addFields: {
  //           updatedBy: { $arrayElemAt: ["$updatedByUser.fullName", 0] },
  //         },
  //       },
  //       ...(searchKey
  //         ? [
  //             {
  //               $match: {
  //                 $or: [
  //                   { fullName: { $regex: searchKey, $options: "i" } },
  //                   { userId: { $regex: searchKey, $options: "i" } },
  //                   { userType: { $regex: searchKey, $options: "i" } },
  //                   { mobileNumber: { $regex: searchKey, $options: "i" } },
  //                   { email: { $regex: searchKey, $options: "i" } },
  //                   { createdBy: { $regex: searchKey, $options: "i" } },
  //                   { updatedBy: { $regex: searchKey, $options: "i" } },
  //                 ],
  //               },
  //             },
  //           ]
  //         : []),
  //       {
  //         $project: {
  //           createdByUser: 0,
  //           updatedByUser: 0,
  //         },
  //       },
  //       { $sort: sortOrder },
  //       { $skip: page * pageSize },
  //       { $limit: pageSize },
  //     ];

  //     const result = await User.aggregate(pipeline);
  //     let pageCount = await User.countDocuments(queryObj);

  //     UtilController.sendSuccess(req, res, next, {
  //       rows: result,
  //       pages: Math.ceil(pageCount / pageSize),
  //       filterRecords: pageCount,
  //       message: "success",
  //       responseCode: returnCode.validSession,
  //     });
  //   } catch (error) {
  //     console.log("error: ", error);
  //     UtilController.sendError(req, res, error);
  //   }
  // },
  getAllUser: async (req, res, next) => {
    try {
      const { ...filters } = req.body;
      let queryObj = {
        active: filters.active ?? true,
      };
      if (filters.active === "All") {
        delete queryObj.active;
      }

      if (
        UtilController.isEmpty(filters.userType) ||
        filters.userType === "All"
      ) {
        // no userType passed or "All" — exclude employees, show all other types
        queryObj.userType = { $ne: "employee" };
      } else if (filters.userType === "employee") {
        // employee tab — scope to organization only
        queryObj.userType = "employee";
        if (!filters.organizationId) {
          return UtilController.sendError(req, res, next, {
            responseCode: returnCode.invalidParams,
            message: "organizationId is required to list employees",
          });
        }
        // queryObj.organizationId = filters.organizationId;
        queryObj.organizationId = new mongoose.Types.ObjectId(
          filters.organizationId,
        );
      } else {
        // specific userType like hr, vendor, superadmin
        queryObj.userType = filters.userType;
      }

      let sortOrder = { updatedAt: -1 };

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
        { $match: queryObj },
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
          $lookup: {
            from: "organizations",
            localField: "organizationId",
            foreignField: "_id",
            as: "organizationDetails",
          },
        },
        {
          $addFields: {
            createdBy: { $arrayElemAt: ["$createdByUser.fullName", 0] },
            updatedBy: { $arrayElemAt: ["$updatedByUser.fullName", 0] },
            organizationName: {
              $arrayElemAt: ["$organizationDetails.name", 0],
            },
          },
        },
        ...(searchKey
          ? [
              {
                $match: {
                  $or: [
                    { fullName: { $regex: searchKey, $options: "i" } },
                    { userId: { $regex: searchKey, $options: "i" } },
                    { userType: { $regex: searchKey, $options: "i" } },
                    { mobileNumber: { $regex: searchKey, $options: "i" } },
                    { email: { $regex: searchKey, $options: "i" } },
                    { employeeCode: { $regex: searchKey, $options: "i" } },
                    { department: { $regex: searchKey, $options: "i" } },
                    { designation: { $regex: searchKey, $options: "i" } },
                    { organizationName: { $regex: searchKey, $options: "i" } },
                    { createdBy: { $regex: searchKey, $options: "i" } },
                    { updatedBy: { $regex: searchKey, $options: "i" } },
                  ],
                },
              },
            ]
          : []),
        {
          $project: {
            createdByUser: 0,
            updatedByUser: 0,
            organizationDetails: 0,
            password: 0,
            tempOtp: 0,
            linkToken: 0,
          },
        },
        { $sort: sortOrder },
        { $skip: page * pageSize },
        { $limit: pageSize },
      ];
      const result = await User.aggregate(pipeline);
      let pageCount = await User.countDocuments(queryObj);

      UtilController.sendSuccess(req, res, next, {
        rows: result,
        pages: Math.ceil(pageCount / pageSize),
        filterRecords: pageCount,
        message: "success",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, error);
    }
  },
  createUser: async (req, res, next) => {
    try {
      let createObj = req.body;
      const permissionId = createObj?.permission;

      if (UtilController.isEmpty(createObj?.fullName)) {
        return UtilController.sendSuccess(req, res, next, {
          message: "Full name is required for creating the account.",
          responseCode: returnCode.invalidInput,
        });
      }

      if (UtilController.isEmpty(createObj?.email)) {
        return UtilController.sendSuccess(req, res, next, {
          message: "Email is required for creating the account.",
          responseCode: returnCode.invalidInput,
        });
      }

      if (UtilController.isEmpty(createObj?.mobileNumber)) {
        return UtilController.sendSuccess(req, res, next, {
          message: "Mobile number is required for creating the account.",
          responseCode: returnCode.invalidInput,
        });
      }

      const existingUser = await User.findOne({
        $or: [
          { email: createObj.email },
          { mobileNumber: createObj.mobileNumber },
        ],
        active: true,
      });

      if (existingUser) {
        let messages;

        if (existingUser.email === createObj.email) {
          messages = "Email already exists.";
        }

        if (existingUser.mobileNumber === createObj.mobileNumber) {
          messages = "Mobile number already exists.";
        }

        return UtilController.sendSuccess(req, res, next, {
          message: messages, // will be an array of strings
          responseCode: returnCode.duplicate,
        });
      } else {
        const tagResult = await Tag.findOneAndUpdate(
          {
            tagType: "user",
            active: true,
          },
          {
            $inc: { sequenceNo: 1 },
            updatedAt: Math.floor(Date.now() / 1000),
          },
        );
        createObj["userId"] =
          tagResult.prefix + UtilController.pad(tagResult.sequenceNo, 5);
        createObj["createdBy"] = req.user?.userId;

        if (!UtilController.isEmpty(createObj?.password)) {
          const password = createObj.password;
          const encryptedPassword = CryptoJS.AES.encrypt(
            password,
            process.env.passwordSecretKey,
          ).toString();
          createObj["password"] = encryptedPassword;
        }

        if (!UtilController.isEmpty(permissionId)) {
          let role = await Role.findOne({
            name: UtilController.convertToMongoose(permissionId),
          });
          if (!UtilController.isEmpty(role)) {
            createObj["permission"] = role._id;
          }
        } else {
          createObj["permission"] = null;
        }

        const userResult = await User.create(createObj);
        return UtilController.sendSuccess(req, res, next, {
          message: "succesfully created new user",
          responseCode: returnCode.validSession,
          user: userResult,
        });
      }
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, error);
    }
  },

  getUserById: async (req, res, next) => {
    try {
      const { userId } = req.body;
      if (UtilController.isEmpty(userId)) {
        return UtilController.sendSuccess(req, res, next, {
          message: "userId is required",
          responseCode: returnCode.invalidInput,
        });
      }
      const result = await User.findOne({ userId: userId })
        .populate("permission", "name _id")
        .lean();
      if (UtilController.isEmpty(result)) {
        return UtilController.sendSuccess(req, res, next, {
          message: "user not found",
          responseCode: returnCode.invalidInput,
        });
      }
      if (result.password) {
        const bytes = CryptoJS.AES.decrypt(
          result.password,
          process.env.passwordSecretKey,
        );
        result.password = bytes.toString(CryptoJS.enc.Utf8);
      }
      UtilController.sendSuccess(req, res, next, {
        rows: result,
        message: "success",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, error);
    }
  },

  updateUser: async (req, res, next) => {
    try {
      const { userId, ...updateObj } = req.body;
      // console.log("userId: ", userId);

      if (UtilController.isEmpty(userId)) {
        return UtilController.sendSuccess(req, res, next, {
          message: "userId is required",
          responseCode: returnCode.invalidInput,
        });
      }

      const existingUser = await User.findOne({
        $or: [
          { email: updateObj.email },
          { mobileNumber: updateObj.mobileNumber },
        ],
        active: true,
      });

      // if (existingUser) {
      //   let messages;

      //   if (existingUser.email === updateObj.email) {
      //     messages = "Email already exists.";
      //   }

      //   if (existingUser.mobileNumber === updateObj.mobileNumber) {
      //     messages = "Mobile number already exists.";
      //   }

      //   return UtilController.sendSuccess(req, res, next, {
      //     message: messages, // will be an array of strings
      //     responseCode: returnCode.duplicate,
      //   });
      // }

      if (!UtilController.isEmpty(updateObj?.password)) {
        const password = updateObj.password;
        const encryptedPassword = CryptoJS.AES.encrypt(
          password,
          process.env.passwordSecretKey,
        ).toString();
        updateObj["password"] = encryptedPassword;
      }

      updateObj["updatedBy"] = req.user?.userId;
      updateObj["updatedAt"] = Math.floor(Date.now() / 1000);

      const result = await User.findOneAndUpdate(
        { _id: userId },
        { $set: updateObj },
        { updatedAt: Math.floor(Date.now() / 1000) },
        { new: true },
      );
      console.log("result: ", result, userId);
      if (UtilController.isEmpty(result)) {
        return UtilController.sendSuccess(req, res, next, {
          message: "User not found",
          responseCode: returnCode.invalidInput,
        });
      }

      UtilController.sendSuccess(req, res, next, {
        rows: result,
        message: "Success",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, error);
    }
  },

  deleteUser: async (req, res, next) => {
    try {
      const { userId } = req.body;
      if (UtilController.isEmpty(userId)) {
        return UtilController.sendSuccess(req, res, next, {
          message: "userId is required",
          responseCode: returnCode.invalidInput,
        });
      }
      const result = await User.updateMany(
        { userId: { $in: userId } },
        { $set: { active: false } },
        { new: true },
      );
      if (UtilController.isEmpty(result)) {
        return UtilController.sendSuccess(req, res, next, {
          message: "user not found",
          responseCode: returnCode.invalidInput,
        });
      }
      UtilController.sendSuccess(req, res, next, {
        rows: result,
        message: "success",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, error);
    }
  },
};

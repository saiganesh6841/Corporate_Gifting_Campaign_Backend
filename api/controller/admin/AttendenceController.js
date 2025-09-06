const { returnCode } = require("../../../config/responseCode");
const Attendance = require("../../model/Attendance");
const UtilController = require("../services/UtilController");

module.exports = {
  listAttendence: async (req, res, next) => {
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
      // console.log("searchKey: ", searchKey);

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
            localField: "userId",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
        {
          $project: {
            _id: 1,
            userObjectId: "$userDetails._id",
            userId: "$userDetails.userId",
            userName: "$userDetails.fullName",
            attendanceDate: 1,
            workHours: "$totalDuration",
            checkIn: 1,
            createdAt: 1,
            checkOut: 1,
            status: 1,
          },
        },
        {
          $match: {
            $or: [
              { userId: { $regex: searchKey, $options: "i" } },
              { userName: { $regex: searchKey, $options: "i" } },
            ],
          },
        },
        { $sort: sortOrder },
        { $skip: page * pageSize },
        { $limit: pageSize },
      ];

      const result = await Attendance.aggregate(pipeline);
      let pageCount = await Attendance.countDocuments(queryObj);

      UtilController.sendSuccess(req, res, next, {
        rows: result,
        message: "Attendence listed",
        pages: Math.ceil(pageCount / pageSize),
        filterRecords: pageCount,
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, next, error);
    }
  },

  attendanceDetails: async (req, res, next) => {
    try {
      let { userId, date } = req.body;

      if (!userId) {
        return UtilController.sendSuccess(req, res, next, {
          message: "User Id is required",
          responseCode: returnCode.invalidSession,
        });
      }

      if (!date) {
        date = Math.floor(Date.now() / 1000);
      }

      const givenDate = new Date(date * 1000);

      const previousMonthStart = new Date(
        givenDate.getFullYear(),
        givenDate.getMonth() - 1,
        1
      );
      const previousMonthStartStr = previousMonthStart
        .toISOString()
        .split("T")[0];

      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      let userObjectId = await UtilController.convertToMongoose(userId);

      let matchObj = {
        userId: userObjectId,
        active: true,
        attendanceDate: {
          $gte: previousMonthStartStr,
          $lte: todayStr,
        },
      };

      let pipeline = [
        {
          $match: matchObj,
        },
      ];
      let result = await Attendance.aggregate(pipeline);

      UtilController.sendSuccess(req, res, next, {
        message: "Successfully fetched attendance details",
        responseCode: returnCode.validSession,
        result,
      });
      console.log(result);
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, next, error);
    }
  },
};

const { returnCode } = require("../../../config/responseCode");
const Attendance = require("../../model/Attendance");
const User = require("../../model/User");
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
          $sort: { attendanceDate: -1 },
        },
        {
          $group: {
            _id: "$userId",
            doc: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: { newRoot: "$doc" },
        },
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
      // let pageCount = await Attendance.countDocuments(queryObj);

      UtilController.sendSuccess(req, res, next, {
        rows: result,
        message: "Attendence listed",
        pages: Math.ceil(result?.length / pageSize),
        filterRecords: result?.length,
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

      if (!date) date = Math.floor(Date.now() / 1000);

      const givenDate = new Date(date * 1000);
      const today = new Date();

      // Month start & end date logic
      const monthStart = new Date(
        givenDate.getFullYear(),
        givenDate.getMonth(),
        1
      );

      const isCurrentMonth =
        givenDate.getFullYear() === today.getFullYear() &&
        givenDate.getMonth() === today.getMonth();

      const monthEnd = isCurrentMonth
        ? today
        : new Date(givenDate.getFullYear(), givenDate.getMonth() + 1, 0);

      const userObjectId = await UtilController.convertToMongoose(userId);

      // Attendance for current month
      const currentMonthMatch = {
        userId: userObjectId,
        active: true,
        attendanceDate: {
          $gte: monthStart.toISOString().split("T")[0],
          $lte: monthEnd.toISOString().split("T")[0],
        },
      };

      const [currentMonthStats] = await Attendance.aggregate([
        { $match: currentMonthMatch },
        { $count: "present" },
      ]);

      const present = currentMonthStats?.present || 0;
      const totalDays = isCurrentMonth ? today.getDate() : monthEnd.getDate();
      const absents = totalDays - present;

      // Previous month attendance
      const previousMonthStart = new Date(
        givenDate.getFullYear(),
        givenDate.getMonth() - 1,
        1
      );

      const previousMonthMatch = {
        userId: userObjectId,
        active: true,
        attendanceDate: {
          $gte: previousMonthStart.toISOString().split("T")[0],
          $lte: today.toISOString().split("T")[0],
        },
      };

      const previousMonthData = await Attendance.aggregate([
        { $match: previousMonthMatch },
      ]);

      //Fetch user details (in parallel)
      const [userDetails] = await Promise.all([
        User.findById(userObjectId).select(
          "fullName email userType userId mobileNumber profileImage"
        ),
      ]);

      //Sundays (for whole year of givenDate)
      const sundays = [];
      let currentDate = new Date(givenDate.getFullYear(), 0, 1);

      while (currentDate.getFullYear() === givenDate.getFullYear()) {
        if (currentDate.getDay() === 0) {
          sundays.push({
            date: Math.floor(currentDate.getTime() / 1000),
            holidayName: "Sunday",
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // --- Response ---
      UtilController.sendSuccess(req, res, next, {
        message: "Successfully fetched attendance details",
        responseCode: returnCode.validSession,
        result: previousMonthData,
        userDetails,
        publicHolidays: sundays,
        present,
        absents,
      });
    } catch (error) {
      console.error("error: ", error);
      UtilController.sendError(req, res, next, error);
    }
  },
};

const Attendance = require("../../model/Attendance");
const UtilController = require("../../controller/services/UtilController");
const { returnCode } = require("../../../config/responseCode");
module.exports = {
  checkIn: async (req, res, next) => {
    try {
      const { userId } = req.user;

      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responsCode: returnCode.invalidSession,
        });
      }

      const { isoDate, dayName } = await UtilController.convertTOISOFormat();
      const currentTimestamp = Math.floor(Date.now() / 1000);

      const status = await UtilController.calculateAttendanceCheckinStatus(
        currentTimestamp
      );

      const createObj = {
        userId: UtilController.convertToMongoose(userId),
        attendanceDate: isoDate,
      };

      // check already on same day attendance been created
      const attendance = await Attendance.findOne(createObj);

      if (attendance) {
        return UtilController.sendError(req, res, next, {
          message: "Today you have been already Checked in.",
          responseCode: returnCode.validationError,
        });
      }

      createObj.checkIn = currentTimestamp;
      createObj.status = status;
      createObj.dayName = dayName;

      const result = await Attendance.create(createObj);

      return UtilController.sendSuccess(req, res, next, {
        message: "Succesfully checked in",
        responseCode: returnCode.validSession,
        result,
      });
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, next, error);
    }
  },

  checkOut: async (req, res, next) => {
    try {
      const { userId } = req.user;
      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responsCode: returnCode.invalidSession,
        });
      }

      const { isoDate } = await UtilController.convertTOISOFormat();
      //   const currentDate = "2025-05-24";

      const updateObj = {
        userId: UtilController.convertToMongoose(userId),
        attendanceDate: isoDate,
        checkOut: null,
      };

      //   check if user is checked in
      const attendanceCount = await Attendance.findOne(updateObj).lean();
      console.log(attendanceCount);

      if (!attendanceCount) {
        return UtilController.sendError(req, res, next, {
          message: "Check in first to Check out",
          responseCode: returnCode.validationError,
        });
      }

      const checkOut = Math.floor(Date.now() / 1000);
      const totalDuration = checkOut - attendanceCount?.checkIn;
      const hours = Math.floor(totalDuration / 3600);
      const minutes = Math.floor((totalDuration % 3600) / 60);

      const formattedDuration = `${hours}h ${minutes}m`;

      const status = UtilController.calculateAttendanceStatus(totalDuration);

      const result = await Attendance.findOneAndUpdate(
        updateObj,
        {
          checkOut,
          totalDuration: formattedDuration || "0h 0m",
          status,
        },
        {
          new: true,
        }
      );
      UtilController.sendSuccess(req, res, next, {
        message: "Successfully checked out",
        responseCode: returnCode.validSession,
        result,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },

  queryAllCheckins: async (req, res, next) => {
    try {
      const { userId } = req.user;
      const { date } = req.query;

      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responseCode: returnCode.invalidSession,
        });
      }

      if (!date) {
        return UtilController.sendSuccess(req, res, next, {
          message: "Date is required",
          responseCode: returnCode.invalidSession,
        });
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

      let query = {
        userId,
        active: true,
        attendanceDate: {
          $gte: previousMonthStartStr,
          $lte: todayStr,
        },
      };

      const result = await Attendance.find(query).sort({ createdAt: -1 });

      const year = givenDate.getFullYear();
      const sundays = [];

      let currentDate = new Date(year, 0, 1);

      while (currentDate.getFullYear() === year) {
        if (currentDate.getDay() === 0) {
          sundays.push({
            date: currentDate / 1000,
            holidayName: "Sunday",
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return UtilController.sendSuccess(req, res, next, {
        message: "Successfully fetched attendance",
        responseCode: returnCode.validSession,
        result,
        publicHolidays: sundays,
      });
    } catch (error) {
      console.log(error, "adch poyiii");
      return UtilController.sendError(req, res, next, error);
    }
  },

  checkoutAllUsers: async (req, res, next) => {
    try {
      const { isoDate } = UtilController.convertTOISOFormat();

      // Step 1: Get all checked-in users who haven’t checked out yet
      const usersToCheckOut = await Attendance.find({
        attendanceDate: isoDate,
        checkOut: null,
      });

      for (const record of usersToCheckOut) {
        const checkOut = Math.floor(Date.now() / 1000);
        const totalDuration = checkOut - record.checkIn;

        const hours = Math.floor(totalDuration / 3600);
        const minutes = Math.floor((totalDuration % 3600) / 60);
        const formattedDuration = `${hours}h ${minutes}m`;

        const status = UtilController.calculateAttendanceStatus(totalDuration);

        // Step 2: Update each attendance record
        await Attendance.findOneAndUpdate(
          {
            userId: record.userId,
            attendanceDate: isoDate,
            checkOut: null,
          },
          {
            checkOut,
            totalDuration: formattedDuration,
            status,
          }
        );
      }

      console.log("✅ Auto checkout complete.");
    } catch (error) {
      console.log("error", error);
      UtilController.sendError(req, res, next, error);
    }
  },
};

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

      const currentDate = UtilController.convertTOISOFormat();
      const currentTimestamp = Math.floor(Date.now() / 1000);
      console.log('currentTimestamp: ', currentTimestamp);

      const createObj = {
        userId: UtilController.convertToMongoose(userId),
        attendanceDate: currentDate,
      };

      // check already on same day attendance been created
      const attendance = await Attendance.findOne(createObj).lean();

      if (attendance) {
        return UtilController.sendError(req, res, next, {
          message: "Today you have been already Checked in.",
          responseCode: returnCode.validationError,
        });
      }

      const status = UtilController.calculateAttendanceStatus(currentTimestamp);
      console.log('status: ', status);

      // Add status to create object
      createObj.status = status;

      const result = await Attendance.create(createObj);

      return UtilController.sendSuccess(req, res, next, {
        message: "Succesfully checked in",
        responseCode: returnCode.validSession,
        result,
      });
    } catch (error) {
      console.log('error: ', error);
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

      const currentDate = UtilController.convertTOISOFormat();
      //   const currentDate = "2025-05-24";

      const updateObj = {
        userId: UtilController.convertToMongoose(userId),
        attendanceDate: currentDate,
        checkOut: null,
      };

      //   check if user is checked in
      const attendanceCount = await Attendance.findOne(updateObj).lean();

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

      const result = await Attendance.findOneAndUpdate(
        updateObj,
        {
          checkOut,
          totalDuration: formattedDuration || 0,
        },
        {
          new: true,
        }
      );
      UtilController.sendSuccess(req, res, next, {
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

      let query = { userId, active: true };

      if (date) {
        const convertedDate = await UtilController.convertToDateFormat(date);
        query.attendanceDate = convertedDate;

        const result = await Attendance.findOne(query);

        return UtilController.sendSuccess(req, res, next, {
          message: "Successfully fetched attendance",
          responseCode: returnCode.validSession,
          result: [result],
        });
      }

      // If no date provided, return list sorted by latest
      const result = await Attendance.find(query).sort({ createdAt: -1 });

      return UtilController.sendSuccess(req, res, next, {
        message: "Successfully fetched all attendance records",
        responseCode: returnCode.validSession,
        result: result,
      });
    } catch (error) {
      return UtilController.sendError(req, res, next, error);
    }
  },
};

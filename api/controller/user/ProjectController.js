const User = require("../../model/User");
const Project = require("../../model/Project");
const UtilController = require("../services/UtilController");
const Floor = require("../../model/ProjectFloors");
const Flat = require("../../model/ProjectFlats");
const Task = require("../../model/Task");
const { returnCode } = require("../../../config/responseCode");
const mongoose = require("mongoose");

module.exports = {
  queryProjects: async (req, res, next) => {
    try {
      let { userId } = req.user;

      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responsCode: returnCode.invalidSession,
        });
      }

      userId = await UtilController.convertToMongoose(userId);
      const result = await Project.aggregate([
        { $match: { assignedWorkers: userId, active: true } },
        { $project: { assignedWorkers: 0, assignedSupervisor: 0 } },
      ]);

      return UtilController.sendSuccess(req, res, next, {
        message: "succesfully fetched projects",
        responseCode: returnCode.validSession,
        result,
      });
    } catch (error) {
      return UtilController.sendError(req, res, next, error);
    }
  },

  projectAndTaskCounts: async (req, res, next) => {
    try {
      let { userId } = req.user;
      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responsCode: returnCode.invalidSession,
        });
      }

      const { date } = req.query;
      const { startOfDay, endOfDay } = await UtilController.getStartAndEndOfDay(
        Number(date) || Date.now()
      );

      const userObjectId = await UtilController.convertToMongoose(userId);

      // Run both project and task aggregation in parallel
      const [projectResult, assignedTasksCount] = await Promise.all([
        Project.aggregate([
          {
            $match: {
              assignedWorkers: userObjectId,
              active: true,
              createdAt: { $gte: startOfDay, $lte: endOfDay },
            },
          },
          {
            $facet: {
              all: [{ $count: "assigned" }],
              pending: [{ $match: { status: "pending" } }, { $count: "count" }],
              completed: [
                { $match: { status: "completed" } },
                { $count: "count" },
              ],
            },
          },
          {
            $project: {
              assigned: {
                $ifNull: [{ $arrayElemAt: ["$all.assigned", 0] }, 0],
              },
              pending: {
                $ifNull: [{ $arrayElemAt: ["$pending.count", 0] }, 0],
              },
              completed: {
                $ifNull: [{ $arrayElemAt: ["$completed.count", 0] }, 0],
              },
            },
          },
        ]),

        Task.countDocuments({
          workerId: userObjectId,
          active: true,
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        }),
      ]);

      const projectCounts = projectResult[0] || {
        assigned: 0,
        pending: 0,
        completed: 0,
      };

      return UtilController.sendSuccess(req, res, next, {
        message: "Tasks fetched for the selected date",
        responseCode: returnCode.validSession,
        result: {
          projectCounts,
          assignedTasks: assignedTasksCount,
        },
      });
    } catch (error) {
      console.error("Error in taskCount:", error);
      return UtilController.sendError(req, res, next, {
        message: "Error fetching task counts",
        responsCode: returnCode.serverError,
      });
    }
  },

  projectDetails: async (req, res, next) => {
    try {
      const { userId } = req.user;
      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responsCode: returnCode.invalidSession,
        });
      }

      const { projectId } = req.body;

      const projectObjectId = await UtilController.convertToMongoose(projectId);

      // Fetch floor details for the given project
      const floorResult = await Floor.aggregate([
        {
          $match: {
            projectId: projectObjectId,
            active: true,
          },
        },
      ]);

      let allFloorsDetails = [];

      // Loop through each floor to gather its flats and rooms
      for (const floor of floorResult) {
        // Fetch flats and room details for each floor
        const flatsWithRooms = await Flat.aggregate([
          {
            $match: {
              projectId: projectObjectId,
              floorId: floor._id,
              active: true,
            },
          },
          {
            $lookup: {
              from: "projectfloors",
              localField: "floorId",
              foreignField: "_id",
              as: "floorDetails",
            },
          },
          {
            $unwind: {
              path: "$floorDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$rooms",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "rooms",
              localField: "rooms.roomId",
              foreignField: "_id",
              as: "roomDetails",
            },
          },
          {
            $unwind: {
              path: "$roomDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $addFields: {
              "roomDetails.roomImages": "$rooms.roomImages",
            },
          },
          {
            $group: {
              _id: "$flatNo",
              flatId: { $first: "$_id" },
              floorId: { $first: "$floorId" },
              projectId: { $first: "$projectId" },
              active: { $first: "$active" },
              rooms: { $push: "$roomDetails" },
            },
          },
        ]);

        const floorDetails = {
          floorNo: floor.floorNo,
          flats: flatsWithRooms.map((flat) => ({
            flatId: flat.flatId,
            flatNo: flat._id,
            rooms: flat.rooms,
          })),
        };

        // Push this floor's details to the final array
        allFloorsDetails.push(floorDetails);
      }

      // Return the results
      return UtilController.sendSuccess(req, res, next, {
        message: "Project details fetched successfully",
        responseCode: returnCode.validSession,
        details: allFloorsDetails,
      });
    } catch (error) {
      return UtilController.sendError(req, res, next, error);
    }
  },
};

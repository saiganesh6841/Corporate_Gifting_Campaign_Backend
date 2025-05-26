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

    // console.log(projectData);
    // let result = [];
    for (const project of projectData) {
      const floors = await Floor.aggregate([
        {
          $match: {
            projectId: project._id,
            active: true,
          },
        },
      ]);
      result.push(floors);
    }

    const floorResult = result.flat();
    // console.log(floorResult);

    let flatResult = [];

    for (const floor of floorResult) {
      const flat = await Flat.aggregate([
        {
          $match: {
            projectId: floor.projectId,
            floorId: floor._id,
          },
        },
      ]);
      flatResult.push(flat);
    }

    flatResult = flatResult.flat();

    // console.log(flatResult);

    // return UtilController.sendSuccess(req, res, next, {
    //   message: "successfully fetched projects",
    //   responseCode: returnCode.validSession,
    //   projects: projectResult,
    // });
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

      const userObjectId = new mongoose.Types.ObjectId(userId);

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
};

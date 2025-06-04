const { returnCode } = require("../../../config/responseCode");
const Project = require("../../model/Project");
const Task = require("../../model/Task");
const User = require("../../model/User");
const UtilController = require("../services/UtilController");

module.exports = {
  dashboardCount: async (req, res, next) => {
    try {
      const projectPipeline = [
        {
          $facet: {
            totalProjects: [
              {
                $match: {
                  active: true,
                },
              },
              { $count: "totalProjects" },
            ],
            completedProjects: [
              {
                $match: {
                  active: true,
                  status: "completed",
                },
              },
              { $count: "completedProjects" },
            ],
            inProgress: [
              { $match: { status: "inprogress", active: true } },
              { $count: "inProgress" },
            ],
          },
        },
      ];
      const projectCount = await Project.aggregate(projectPipeline);
      const userPipeline = [
        {
          $match: {
            active: true,
          },
        },
        {
          $count: "totalUsers",
        },
      ];
      const userCount = await User.aggregate(userPipeline);

      const result = {
        totalProjects: projectCount[0]?.totalProjects[0]?.totalProjects || 0,
        completedProjects:
          projectCount[0]?.completedProjects[0]?.completedProjects || 0,
        inProgress: projectCount[0]?.inProgress[0]?.inProgress || 0,
        totalUsers: userCount[0]?.totalUsers || 0,
      };

      UtilController.sendSuccess(req, res, next, {
        result,
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
  dashboardGraph: async (req, res, next) => {
    try {
      const { startDate, endDate, dateType, graphData } = req.query;
      console.log(req.query);

      const timezoneOffsetHours = 5.5;
      const offsetInSeconds = timezoneOffsetHours * 3600;
      let start = Number(startDate) + offsetInSeconds;
      let end = Number(endDate) + offsetInSeconds;
      const result = {};

      let responseCode = returnCode.validSession;

      const epochToDate = {
        $toDate: { $multiply: ["$createdAt", 1000] },
      };

      let groupBy = {
        year: { $year: epochToDate },
      };

      if (dateType === "month") {
        groupBy.month = { $month: epochToDate };
      } else if (dateType === "week") {
        groupBy.week = { $isoWeek: epochToDate };
        groupBy.year = { $isoWeekYear: epochToDate };
      } else if (dateType === "day") {
        groupBy.month = { $month: epochToDate };
        groupBy.day = { $dayOfMonth: epochToDate };
      }

      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      const projectStage = {
        _id: 0,
        year: "$_id.year",
        month: "$_id.month",
        day: "$_id.day",
        week: "$_id.week",
      };

      if (dateType === "month") {
        projectStage.monthName = {
          $arrayElemAt: [monthNames, { $subtract: ["$_id.month", 1] }],
        };
      }

      if (graphData === "project") {
        const projectPipeline = [
          {
            $match: {
              createdAt: { $gte: start, $lte: end },
              active: true,
            },
          },
          {
            $group: {
              _id: groupBy,
              totalProjects: { $sum: 1 },
              completedProject: {
                $sum: {
                  $cond: [
                    {
                      $and: [{ $eq: ["$status", "completed"] }],
                    },
                    1,
                    0,
                  ],
                },
              },
              inProgress: {
                $sum: { $cond: [{ $eq: ["$status", "inprogress"] }, 1, 0] },
              },
              cancelled: {
                $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
              },
            },
          },
          {
            $project: {
              ...projectStage,
              totalProjects: 1,
              completedProject: 1,
              inProgress: 1,
              cancelled: 1,
            },
          },
          { $sort: { year: 1, month: 1, day: 1, week: 1 } },
        ];
        let projectGraph = await Project.aggregate(projectPipeline);
        result.users = projectGraph;
      } else if (graphData === "user") {
        const userPipeline = [
          {
            $match: {
              createdAt: { $gte: start, $lte: end },
              active: true,
            },
          },
          {
            $group: {
              _id: groupBy,
              totalUsers: { $sum: 1 },
              worker: {
                $sum: {
                  $cond: [
                    {
                      $and: [{ $eq: ["$userType", "worker"] }],
                    },
                    1,
                    0,
                  ],
                },
              },
              admin: {
                $sum: { $cond: [{ $eq: ["$userType", "admin"] }, 1, 0] },
              },
              supervisor: {
                $sum: { $cond: [{ $eq: ["$userType", "supervisor"] }, 1, 0] },
              },
            },
          },
          {
            $project: {
              ...projectStage,
              totalUsers: 1,
              worker: 1,
              admin: 1,
              supervisor: 1,
            },
          },
          { $sort: { year: 1, month: 1, day: 1, week: 1 } },
        ];
        let userGraph = await User.aggregate(userPipeline);
        result.users = userGraph;
      } else if (graphData === "task") {
        const taskPipeline = [
          {
            $match: {
              createdAt: { $gte: start, $lte: end },
              active: true,
            },
          },
          {
            $group: {
              _id: groupBy,
              totalTask: { $sum: 1 },
              completedTask: {
                $sum: {
                  $cond: [
                    {
                      $and: [{ $eq: ["$taskStatus", "completed"] }],
                    },
                    1,
                    0,
                  ],
                },
              },
              pendingTask: {
                $sum: { $cond: [{ $eq: ["$taskStatus", "pending"] }, 1, 0] },
              },
            },
          },
          {
            $project: {
              ...projectStage,
              totalTask: 1,
              completedTask: 1,
              pendingTask: 1,
            },
          },
          { $sort: { year: 1, month: 1, day: 1, week: 1 } },
        ];
        let taskGraph = await Task.aggregate(taskPipeline);
        result.task = taskGraph;
      }

      UtilController.sendSuccess(req, res, next, {
        result,
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, next, error);
    }
  },
};

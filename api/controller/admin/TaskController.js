const { returnCode } = require("../../../config/responseCode");
const Tag = require("../../model/Tag");
const Task = require("../../model/Task");
const UtilController = require("../services/UtilController");

module.exports = {
  createTask: async (req, res, next) => {
    try {
      const { ...createObj } = req.body;
      //   console.log("createObj: ", createObj);

      const { userId } = req.user;

      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responseCode: returnCode.invalidSession,
        });
      }

      const createdTasks = [];

      for (let taskItem of createObj.task) {
        const tagResult = await Tag.findOneAndUpdate(
          {
            tagType: "task",
            active: true,
          },
          {
            $inc: { sequenceNo: 1 },
            updatedAt: Math.floor(Date.now() / 1000),
          }
        );

        const taskId =
          tagResult.prefix + UtilController.pad(tagResult.sequenceNo, 5);

        const newTask = {
          ...createObj,
          taskId: taskId,
          taskDescription: taskItem.taskDescription,
          createdBy: userId,
        };

        const taskResult = await Task.create(newTask);

        createdTasks.push(taskResult);
      }

      return UtilController.sendSuccess(req, res, next, {
        message: "Tasks created successfully",
        responseCode: returnCode.validSession,
        tasks: createdTasks,
      });
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, next, {
        message: "Something went wrong",
        responseCode: returnCode.internalServerError,
      });
    }
  },
};

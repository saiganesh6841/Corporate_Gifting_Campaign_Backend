const Project = require("../../model/Project");
const Room = require("../../model/Room");
const Tag = require("../../model/Tag");
const { returnCode } = require("../../../config/responseCode");
const UtilController = require("../services/UtilController");
const mongoose = require("mongoose");
const ProjectFlats = require("../../model/ProjectFlats");
const ProjectFloors = require("../../model/ProjectFloors");
const Chat = require("../../model/Chat");
const User = require("../../model/User");
const Entries = require("../../model/Entries");

module.exports = {
  createProject: async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const { mobileNumber, email, details = [], ...projectData } = req.body;

      const { userId } = req.user;

      if (!userId) {
        await session.abortTransaction();
        session.endSession();
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responseCode: returnCode.invalidSession,
        });
      }

      const tagResult = await Tag.findOneAndUpdate(
        {
          tagType: "project",
          active: true,
        },
        {
          $inc: { sequenceNo: 1 },
          updatedAt: Math.floor(Date.now() / 1000),
        },
        { session, new: true }
      );
      projectData["projectId"] =
        tagResult.prefix + UtilController.pad(tagResult.sequenceNo, 5);
      projectData["isSupervisorAssigned"] = true;
      projectData["isWorkerAssigned"] = true;

      const project = await Project.create(
        [
          {
            ...projectData,
            clientPhoneNo: mobileNumber,
            clientEmail: email,
            createdBy: userId,
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
          },
        ],
        { session }
      );

      const projectDoc = project[0];

      for (const floor of details) {
        const floorTagResult = await Tag.findOneAndUpdate(
          {
            tagType: "floor",
            active: true,
          },
          {
            $inc: { sequenceNo: 1 },
            updatedAt: Math.floor(Date.now() / 1000),
          },
          { session, new: true }
        );
        const floorsId =
          floorTagResult.prefix +
          UtilController.pad(floorTagResult.sequenceNo, 5);

        const floorDoc = await ProjectFloors.create(
          [
            {
              floorId: floorsId,
              floorNo: floor.floorNo,
              projectId: projectDoc._id,
              createdBy: userId,
              createdAt: Math.floor(Date.now() / 1000),
              updatedAt: Math.floor(Date.now() / 1000),
            },
          ],
          { session }
        );

        const floorRef = floorDoc[0];

        // const flatTagResult = await Tag.findOneAndUpdate(
        //   {
        //     tagType: "flat",
        //     active: true,
        //   },
        //   {
        //     $inc: { sequenceNo: 1 },
        //     updatedAt: Math.floor(Date.now() / 1000),
        //   },
        //   { session, new: true }
        // );
        // const flatsId =
        //   flatTagResult.prefix +
        //   UtilController.pad(flatTagResult.sequenceNo, 5);

        for (const flat of floor.roomDetails) {
          const flatObj = {
            // flatId: flatsId,
            flatNo: flat.flatNo,
            floorId: floorRef._id,
            projectId: projectDoc._id,
            createdBy: userId,
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
            rooms: flat.rooms.map((roomId) => ({
              roomId: UtilController.convertToMongoose(roomId),
              roomImages: [],
            })),
          };

          await ProjectFlats.create([flatObj], { session });
        }
      }

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      return UtilController.sendSuccess(req, res, next, {
        message: "Project created successfully",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      console.log("error: ", error);
      await session.abortTransaction();
      session.endSession();
      return UtilController.sendError(req, res, next, {
        message: "Something went wrong",
        responseCode: returnCode.internalServerError,
      });
    }
  },
  updateProject: async (req, res, next) => {
    try {
      const session = await mongoose.startSession();

      const { ...updateObj } = req.body;
      console.log("updateObj: ", updateObj);
      const existingProject = await Project.findOne({
        projectId: updateObj.projectId,
      });
      if (!existingProject) {
        return UtilController.sendError(req, res, next, {
          message: "property not found",
          responseCode: returnCode.invalidSession,
        });
      }
      existingProject.projectName = updateObj.projectName;
      existingProject.clientName = updateObj.clientName;
      existingProject.location = updateObj.location;
      existingProject.companyName = updateObj.companyName;
      existingProject.startDate = updateObj.startDate;
      existingProject.endDate = updateObj.endDate;
      existingProject.clientPhoneNo = updateObj.mobileNumber;
      existingProject.clientEmail = updateObj.email;
      existingProject.assignedSupervisor = updateObj.assignedSupervisor;
      existingProject.assignedWorkers = updateObj.assignedWorkers;
      existingProject.uploadImage = updateObj.uploadImage;
      existingProject.status = updateObj.status;
      existingProject.updatedAt = Math.floor(Date.now() / 1000);

      await existingProject.save();

      const projectObjectId = existingProject._id;
      console.log("projectObjectId: ", projectObjectId);
      const existingFloors = await ProjectFloors.find({
        projectId: projectObjectId,
      });
      console.log("existingFloors: ", existingFloors);

      for (const floorDetail of updateObj.details) {
        console.log("floorDetail: ", floorDetail);
        let floor = await ProjectFloors.findOne({
          floorNo: floorDetail.floorNo,
          projectId: projectObjectId,
        });

        if (!floor) {
          const floorTagResult = await Tag.findOneAndUpdate(
            {
              tagType: "floor",
              active: true,
            },
            {
              $inc: { sequenceNo: 1 },
              updatedAt: Math.floor(Date.now() / 1000),
            },
            { session, new: true }
          );
          const floorsId =
            floorTagResult.prefix +
            UtilController.pad(floorTagResult.sequenceNo, 5);
          floor = await ProjectFloors.create({
            floorId: floorsId,
            floorNo: floorDetail.floorNo,
            projectId: projectObjectId,
            createdBy: req.user.userId,
          });
        }

        for (const flatDetail of floorDetail.roomDetails) {
          let flat = await ProjectFlats.findOne({
            flatNo: flatDetail.flatNo,
            projectId: projectObjectId,
            floorId: floor._id,
          });

          if (!flat) {
            flat = await ProjectFlats.create({
              flatNo: flatDetail.flatNo,
              projectId: projectObjectId,
              floorId: floor._id,
              rooms: flatDetail.rooms.map((roomId) => ({
                roomId: roomId,
                entries: [],
              })),
              createdBy: req.user.userId,
            });
          } else {
            const existingRoomIds = flat.rooms.map((r) => r.roomId.toString());
            const newRooms = flatDetail.rooms.filter(
              (roomId) => !existingRoomIds.includes(roomId)
            );

            if (newRooms.length > 0) {
              flat.rooms.push(
                ...newRooms.map((roomId) => ({ roomId, entries: [] }))
              );
              flat.updatedAt = Math.floor(Date.now() / 1000);
              await flat.save();
            }
          }
        }
      }

      UtilController.sendSuccess(req, res, next, {
        message: "Project updated successfully",
        projectId: existingProject.projectId,
      });
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, next, error);
    }
  },

  deleteFloor: async (req, res, next) => {
    try {
      const { floorId, projectId } = req.body;

      const floorObjectId = UtilController.convertToMongoose(floorId);
      const projectObjectId = UtilController.convertToMongoose(projectId);

      const floor = await ProjectFloors.findOne({
        _id: floorObjectId,
        projectId: projectObjectId,
      });

      if (!floor) {
        return UtilController.sendError(req, res, next, {
          message: "Floor not found",
          responseCode: returnCode.invalidSession,
        });
      }

      await ProjectFloors.deleteOne({
        _id: floorObjectId,
        projectId: projectObjectId,
      });

      await ProjectFlats.deleteMany({
        floorId: floorObjectId,
        projectId: projectObjectId,
      });

      UtilController.sendSuccess(req, res, next, {
        responseCode: returnCode.validSession,
        message: "Successfully deleted floor and its related flats",
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },

  deleteFalt: async (req, res, next) => {
    try {
      const { flatId, projectId } = req.body;

      const flatObjectId = UtilController.convertToMongoose(flatId);
      const projectObjectId = UtilController.convertToMongoose(projectId);

      const flat = await ProjectFlats.findOne({
        _id: flatObjectId,
        projectId: projectObjectId,
      });

      if (!flat) {
        return UtilController.sendError(req, res, next, {
          message: "flat not found",
          responseCode: returnCode.invalidSession,
        });
      }

      await ProjectFlats.deleteOne({
        _id: flatObjectId,
        projectId: projectObjectId,
      });

      UtilController.sendSuccess(req, res, next, {
        responseCode: returnCode.validSession,
        message: "Successfully deleted  flats",
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },

  addMessage: async (req, res, next) => {
    try {
      const { userId } = req.user;
      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responseCode: returnCode.invalidSession,
        });
      }

      const { entryId, message } = req.body;
      if (!message) {
        return UtilController.sendError(req, res, next, {
          message: "Message is required",
          responseCode: returnCode.validationError,
        });
      }
      const entryObjectId = UtilController.convertToMongoose(entryId);

      await Chat.findOneAndUpdate(
        { entryId: entryObjectId },
        {
          $push: {
            chats: {
              message: message,
              isAdminCreated: true,
              userId: userId,
            },
          },
          $setOnInsert: {
            createdBy: userId,
            createdAt: Math.floor(Date.now() / 1000),
          },
        },
        { new: true, upsert: true }
      );

      return UtilController.sendSuccess(req, res, next, {
        message: "Succesfully added new message",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, next, error);
    }
  },

  messageList: async (req, res, next) => {
    try {
      const { entryId } = req.body;
      let queryObj = {
        entryId: UtilController.convertToMongoose(entryId),
      };
      const pipeline = [
        { $match: queryObj },
        {
          $unwind: "$chats",
        },
        {
          $lookup: {
            from: "users",
            localField: "chats.userId",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        {
          $unwind: {
            path: "$userDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            message: "$chats.message",
            isAdminCreated: "$chats.isAdminCreated",
            createdAt: "$chats.createdAt",
            userId: "$chats.userId",
            fullName: "$userDetails.fullName",
            profileImage: "$userDetails.profileImage",
          },
        },
        {
          $sort: {
            createdAt: 1,
          },
        },
      ];
      const messages = await Chat.aggregate(pipeline);
      UtilController.sendSuccess(req, res, next, {
        responseCode: returnCode.validSession,
        message: "success",
        messages,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },

  listProject: async (req, res, next) => {
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

      if (!UtilController.isEmpty(searchKey)) {
        queryObj["$or"] = [
          { projectId: { $regex: searchKey, $options: "i" } },
          { projectName: { $regex: searchKey, $options: "i" } },
          { clientName: { $regex: searchKey, $options: "i" } },
          { location: { $regex: searchKey, $options: "i" } },
          { status: { $regex: searchKey, $options: "i" } },
        ];
      }

      const pipeline = [
        {
          $match: queryObj,
        },
        {
          $project: {
            projectId: 1,
            projectName: 1,
            clientName: 1,
            location: 1,
            startDate: 1,
            createdAt: 1,
            updatedAt: 1,
            endDate: 1,
            status: 1,
          },
        },
        { $sort: sortOrder },
        { $skip: page * pageSize },
        { $limit: pageSize },
      ];

      const result = await Project.aggregate(pipeline);
      let pageCount = await Project.countDocuments(queryObj);

      UtilController.sendSuccess(req, res, next, {
        rows: result,
        pages: Math.ceil(pageCount / pageSize),
        filterRecords: pageCount,
        message: "success",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
  getById: async (req, res, next) => {
    try {
      const { recordId } = req.body;
      if (!recordId) {
        return UtilController.sendError(req, res, next, {
          message: "task not found",
          responseCode: returnCode.invalidSession,
        });
      }

      const pipeLine = [
        {
          $match: {
            _id: UtilController.convertToMongoose(recordId),
            active: true,
          },
        },
        {
          $lookup: {
            from: "projectfloors",
            let: { projectId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$projectId", "$$projectId"],
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  floor_id: "$_id",
                  floorNo: 1,
                  floorId: 1,
                },
              },
            ],
            as: "floorDetails",
          },
        },
        {
          $lookup: {
            from: "projectflats",
            let: { projectId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$projectId", "$$projectId"],
                  },
                },
              },
              {
                $unwind: "$rooms",
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
                $group: {
                  _id: "$_id",
                  flatNo: { $first: "$flatNo" },
                  floorId: { $first: "$floorId" },
                  rooms: {
                    $push: {
                      // _id: "$rooms._id",
                      roomDetails: "$roomDetails",
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  flatNo: 1,
                  floorId: 1,
                  rooms: 1,
                },
              },
            ],
            as: "flatDetails",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "assignedSupervisor",
            foreignField: "_id",
            as: "supervisorDetails",
          },
        },
        {
          $unwind: {
            path: "$supervisorDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            proId: "$_id",
            _id: 0,
            projectId: 1,
            projectName: 1,
            active: 1,
            location: 1,
            clientName: 1,
            companyName: 1,
            assignedWorkers: 1,
            assignedSupervisor: 1,
            startDate: 1,
            endDate: 1,
            clientPhoneNo: 1,
            clientEmail: 1,
            uploadImage: 1,
            status: 1,
            floorDetails: 1,
            flatDetails: 1,
            supervisorName: "$supervisorDetails.fullName",
            supervisorMobile: "$supervisorDetails.mobileNumber",
            supervisorImage: "$supervisorDetails.profileImage",
          },
        },
      ];

      const project = await Project.aggregate(pipeLine);

      if (!project || project.length === 0) {
        return UtilController.sendError(req, res, next, {
          message: "task not found",
          responseCode: returnCode.invalidSession,
        });
      }

      const formattedProject = project[0];

      formattedProject.floorDetails = formattedProject.floorDetails.map(
        (floor) => {
          const roomDetails = formattedProject.flatDetails
            .filter(
              (flat) => flat.floorId.toString() === floor.floor_id.toString()
            )
            .map((flat) => ({
              flatNo: flat.flatNo,
              flat_id: flat._id,
              rooms: flat.rooms,
            }));

          return {
            ...floor,
            roomDetails,
          };
        }
      );

      delete formattedProject.flatDetails;

      return UtilController.sendSuccess(req, res, next, {
        message: "Successfully fetched the task",
        responseCode: returnCode.validSession,
        project: [formattedProject],
      });
    } catch (error) {
      console.error(error);
      return UtilController.sendError(req, res, next);
    }
  },
  projectView: async (req, res, next) => {
    try {
      const { recordId } = req.body;
      if (!recordId) {
        return UtilController.sendError(req, res, next, {
          message: "task not found",
          responseCode: returnCode.invalidSession,
        });
      }

      const pipeLine = [
        {
          $match: {
            _id: UtilController.convertToMongoose(recordId),
            active: true,
          },
        },
        {
          $lookup: {
            from: "projectfloors",
            let: { projectId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$projectId", "$$projectId"],
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  floorNo: 1,
                  floorId: 1,
                },
              },
            ],
            as: "floorDetails",
          },
        },
        {
          $lookup: {
            from: "projectflats",
            let: { projectId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$projectId", "$$projectId"],
                  },
                },
              },
              {
                $unwind: "$rooms",
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
                $group: {
                  _id: "$_id",
                  flatNo: { $first: "$flatNo" },
                  floorId: { $first: "$floorId" },
                  rooms: {
                    $push: {
                      _id: "$rooms._id",
                      roomDetails: "$roomDetails",
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  flatNo: 1,
                  floorId: 1,
                  rooms: 1,
                },
              },
            ],
            as: "flatDetails",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "assignedSupervisor",
            foreignField: "_id",
            as: "supervisorDetails",
          },
        },
        {
          $unwind: {
            path: "$supervisorDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            projectId: 1,
            projectName: 1,
            active: 1,
            location: 1,
            clientName: 1,
            companyName: 1,
            startDate: 1,
            endDate: 1,
            clientPhoneNo: 1,
            clientEmail: 1,
            uploadImage: 1,
            status: 1,
            floorDetails: 1,
            flatDetails: 1,
            supervisorName: "$supervisorDetails.fullName",
            supervisorMobile: "$supervisorDetails.mobileNumber",
            supervisorImage: "$supervisorDetails.profileImage",
          },
        },
      ];

      const project = await Project.aggregate(pipeLine);

      if (!project || project.length === 0) {
        return UtilController.sendError(req, res, next, {
          message: "task not found",
          responseCode: returnCode.invalidSession,
        });
      }

      const formattedProject = project[0];
      console.log("formattedProject: ", formattedProject);

      formattedProject.floorDetails = formattedProject.floorDetails.map(
        (floor) => {
          const roomDetails = formattedProject.flatDetails
            .filter((flat) => flat.floorId.toString() === floor._id.toString())
            .map((flat) => ({
              flatNo: flat.flatNo,
              rooms: flat.rooms,
            }));

          return {
            ...floor,
            roomDetails,
          };
        }
      );

      delete formattedProject.flatDetails;

      return UtilController.sendSuccess(req, res, next, {
        message: "Successfully fetched the task",
        responseCode: returnCode.validSession,
        project: [formattedProject],
      });
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, next, error);
    }
  },
  deleteProject: async (req, res, next) => {
    try {
      const { projectIds } = req.body;

      if (!Array.isArray(projectIds) || projectIds.length === 0) {
        return UtilController.sendSuccess(req, res, next, {
          message: "projectIds array is required",
          responseCode: returnCode.invalidInput,
        });
      }

      await Project.updateMany(
        { _id: { $in: projectIds } },
        { $set: { active: false } }
      );

      return UtilController.sendSuccess(req, res, next, {
        message: "Successfully deleted the project",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
  projectWorker: async (req, res, next) => {
    try {
      const { recordId, ...filters } = req.body;
      let queryObj = {
        active: filters.active ?? true,
        _id: UtilController.convertToMongoose(recordId),
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

      if (!UtilController.isEmpty(searchKey)) {
        queryObj["$or"] = [
          { projectId: { $regex: searchKey, $options: "i" } },
          { projectName: { $regex: searchKey, $options: "i" } },
          { clientName: { $regex: searchKey, $options: "i" } },
          { location: { $regex: searchKey, $options: "i" } },
          { status: { $regex: searchKey, $options: "i" } },
        ];
      }

      const pipeline = [
        {
          $match: queryObj,
        },
        {
          $lookup: {
            from: "users",
            localField: "assignedWorkers",
            foreignField: "_id",
            as: "workerDetails",
          },
        },
        {
          $unwind: {
            path: "$workerDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            userId: "$workerDetails.userId",
            name: "$workerDetails.fullName",
            mobileNumber: "$workerDetails.mobileNumber",
            email: "$workerDetails.email",
            createdAt: 1,
          },
        },
        { $sort: sortOrder },
        { $skip: page * pageSize },
        { $limit: pageSize },
      ];

      const result = await Project.aggregate(pipeline);
      const countPipeline = [...pipeline];
      const cleanPipeline = countPipeline.filter(
        (stage) => !stage.$skip && !stage.$limit
      );
      cleanPipeline.push({ $count: "total" });

      const countResult = await Project.aggregate(cleanPipeline);
      const filterRecords = countResult[0]?.total || 0;

      UtilController.sendSuccess(req, res, next, {
        rows: result,
        pages: Math.ceil(filterRecords / pageSize),
        filterRecords: filterRecords,
        message: "success",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
  projectRoomView: async (req, res, next) => {
    try {
      const { flatId, roomId, date } = req.body;
      let queryObj = {
        roomId: UtilController.convertToMongoose(roomId),
        flatId: UtilController.convertToMongoose(flatId),
      };
      if (!UtilController.isEmpty(date)) {
        const inputDate = new Date(date * 1000);
        const startOfDay = new Date(inputDate.setUTCHours(0, 0, 0, 0));
        const endOfDay = new Date(inputDate.setUTCHours(23, 59, 59, 999));

        queryObj["createdAt"] = {
          $gte: Math.floor(startOfDay.getTime() / 1000),
          $lte: Math.floor(endOfDay.getTime() / 1000),
        };
      }
      const pipeline = [
        {
          $match: queryObj,
        },
        {
          $lookup: {
            from: "users",
            localField: "workerId",
            foreignField: "_id",
            as: "workerDetails",
          },
        },
        {
          $unwind: {
            path: "$workerDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "messages",
            localField: "_id",
            foreignField: "entryId",
            as: "chatDetails",
          },
        },
        {
          $addFields: {
            allChats: {
              $reduce: {
                input: "$chatDetails",
                initialValue: [],
                in: { $concatArrays: ["$$value", "$$this.chats"] },
              },
            },
          },
        },
        {
          $addFields: {
            latestChat: {
              $let: {
                vars: {
                  sortedChats: {
                    $slice: [
                      {
                        $reverseArray: {
                          $sortArray: {
                            input: "$allChats",
                            sortBy: { createdAt: 1 },
                          },
                        },
                      },
                      1,
                    ],
                  },
                },
                in: { $arrayElemAt: ["$$sortedChats", 0] },
              },
            },
            chatCount: { $size: "$allChats" },
          },
        },
        {
          $project: {
            roomImages: 1,
            workerName: "$workerDetails.fullName",
            workerImage: "$workerDetails.profileImage",
            entryDate: "$createdAt",
            latestChat: 1,
            chatCount: 1,
          },
        },

        // {
        //   $project: {
        //     roomImages: 1,
        //     workerName: "$workerDetails.fullName",
        //     workerImage: "$workerDetails.profileImage",
        //     entryDate:"$createdAt",
        //     chatDetails: 1,
        //   },
        // },
      ];
      const roomImages = await Entries.aggregate(pipeline);
      UtilController.sendSuccess(req, res, next, {
        result: roomImages,
        message: "success",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
  getRoomDropdown: async (req, res, next) => {
    try {
      const searchKey = req.body.keyword;

      let queryObj = {
        active: true,
      };
      if (!UtilController.isEmpty(searchKey)) {
        queryObj["$or"] = [{ roomName: { $regex: searchKey, $options: "i" } }];
      }
      const pipeline = [
        {
          $match: queryObj,
        },
        {
          $project: {
            roomName: 1,
            roomLogo: 1,
            color: 1,
          },
        },
      ];
      const room = await Room.aggregate(pipeline);
      UtilController.sendSuccess(req, res, next, {
        message: "rooms listed successfully ",
        responseCode: returnCode.validSession,
        room,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
  roomImageDetails: async (req, res, next) => {
    try {
      const { entryId } = req.body;
      let queryObj = {
        _id: UtilController.convertToMongoose(entryId),
      };
      const pipeline = [
        {
          $match: queryObj,
        },
        {
          $project: {
            roomImages: 1,
          },
        },
      ];
      const entry = await Entries.aggregate(pipeline);
      UtilController.sendSuccess(req, res, next, {
        message: "roomImageDetails listed successfully ",
        responseCode: returnCode.validSession,
        result: entry,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
  deleteImage: async (req, res, next) => {
    try {
      const { entryId, imageUrl } = req.body;
      if (!entryId || !Array.isArray(imageUrl) || imageUrl.length === 0) {
        return UtilController.sendError(req, res, next, {
          message: "entryId and imageUrl array are required",
          responseCode: returnCode.invalidSession,
        });
      }

      const result = await Entries.updateOne(
        { _id: entryId },
        { $pull: { roomImages: { url: { $in: imageUrl } } } }
      );

      if (result.modifiedCount === 0) {
        return UtilController.sendError(req, res, next, {
          message: "Image not found or already deleted",
          responseCode: 404,
        });
      }

      UtilController.sendSuccess(req, res, next, {
        message: "Image deleted successfully",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
  getSupervisorDropdown: async (req, res, next) => {
    try {
      const searchKey = req.body.keyword;

      let queryObj = {
        active: true,
        userType: "supervisor",
      };
      if (!UtilController.isEmpty(searchKey)) {
        queryObj["$or"] = [{ fullName: { $regex: searchKey, $options: "i" } }];
      }
      const pipeline = [
        {
          $match: queryObj,
        },
        {
          $project: {
            fullName: 1,
          },
        },
      ];
      const supervisor = await User.aggregate(pipeline);
      UtilController.sendSuccess(req, res, next, {
        message: "supervisor listed successfully ",
        responseCode: returnCode.validSession,
        supervisor,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
  getWorkerDropdown: async (req, res, next) => {
    try {
      const searchKey = req.body.keyword;

      let queryObj = {
        active: true,
        userType: "worker",
      };
      if (!UtilController.isEmpty(searchKey)) {
        queryObj["$or"] = [{ fullName: { $regex: searchKey, $options: "i" } }];
      }
      const pipeline = [
        {
          $match: queryObj,
        },
        {
          $project: {
            fullName: 1,
          },
        },
      ];
      const worker = await User.aggregate(pipeline);
      UtilController.sendSuccess(req, res, next, {
        message: "worker listed successfully ",
        responseCode: returnCode.validSession,
        worker,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
};

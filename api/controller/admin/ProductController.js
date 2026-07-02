const { default: mongoose } = require("mongoose");
const { returnCode } = require("../../../config/responseCode");
const Product = require("../../model/product");
const UtilController = require("../services/UtilController");
const User = require("../../model/User");

module.exports = {
  createProduct: async (req, res, next) => {
    try {
      let createObj = req.body;
      const userId = req.user.userId;
      if (!userId) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Vendor id is required",
        });
      }

      if (!createObj?.name) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Product name is required",
        });
      }
      // Fetch vendor details
      const vendor = await User.findById(userId).select("fullName").lean();

      if (!vendor) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.dataNotFound,
          message: "Vendor not found",
        });
      }
      createObj.vendor = userId;
      createObj.vendorName = vendor?.fullName || "";
      createObj.createdBy = userId;
      createObj.updatedBy = userId;

      const product = new Product(createObj);
      await product.save();

      product.productId = product._id.toString();
      await product.save();

      let responseCode = returnCode.validSession;
      UtilController.sendSuccess(req, res, next, {
        responseCode,
        message: "Product created successfully",
        data: product,
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },

  editProduct: async (req, res, next) => {
    try {
      let updateObj = req.body;
      const userId = req.user.userId;
      const { _id } = req.body;

      if (!userId) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Vendor id is required",
        });
      }

      if (!_id) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Product id is required",
        });
      }

      delete updateObj._id;
      delete updateObj.productId;
      delete updateObj.vendor;
      delete updateObj.createdBy;
      delete updateObj.createdAt;

      updateObj.updatedBy = userId;
      updateObj.updatedAt = Math.floor(Date.now() / 1000);

      const product = await Product.findOneAndUpdate(
        { _id, vendor: userId },
        { $set: updateObj },
        { new: true },
      ).lean();

      if (!product) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.dataNotFound,
          message: "Product not found",
        });
      }

      let responseCode = returnCode.validSession;
      UtilController.sendSuccess(req, res, next, {
        responseCode,
        message: "Product updated successfully",
        data: product,
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },

  getProductDetails: async (req, res, next) => {
    try {
      const { _id } = req.query;

      if (!_id) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Product id is required",
        });
      }

      const product = await Product.findOne({ _id, active: true })
        .populate("vendor", "fullName email mobileNumber")
        .lean();

      if (!product) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.dataNotFound,
          message: "Product not found",
        });
      }

      let responseCode = returnCode.validSession;
      UtilController.sendSuccess(req, res, next, {
        responseCode,
        message: "Product details fetched successfully",
        data: product,
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },

  listProduct: async (req, res, next) => {
    try {
      const { ...filters } = req.body;

      let queryObj = {
        active: filters.active ?? true,
      };

      if (filters.active === "All") {
        delete queryObj.active;
      }

      // Vendor users can only see their own products
      if (req.user.userType === "vendor") {
        queryObj.vendor = new mongoose.Types.ObjectId(req.user.userId);
      } else if (filters.vendor) {
        queryObj.vendor = new mongoose.Types.ObjectId(filters.vendor);
      }

      if (filters.category) {
        queryObj.category = filters.category;
      }

      if (filters.inStock !== undefined && filters.inStock !== "All") {
        queryObj.inStock = filters.inStock;
      }

      if (!UtilController.isEmpty(filters.startDate)) {
        queryObj.$and = [
          {
            createdAt: {
              $gte: filters.startDate,
            },
          },
          {
            createdAt: {
              $lte: filters.endDate || Math.floor(new Date() / 1000),
            },
          },
        ];
      }

      const page = Number(filters.page || 0);
      const pageSize = Number(filters.pageSize || 10);
      const searchKey = filters.keyword || "";

      const pipeline = [
        {
          $match: queryObj,
        },
        {
          $lookup: {
            from: "users",
            localField: "vendor",
            foreignField: "_id",
            as: "vendorDetails",
          },
        },
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
          $project: {
            _id: 1,
            productId: 1,
            name: 1,
            sku: 1,
            category: 1,
            subCategory: 1,
            brand: 1,
            price: 1,
            discountPrice: 1,
            discountPercentage: 1,
            thumbnailImage: 1,
            images: 1,
            stockQuantity: 1,
            inStock: 1,
            tags: 1,
            occasions: 1,
            isFeatured: 1,
            approvalStatus: 1,
            active: 1,
            createdAt: 1,
            updatedAt: 1,
            description: 1,
            vendorName: {
              $arrayElemAt: ["$vendorDetails.fullName", 0],
            },
            createdByUser: {
              $arrayElemAt: ["$createdByUser.fullName", 0],
            },
            updatedByUser: {
              $arrayElemAt: ["$updatedByUser.fullName", 0],
            },
          },
        },
      ];

      // Search filter
      if (searchKey) {
        pipeline.push({
          $match: {
            $or: [
              { name: { $regex: searchKey, $options: "i" } },
              { sku: { $regex: searchKey, $options: "i" } },
              { category: { $regex: searchKey, $options: "i" } },
              { brand: { $regex: searchKey, $options: "i" } },
              { vendorName: { $regex: searchKey, $options: "i" } },
              { createdByUser: { $regex: searchKey, $options: "i" } },
              { updatedByUser: { $regex: searchKey, $options: "i" } },
            ],
          },
        });
      }

      // Count pipeline
      const countPipeline = [...pipeline, { $count: "total" }];

      // Pagination
      pipeline.push(
        { $sort: { updatedAt: -1 } },
        { $skip: page * pageSize },
        { $limit: pageSize },
      );

      console.log("queryObj:", queryObj);
      console.log("pipeline:", JSON.stringify(pipeline, null, 2));

      const rows = await Product.aggregate(pipeline);
      const countResult = await Product.aggregate(countPipeline);

      const totalRecords = countResult.length > 0 ? countResult[0].total : 0;

      UtilController.sendSuccess(req, res, next, {
        rows,
        pages: Math.ceil(totalRecords / pageSize),
        filterRecords: totalRecords,
        message: "success",
        responseCode: returnCode.validSession,
      });
    } catch (err) {
      console.log("err:", err);
      UtilController.sendError(req, res, next, err);
    }
  },

  deleteProduct: async (req, res, next) => {
    try {
      const { productIds } = req.body;
      const userId = req.user.userId;

      if (!userId) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Vendor id is required",
        });
      }

      if (!Array.isArray(productIds) || productIds.length === 0) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Product id(s) are required",
        });
      }

      const result = await Product.updateMany(
        { _id: { $in: productIds }, vendor: userId, active: true },
        {
          $set: {
            active: false,
            updatedBy: userId,
            updatedAt: Math.floor(Date.now() / 1000),
          },
        },
      );

      if (result.matchedCount === 0) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.dataNotFound,
          message: "Product not found",
        });
      }

      let responseCode = returnCode.validSession;
      UtilController.sendSuccess(req, res, next, {
        responseCode,
        message: "Product deleted successfully",
        data: "",
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },
};

const { returnCode } = require("../../../config/responseCode");
const User = require("../../model/User");
const Campaign = require("../../model/campaign");
const Order = require("../../model/order");
const Organization = require("../../model/organization");
const Product = require("../../model/product");
const UtilController = require("../services/UtilController");
const mongoose = require("mongoose");

const toObjectId = (id) => new mongoose.Types.ObjectId(id.toString());

module.exports = {
  getDashboard: async (req, res, next) => {
    try {
      const userType = req.user.userType;
      const userId = req.user.userId;
      const { organizationId } = req.body;
      const now = Math.floor(Date.now() / 1000);
      console.log(userType);
      // ── SUPERADMIN ──────────────────────────────────────────
      if (userType === "admin") {
        const [
          totalOrganizations,
          totalVendors,
          totalHRs,
          totalEmployees,
          totalProducts,
          totalCampaigns,
          activeCampaigns,
          orderStats,
          ordersByStatus,
          recentOrganizations,
          recentCampaigns,
          topOrganizationsByOrders,
          monthlyOrderTrend,
        ] = await Promise.all([
          Organization.countDocuments({ active: true }),
          User.countDocuments({ active: true, userType: "vendor" }),
          User.countDocuments({ active: true, userType: "hr" }),
          User.countDocuments({ active: true, userType: "employee" }),
          Product.countDocuments({ active: true }),
          Campaign.countDocuments({ active: true }),
          Campaign.countDocuments({
            active: true,
            status: "active",
            campaignDeadline: { $gte: now },
          }),
          Order.aggregate([
            { $match: { active: true } },
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: "$price" },
                avgOrderValue: { $avg: "$price" },
              },
            },
          ]),
          Order.aggregate([
            { $match: { active: true } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ]),
          Organization.find(
            { active: true },
            { name: 1, email: 1, city: 1, logo: 1, createdAt: 1 },
          )
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),
          Campaign.aggregate([
            { $match: { active: true } },
            {
              $lookup: {
                from: "organizations",
                localField: "organization",
                foreignField: "_id",
                as: "orgDetails",
              },
            },
            {
              $project: {
                campaignName: 1,
                occasion: 1,
                status: 1,
                giftingModel: 1,
                totalEmployees: 1,
                giftsSelected: 1,
                createdAt: 1,
                organizationName: { $arrayElemAt: ["$orgDetails.name", 0] },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
          ]),
          Order.aggregate([
            { $match: { active: true } },
            {
              $group: {
                _id: "$organization",
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: "$price" },
              },
            },
            {
              $lookup: {
                from: "organizations",
                localField: "_id",
                foreignField: "_id",
                as: "orgDetails",
              },
            },
            {
              $project: {
                totalOrders: 1,
                totalRevenue: 1,
                organizationName: { $arrayElemAt: ["$orgDetails.name", 0] },
                organizationLogo: { $arrayElemAt: ["$orgDetails.logo", 0] },
              },
            },
            { $sort: { totalOrders: -1 } },
            { $limit: 5 },
          ]),
          Order.aggregate([
            {
              $match: {
                active: true,
                createdAt: { $gte: now - 6 * 30 * 24 * 60 * 60 },
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m",
                    date: { $toDate: { $multiply: ["$createdAt", 1000] } },
                  },
                },
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: "$price" },
              },
            },
            { $sort: { _id: 1 } },
          ]),
        ]);

        const orderStatusMap = {};
        ordersByStatus.forEach((s) => {
          orderStatusMap[s._id] = s.count;
        });
        const oStats = orderStats?.[0] || {};

        return UtilController.sendSuccess(req, res, next, {
          responseCode: returnCode.validSession,
          message: "Dashboard fetched successfully",
          data: {
            userType,
            summary: {
              totalOrganizations,
              totalVendors,
              totalHRs,
              totalEmployees,
              totalProducts,
              totalCampaigns,
              activeCampaigns,
              totalOrders: oStats.totalOrders || 0,
              totalRevenue: oStats.totalRevenue || 0,
              avgOrderValue: Math.round(oStats.avgOrderValue || 0),
            },
            ordersByStatus: {
              pending: orderStatusMap["pending"] || 0,
              processing: orderStatusMap["processing"] || 0,
              shipped: orderStatusMap["shipped"] || 0,
              delivered: orderStatusMap["delivered"] || 0,
              cancelled: orderStatusMap["cancelled"] || 0,
            },
            recentOrganizations,
            recentCampaigns,
            topOrganizationsByOrders,
            monthlyOrderTrend,
          },
        });
      }

      // ── HR ──────────────────────────────────────────────────
      if (userType === "HR") {
        if (!organizationId) {
          return UtilController.sendError(req, res, next, {
            responseCode: returnCode.invalidParams,
            message: "organizationId is required for HR dashboard",
          });
        }

        const orgId = toObjectId(organizationId);

        const [
          organization,
          totalEmployees,
          totalCampaigns,
          activeCampaigns,
          completedCampaigns,
          campaignStats,
          orderStats,
          ordersByStatus,
          recentCampaigns,
          topProducts,
        ] = await Promise.all([
          Organization.findById(organizationId, {
            name: 1,
            logo: 1,
            email: 1,
            city: 1,
            state: 1,
            mobileNumber: 1,
          }).lean(),
          User.countDocuments({
            organizationId,
            userType: "employee",
            active: true,
          }),
          Campaign.countDocuments({
            organizationId: organizationId,
            active: true,
          }),
          Campaign.countDocuments({
            organization: organizationId,
            active: true,
            status: "active",
            campaignDeadline: { $gte: now },
          }),
          Campaign.countDocuments({
            organization: organizationId,
            active: true,
            status: "completed",
          }),
          Campaign.aggregate([
            { $match: { organization: orgId, active: true } },
            {
              $group: {
                _id: null,
                totalEmployeesInvited: { $sum: "$totalEmployees" },
                totalGiftsSelected: { $sum: "$giftsSelected" },
                totalOrdersShipped: { $sum: "$ordersShipped" },
                totalDelivered: { $sum: "$deliveredOrders" },
                totalBudgetAllocated: {
                  $sum: {
                    $multiply: ["$budgetPerEmployee", "$totalEmployees"],
                  },
                },
              },
            },
          ]),
          Order.aggregate([
            { $match: { organization: orgId, active: true } },
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalBudgetUsed: { $sum: "$price" },
              },
            },
          ]),
          Order.aggregate([
            { $match: { organization: orgId, active: true } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ]),
          Campaign.find(
            { organization: organizationId, active: true },
            {
              campaignName: 1,
              occasion: 1,
              status: 1,
              giftingModel: 1,
              totalEmployees: 1,
              giftsSelected: 1,
              deliveredOrders: 1,
              budgetPerEmployee: 1,
              campaignDeadline: 1,
              createdAt: 1,
            },
          )
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),
          Order.aggregate([
            { $match: { organization: orgId, active: true } },
            {
              $group: {
                _id: "$product",
                totalOrders: { $sum: 1 },
                productName: { $first: "$productSnapshot.name" },
                thumbnailImage: { $first: "$productSnapshot.thumbnailImage" },
              },
            },
            { $sort: { totalOrders: -1 } },
            { $limit: 5 },
          ]),
        ]);

        const orderStatusMap = {};
        ordersByStatus.forEach((s) => {
          orderStatusMap[s._id] = s.count;
        });

        const cStats = campaignStats?.[0] || {};
        const oStats = orderStats?.[0] || {};
        const pendingSelections = Math.max(
          (cStats.totalEmployeesInvited || 0) -
            (cStats.totalGiftsSelected || 0),
          0,
        );

        return UtilController.sendSuccess(req, res, next, {
          responseCode: returnCode.validSession,
          message: "Dashboard fetched successfully",
          data: {
            userType,
            organization: {
              name: organization?.name || "",
              logo: organization?.logo || "",
              email: organization?.email || "",
              city: organization?.city || "",
              state: organization?.state || "",
              mobileNumber: organization?.mobileNumber || "",
            },
            summary: {
              totalEmployees,
              totalCampaigns,
              activeCampaigns,
              completedCampaigns,
              totalGiftsSelected: cStats.totalGiftsSelected || 0,
              pendingSelections,
              totalOrdersShipped: cStats.totalOrdersShipped || 0,
              totalDelivered: cStats.totalDelivered || 0,
              totalBudgetAllocated: cStats.totalBudgetAllocated || 0,
              totalBudgetUsed: oStats.totalBudgetUsed || 0,
              totalOrders: oStats.totalOrders || 0,
            },
            ordersByStatus: {
              pending: orderStatusMap["pending"] || 0,
              processing: orderStatusMap["processing"] || 0,
              shipped: orderStatusMap["shipped"] || 0,
              delivered: orderStatusMap["delivered"] || 0,
              cancelled: orderStatusMap["cancelled"] || 0,
            },
            recentCampaigns,
            topProducts,
          },
        });
      }

      // ── VENDOR ──────────────────────────────────────────────
      if (userType === "vendor") {
        const vendorId = toObjectId(userId);

        const [
          totalProducts,
          activeProducts,
          outOfStockProducts,
          lowStockProducts,
          productStats,
          orderStats,
          ordersByStatus,
          recentOrders,
          topSellingProducts,
        ] = await Promise.all([
          Product.countDocuments({ vendor: userId, active: true }),
          Product.countDocuments({
            vendor: userId,
            active: true,
            inStock: true,
          }),
          Product.countDocuments({
            vendor: userId,
            active: true,
            inStock: false,
          }),
          Product.countDocuments({
            vendor: userId,
            active: true,
            inStock: true,
            $expr: { $lte: ["$stockQuantity", "$lowStockThreshold"] },
          }),
          Product.aggregate([
            { $match: { vendor: vendorId, active: true } },
            {
              $group: {
                _id: null,
                totalStockUnits: { $sum: "$stockQuantity" },
                totalCatalogueValue: {
                  $sum: { $multiply: ["$price", "$stockQuantity"] },
                },
                avgPrice: { $avg: "$price" },
              },
            },
          ]),
          Order.aggregate([
            { $match: { vendor: vendorId, active: true } },
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: "$price" },
              },
            },
          ]),
          Order.aggregate([
            { $match: { vendor: vendorId, active: true } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ]),
          Order.aggregate([
            { $match: { vendor: vendorId, active: true } },
            {
              $lookup: {
                from: "users",
                localField: "employee",
                foreignField: "_id",
                as: "employeeDetails",
              },
            },
            {
              $project: {
                orderId: 1,
                status: 1,
                price: 1,
                createdAt: 1,
                "productSnapshot.name": 1,
                "productSnapshot.thumbnailImage": 1,
                "deliveryAddress.city": 1,
                employeeName: {
                  $arrayElemAt: ["$employeeDetails.fullName", 0],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
          ]),
          Order.aggregate([
            { $match: { vendor: vendorId, active: true } },
            {
              $group: {
                _id: "$product",
                totalSold: { $sum: 1 },
                totalRevenue: { $sum: "$price" },
                productName: { $first: "$productSnapshot.name" },
                thumbnailImage: { $first: "$productSnapshot.thumbnailImage" },
              },
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
          ]),
        ]);

        const orderStatusMap = {};
        ordersByStatus.forEach((s) => {
          orderStatusMap[s._id] = s.count;
        });
        const pStats = productStats?.[0] || {};
        const oStats = orderStats?.[0] || {};

        return UtilController.sendSuccess(req, res, next, {
          responseCode: returnCode.validSession,
          message: "Dashboard fetched successfully",
          data: {
            userType,
            products: {
              totalProducts,
              activeProducts,
              outOfStockProducts,
              lowStockProducts,
              totalStockUnits: pStats.totalStockUnits || 0,
              totalCatalogueValue: pStats.totalCatalogueValue || 0,
              avgPrice: Math.round(pStats.avgPrice || 0),
            },
            orders: {
              totalOrders: oStats.totalOrders || 0,
              totalRevenue: oStats.totalRevenue || 0,
            },
            ordersByStatus: {
              pending: orderStatusMap["pending"] || 0,
              processing: orderStatusMap["processing"] || 0,
              shipped: orderStatusMap["shipped"] || 0,
              delivered: orderStatusMap["delivered"] || 0,
              cancelled: orderStatusMap["cancelled"] || 0,
            },
            recentOrders,
            topSellingProducts,
          },
        });
      }

      // ── UNKNOWN ROLE ────────────────────────────────────────
      return UtilController.sendError(req, res, next, {
        responseCode: returnCode.invalidParams,
        message: "Dashboard not available for this user type",
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },
};

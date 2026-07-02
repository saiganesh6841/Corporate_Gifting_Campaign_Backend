const { returnCode } = require("../../../config/responseCode");
const User = require("../../model/User");
const Campaign = require("../../model/campaign");
const Order = require("../../model/order");
const Organization = require("../../model/organization");
const UtilController = require("../services/UtilController");

module.exports = {
  validateToken: async (req, res, next) => {
    try {
      const { token } = req.params;

      if (!token) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Token is required",
        });
      }

      const now = Math.floor(Date.now() / 1000);

      const employee = await User.findOne(
        {
          linkToken: token,
          userType: "employee",
          active: true,
        },
        {
          _id: 1,
          userId: 1,
          fullName: 1,
          email: 1,
          mobileNumber: 1,
          address: 1,
          city: 1,
          state: 1,
          pincode: 1,
          tokenExpiresAt: 1,
          lastCampaignId: 1,
          organizationId: 1,
          organizationName: 1,
        },
      ).lean();

      if (!employee) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Invalid gift selection link",
        });
      }

      if (employee.tokenExpiresAt && employee.tokenExpiresAt < now) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "This gift selection link has expired.",
        });
      }

      // fetch campaign — no populate, just plain ObjectId fields
      const campaign = await Campaign.findOne(
        {
          _id: employee.lastCampaignId,
          active: true,
        },
        {
          _id: 1,
          campaignId: 1,
          campaignName: 1,
          occasion: 1,
          giftingModel: 1,
          budgetPerEmployee: 1,
          campaignDeadline: 1,
          deliveryWindowStart: 1,
          deliveryWindowEnd: 1,
          emailTextInformation: 1,
          message: 1,
          products: 1,
          organization: 1,
          hr: 1,
        },
      ).lean();

      if (!campaign) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.dataNotFound,
          message: "Campaign not found.",
        });
      }

      if (
        campaign.campaignDeadline &&
        Number(campaign.campaignDeadline) < now
      ) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "The gift selection period has ended.",
        });
      }

      // fetch organization + hr separately — run in parallel
      const [organization, hr, existingOrder] = await Promise.all([
        Organization.findById(campaign.organization, {
          name: 1,
          logo: 1,
        }).lean(),
        User.findById(campaign.hr, {
          fullName: 1,
          email: 1,
          mobileNumber: 1,
        }).lean(),
        Order.findOne({
          campaign: campaign._id,
          employee: employee._id,
          active: true,
        }).lean(),
      ]);

      return UtilController.sendSuccess(req, res, next, {
        responseCode: returnCode.validSession,
        message: "Token validated successfully",
        data: {
          employee: {
            _id: employee._id,
            userId: employee.userId,
            fullName: employee.fullName || "",
            email: employee.email || "",
            mobileNumber: employee.mobileNumber || "",
            address: employee.address || "",
            city: employee.city || "",
            state: employee.state || "",
            pincode: employee.pincode || "",
          },
          campaign: {
            _id: campaign._id,
            campaignId: campaign.campaignId,
            campaignName: campaign.campaignName || "",
            occasion: campaign.occasion || "",
            giftingModel: campaign.giftingModel || "",
            budgetPerEmployee: campaign.budgetPerEmployee || 0,
            campaignDeadline: campaign.campaignDeadline || 0,
            deliveryWindowStart: campaign.deliveryWindowStart || 0,
            deliveryWindowEnd: campaign.deliveryWindowEnd || 0,
            message: campaign.message || "",
            organizationName:
              organization?.name || employee.organizationName || "",
            organizationLogo: organization?.logo || "",
            hrName: hr?.fullName || "",
            hrEmail: hr?.email || "",
            hrMobileNumber: hr?.mobileNumber || "",
            products: campaign.products || [],
          },
          existingOrder: existingOrder
            ? {
                _id: existingOrder._id,
                orderId: existingOrder.orderId,
                status: existingOrder.status,
                productSnapshot: existingOrder.productSnapshot,
                deliveryAddress: existingOrder.deliveryAddress,
                createdAt: existingOrder.createdAt,
              }
            : null,
        },
      });
    } catch (err) {
      console.log("validateToken Error:", err);
      return UtilController.sendError(req, res, next, err);
    }
  },

  placeOrder: async (req, res, next) => {
    try {
      const {
        token,
        productId,
        fullName,
        mobileNumber,
        addressLine,
        city,
        state,
        pincode,
        landmark,
      } = req.body;

      if (!token) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Token is required",
        });
      }
      if (!productId) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Product selection is required",
        });
      }
      if (!fullName || !mobileNumber || !addressLine || !city || !pincode) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "All delivery address fields are required",
        });
      }

      const now = Math.floor(Date.now() / 1000);

      const employee = await User.findOne(
        { linkToken: token, userType: "employee", active: true },
        { _id: 1, organizationId: 1, lastCampaignId: 1, tokenExpiresAt: 1 },
      ).lean();

      if (!employee) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Invalid link",
        });
      }

      if (employee.tokenExpiresAt && employee.tokenExpiresAt < now) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Link expired",
        });
      }

      const existingOrder = await Order.findOne({
        campaign: employee.lastCampaignId,
        employee: employee._id,
        active: true,
      }).lean();

      if (existingOrder) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.duplicate,
          message: "You have already placed your gift order",
        });
      }

      const campaign = await Campaign.findOne(
        { _id: employee.lastCampaignId, active: true },
        {
          products: 1,
          budgetPerEmployee: 1,
          campaignDeadline: 1,
          organization: 1,
        },
      ).lean();

      if (!campaign) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.dataNotFound,
          message: "Campaign not found",
        });
      }

      if (campaign.campaignDeadline && campaign.campaignDeadline < now) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Campaign has ended",
        });
      }

      const campaignProduct = campaign.products?.find(
        (p) => p?.product?.toString() === productId?.toString(),
      );

      if (!campaignProduct) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Selected product is not part of this campaign",
        });
      }

      const productPrice =
        campaignProduct.discountPrice || campaignProduct.price;

      if (productPrice > campaign.budgetPerEmployee) {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidParams,
          message: "Selected product exceeds campaign budget",
        });
      }

      await User.updateOne(
        { _id: employee._id },
        {
          $set: {
            address: addressLine,
            city,
            state: state || "",
            pincode,
            updatedAt: now,
          },
        },
      );

      const order = new Order({
        organization: campaign.organization,
        campaign: campaign._id,
        employee: employee._id,
        product: productId,
        vendor: campaignProduct.vendor,
        productSnapshot: {
          name: campaignProduct.name || "",
          price: campaignProduct.price || 0,
          discountPrice: campaignProduct.discountPrice || 0,
          thumbnailImage: campaignProduct.thumbnailImage || "",
        },
        deliveryAddress: {
          fullName,
          mobileNumber,
          addressLine,
          city,
          state: state || "",
          pincode,
          landmark: landmark || "",
        },
        quantity: 1,
        price: productPrice,
        status: "pending",
        active: true,
        createdBy: employee._id,
        updatedBy: employee._id,
      });

      await order.save();
      order.orderId = order._id.toString();
      await order.save();

      await Campaign.updateOne(
        { _id: campaign._id },
        { $inc: { giftsSelected: 1 } },
      );

      let responseCode = returnCode.validSession;
      UtilController.sendSuccess(req, res, next, {
        responseCode,
        message: "Order placed successfully",
        data: {
          orderId: order._id,
          productName: campaignProduct.name || "",
          status: order.status,
          deliveryAddress: order.deliveryAddress,
        },
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },
};

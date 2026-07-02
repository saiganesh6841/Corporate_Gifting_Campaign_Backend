const Organization = require("../../model/organization");
const UtilController = require("../services/UtilController");
const { returnCode } = require("../../../config/responseCode");

module.exports = {
  organizationDropdown: async (req, res, next) => {
    try {
      const { keyword = "" } = req.body;

      const filter = {
        active: true,
        ...(keyword && {
          name: { $regex: keyword, $options: "i" },
        }),
      };

      const organizations = await Organization.find(filter, {
        _id: 1,
        name: 1,
        email: 1,
      })
        .sort({ name: 1 })
        .lean();

      let responseCode = returnCode.validSession;

      UtilController.sendSuccess(req, res, next, {
        responseCode,
        message: "success",
        data: organizations,
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },
};

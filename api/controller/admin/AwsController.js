const UtilController = require("../services/UtilController");

module.exports = {
  uploadFiles: async (req, res, next) => {
    try {
      UtilController.uploadFiles(req, res, next);
    } catch (err) {
      console.log("uploadFiles -catch");
      console.log(err);
      UtilController.sendError(req, res, next, err);
    }
  },
};

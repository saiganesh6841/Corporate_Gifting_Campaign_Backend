const UtilController = require("../services/UtilController");

module.exports = {
  uploadFiles: async (req, res, next) => {
    console.log(`uploadFiles`);
    try {
      UtilController.uploadFiles(req, res, next);
    } catch (err) {
      console.log("uploadFiles -catch");
      console.log(err);
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },
};

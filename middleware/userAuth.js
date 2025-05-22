const {
  verifyToken,
  addUserToReq,
} = require("../api/controller/services/TokenController");
const UtilController = require("../api/controller/services/UtilController");
const responseCode = require("../config/responseCode").returnCode;

module.exports = {
  userAuth: async (req, res, next) => {
    const token = req.headers.authtoken;

    if (token) {
      try {
        const decoded = verifyToken(token);
        const userId = decoded?.uid;
        addUserToReq(req, { userId });
        next();
      } catch (error) {
        let message = "Not authorized, invalid token";

        if (error.message === "TokenExpired") {
          message = "Not authorized, token expired";
        }

        return UtilController.sendError(req, res, next, {
          responseCode: responseCode.unAuthorized,
          message,
        });
      }
    } else {
      return UtilController.sendError(req, res, next, {
        responseCode: responseCode.unAuthorized,
        message: "Not authorized, no token",
      });
    }
  },
};

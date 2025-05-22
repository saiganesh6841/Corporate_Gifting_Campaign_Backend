const passwordSecretKey = "Admin@2O$0";
const jwt = require("jsonwebtoken");

module.exports = {
  verifyToken: (token) => {
    try {
      const decoded = jwt.verify(token, passwordSecretKey);
      return decoded;
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        throw new Error("TokenExpired");
      } else {
        throw new Error("InvalidToken");
      }
    }
  },

  createToken: (uid, expiresIn = 604800) => {
    try {
      var token = jwt.sign({ uid }, passwordSecretKey, {
        expiresIn: expiresIn, //sec
      });
      return token;
    } catch (error) {
      // console.error("error in create token----", error);
      return error;
    }
  },
  addUserToReq(req, userObj) {
    try {
      req.user = { ...req?.user, ...userObj };
      return req;
    } catch (error) {
      // console.error("error adduserTkn-", error);
      return error;
    }
  },
};

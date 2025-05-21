const User = require("../../model/User");
const authorization = require("../../../config/authorization");
const responseCode = require("../../../config/responseCode");
const { httpReturnCode } = require("../../../config/httpResponseCode");
const UtilController = require("../services/UtilController");
const { addUserToReq, verifyToken } = require("./TokenController");

const adminAuthList = [];
const usersAuthList = [];
const indexAuthList = [];
const languageList = [];
for (var i = 0; i < authorization.admin.authNotRequire.length; i++) {
  adminAuthList.push("/admin" + authorization.admin.authNotRequire[i]);
}
for (var x = 0; x < authorization.admin.language.length; x++) {
  languageList.push("/admin" + authorization.admin.language[x]);
}
for (var i = 0; i < authorization.user.authNotRequire.length; i++) {
  usersAuthList.push("/user" + authorization.user.authNotRequire[i]);
}
for (var y = 0; y < authorization.user.language.length; y++) {
  languageList.push("/user" + authorization.user.language[y]);
}
for (var k = 0; k < authorization.index.authNotRequire.length; k++) {
  indexAuthList.push(authorization.index.authNotRequire[k]);
}
for (var z = 0; z < authorization.index.language.length; z++) {
  languageList.push(authorization.index.language[z]);
}

const extractTokenDetails = (req, res, next) => {
  try {
    let token = req.headers.authtoken;
    if (!UtilController.isEmpty(token)) {
      let authtokenResp = verifyToken(token);
      let userId = authtokenResp?.uid;
      addUserToReq(req, { userId });
    }
    next();
  } catch (error) {
    // console.log(error);
    next();
  }
};

module.exports = {
  checkRequestAuth: async function (req, res, next) {
    
    try {
      // Uses inefficient cache policy on static assets. this is added to increase page rendering speed
      // res.set('Cache-Control', 'public, max-age=31557600');
      //res.set('Cache-Control', 'public, max-age=2592000');
      // set the language if request requires it
      // if (languageList.indexOf(req.path) > -1) {
      // }
      // adding aws credentials in request to get it in browser side. no need to add in each router
      //res.locals.awsCognito = connection.aws.CognitoIdentityCredentials;
      // check here, authorization is there or not

      extractTokenDetails(req, res, () => {});

      if (
        req.path.startsWith("/admin") &&
        adminAuthList.indexOf(req.path) <= -1
      ) {
        module.exports.checkAdminRequestAuth(req, res, next);
      } else if (
        req.path.startsWith("/user") &&
        usersAuthList.indexOf(req.path) < 0
      ) {
        
        // module.exports.checkAdminRequestAuth(req, res, next);
        module.exports.verifyAuthTokenForApiRequest(req, res, next);
      } else if (
        req.path.startsWith("/user") &&
        // usersAuthList.indexOf(req.path) > -1
        usersAuthList.indexOf(req.path) < 0
      ) {
        if (
          !UtilController.isEmpty(req.headers.authtoken)
        ) {
          return module.exports.verifyAuthTokenForApiRequest(req, res, next);
        }
        next();
      } else {
        next();
      }
    } catch (err) {
      // console.error(err);
    }
  },
  verifyAuthTokenForApiRequest: async function (req, res, next) {
    try {
      if (UtilController.isEmpty(req.headers.authtoken)) {
        return UtilController.sendSuccess(
          req,
          res,
          next,
          {
            responseCode: responseCode.returnCode.invalidSession,
            result: {
              message: "authtoken not present or empty in headers",
            },
          },
          httpReturnCode.unauthorized
        );
      }
      //verify auth token
      let authtoken = req.headers.authtoken;
      let authtokenResp = verifyToken(authtoken);
      // console.log("authtoken checker resp=", authtokenResp);
      if (authtokenResp instanceof Error) {
        // console.log(
        //   "authtokenResp is error---",
        //   authtokenResp.name,
        //   authtokenResp.message
        // );
        return UtilController.sendSuccess(
          req,
          res,
          next,
          {
            responseCode: responseCode.returnCode.invalidToken,
            result: {
              message: `error verify authtoken: ${authtokenResp.name}`,
            },
          },
          httpReturnCode.unauthorized
        );
      }

      let userId = authtokenResp?.uid;
      // console.log(userId)
      let userResp = await User.findOne({ active: true, _id: userId })
        .select("userType")
        .lean();
      let userType = userResp?.userType;
      addUserToReq(req, { userId, userType });

      return next();
    } catch (err) {
      // console.log("error in verifyToken mw--", err);
      UtilController.sendSuccess(
        req,
        res,
        next,
        {
          result: `err in verify tkn_mv: ${err?.message}`,
          responseCode: responseCode.returnCode.invalidSession,
        },
        httpReturnCode.unauthorized
      );
    }
  },
  // verifyAuthTokenForApiRequest: async function (req, res, next) {
  //   try {
  //     // Check if `authtoken` is present
  //     if (UtilController.isEmpty(req.headers.authtoken)) {
  //       return UtilController.sendSuccess(
  //         req,
  //         res,
  //         next,
  //         {
  //           responseCode: responseCode.returnCode.invalidSession,
  //           result: {
  //             message: "authtoken not present or empty in headers",
  //           },
  //         },
  //         httpReturnCode.unauthorized
  //       );
  //     }

  //     // Check if `deviceType` is present
  //     if (UtilController.isEmpty(req.headers.devicetype)) {
  //       return UtilController.sendSuccess(
  //         req,
  //         res,
  //         next,
  //         {
  //           responseCode: responseCode.returnCode.invalidRequest,
  //           result: {
  //             message: "devicetype not present or empty in headers",
  //           },
  //         },
  //         httpReturnCode.badRequest
  //       );
  //     }

  //     // Validate `deviceType`
  //     const validDeviceTypes = ["mobile", "web"];
  //     const deviceType = req.headers.devicetype.toLowerCase();

  //     if (!validDeviceTypes.includes(deviceType)) {
  //       return UtilController.sendSuccess(
  //         req,
  //         res,
  //         next,
  //         {
  //           responseCode: responseCode.returnCode.invalidRequest,
  //           result: {
  //             message: `Invalid deviceType: ${deviceType}`,
  //           },
  //         },
  //         httpReturnCode.badRequest
  //       );
  //     }

  //     // Verify auth token
  //     const authtoken = req.headers.authtoken;
  //     const authtokenResp = verifyToken(authtoken);

  //     if (authtokenResp instanceof Error) {
  //       console.log(
  //         "authtokenResp is error---",
  //         authtokenResp.name,
  //         authtokenResp.message
  //       );
  //       return UtilController.sendSuccess(
  //         req,
  //         res,
  //         next,
  //         {
  //           responseCode: responseCode.returnCode.invalidToken,
  //           result: {
  //             message: `error verify authtoken: ${authtokenResp.name}`,
  //           },
  //         },
  //         httpReturnCode.unauthorized
  //       );
  //     }

  //     // Extract user info and add to request
  //     const userId = authtokenResp?.uid;
  //     const userResp = await User.findOne({ active: true, _id: userId })
  //       .select("userType")
  //       .lean();
  //     const userType = userResp?.userType;
  //     addUserToReq(req, { userId, userType, deviceType });

  //     // Proceed to the next middleware
  //     return next();
  //   } catch (err) {
  //     console.log("error in verifyToken mw--", err);
  //     UtilController.sendSuccess(
  //       req,
  //       res,
  //       next,
  //       {
  //         result: `err in verify tkn_mv: ${err?.message}`,
  //         responseCode: responseCode.returnCode.invalidSession,
  //       },
  //       httpReturnCode.unauthorized
  //     );
  //   }
  // },

  checkAdminRequestAuth: async function (req, res, next) {
    try {
      if (
        req.session.isForgotPassword === true &&
        req.path.includes("update/password")
      ) {
        next();
      } else {
        if (
          req.session.isForgotPassword === true &&
          (typeof req.session.userId === "undefined" ||
            req.session.userId.length === null ||
            req.session.userId.length === 0)
        ) {
          UtilController.sendSuccess(req, res, next, {
            responseCode: 108,
          });
        } else {
          next();
        }
      }
      //res.locals.authenticated = true;
      // let userInfo = ""; //await Admin.findById(req.session.userId).populate('permission').select('name active profileImg mobileNo email status isSuperAdmin center').lean();
      // if (userInfo !== null && userInfo.isSuperAdmin) {
      //   // if user is super admin then controller will come here, in that case list all center for this user
      //   userInfo['center'] = await Center.find({
      //     active: true
      //   }).select('name');
      // }
      // res.locals.user = userInfo;
    } catch (err) {
      UtilController.sendError(req, res, next, err);
    }
  },
  // user each request has to validate with respect to session, if user open any url or page, should be under controller
  checkUsersRequestAuth: async function (req, res, next) {
    // if (!(UtilController.isEmpty(req.session.userId) || UtilController.isEmpty(req.session.employeeId))) {
    if (UtilController.isEmpty(req.session.userId)) {
      UtilController.sendSuccess(req, res, next, {
        responseCode: 108,
      });
    }
    //  else if (req.session.remainingValidityAmount <= 0) {
    //   UtilController.sendSuccess(req, res, next, {
    //     responseCode: responseCode.returnCode.notSubscribed,
    //   });
    // }
    else {
      next();
    }
    //res.locals.authenticated = true;
    //  res.locals.user = await Admin.findById(req.session.userId).select('name active profileImg mobileNo email status');
  },
  checkIndexRequestAuth: async function (req, res, next) {
    try {
    } catch (err) {
    } finally {
      next();
    }
  },
  attachUserInfo: async function (req, res, next) {
    try {
    } catch (err) {
      console.error(err);
    }
  },
};

module.exports = {
  admin: {
    authNotRequire: [
      // "/admin",
      "/accountLogin",
      "/verifyOtp",
      "/create/user",
      "/create/project",
    ],
    language: [],
  },
  user: {
    authNotRequire: ["/home", "/accountLogin", "/verify/otp", "/upload/files"],
    language: [],
  },
  index: {
    authNotRequire: ["/", "/config/aws"],
    language: [],
  },
};

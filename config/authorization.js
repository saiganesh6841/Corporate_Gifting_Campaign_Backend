module.exports = {
  admin: {
    authNotRequire: [
      // "/admin",
      "/accountLogin",
      "/verifyOtp",
      "/create/user",
      "/create/project",
      "/upload/file",
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

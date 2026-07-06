module.exports = {
  admin: {
    authNotRequire: [
      // "/admin",
      "/accountLogin",
      "/verifyOtp",
      "/create/user",
      "/create/project",
      "/upload/file",
      "/gift/validate-token",
      "/gift/place-order",
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

module.exports = {
  admin: {
    authNotRequire: ["/admin", "/accountLogin", "/verify/otp", "/create/user","/create/project" ],
    language: [],
  },
  user: {
    authNotRequire: ["/home", "/accountLogin", "/verify/otp", "/upload/file"],
    language: [],
  },
  index: {
    authNotRequire: ["/", "/config/aws"],
    language: [],
  },
};

const { returnCode } = require("../../../config/responseCode");
const User = require("../../model/User");
const UtilController = require("../services/UtilController")

module.exports = {
    accountLogin: async (req, res, next) => {
        try {
            const { email, password } = req.body

            if (UtilController.isEmpty(email)) {
                return UtilController.sendSuccess(req, res, next, {
                    responseCode: returnCode.invalidInput,
                    message: "email is  required",
                });
            }

            if (UtilController.isEmpty(password)) {
                return UtilController.sendSuccess(req, res, next, {
                    responseCode: returnCode.invalidInput,
                    message: "Password is required for email login",
                });
            }


            let user;
            user = await User.findOne({ email: email, active: true, }).lean();

            if (!user) {
                return UtilController.sendSuccess(req, res, next, {
                    responseCode: returnCode.emailNotFound,
                    message: "User not found or account is inactive",
                });
            }


            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                return UtilController.sendSuccess(req, res, next, {
                    responseCode: returnCode.invalidInput,
                    message: "Invalid password",
                });
            }

            









        } catch (err) {
            UtilController.sendError(req, res, next, err)
        }

    }
}
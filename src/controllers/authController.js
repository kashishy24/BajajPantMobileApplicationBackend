const authService = require("../services/authService");
const {
    successResponse,
    errorResponse
} = require("../middlewares/responseHandler");

const getUsers = async (req, res) => {
    try {
        const users = await authService.getUsers();

        return successResponse(
            res,
            users,
            "Users fetched successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );
    }
};

const login = async (req, res) => {
    try {

        const { username, password } = req.body;

        const user = await authService.login(
            username,
            password
        );

        return successResponse(
            res,
            user,
            "Login Success"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message,
            401
        );
    }
};

module.exports = {
    getUsers,
    login
};
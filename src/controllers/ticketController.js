const ticketService = require("../services/ticketService");

const {
    successResponse,
    errorResponse
} = require("../middlewares/responseHandler");

const getStations = async (req, res) => {

    try {

        const stations = await ticketService.getStations();

        return successResponse(
            res,
            stations,
            "Station List Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }

};

const getLines = async (req, res) => {

    try {

        const lines = await ticketService.getLines();

        return successResponse(
            res,
            lines,
            "Line List Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }

};

const getReasons = async (req, res) => {

    try {

        const reasons = await ticketService.getReasons();

        return successResponse(
            res,
            reasons,
            "Reason List Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }

};

const getRoles = async (req, res) => {

    try {

        const roles = await ticketService.getRoles();

        return successResponse(
            res,
            roles,
            "Role List Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }

};

const createTicket = async (req, res) => {

    try {

        const result = await ticketService.createTicket(req.body);

        return successResponse(
            res,
            result,
            "Ticket Created Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }

};

module.exports = {
    getStations,
    getLines,
    getReasons,
    getRoles,
    createTicket
};
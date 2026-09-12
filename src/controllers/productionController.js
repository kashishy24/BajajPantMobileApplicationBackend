const productionService = require("../services/productionService");

const {
    successResponse,
    errorResponse
} = require("../middlewares/responseHandler");


const getLatestTicketID = async (req, res) => {

    try {

        const data = await productionService.getLatestTicketID();

        return successResponse(
            res,
            data,
            "Latest Ticket ID Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getTicketReasons = async (req, res) => {

    try {

        const data = await productionService.getTicketReasons();

        return successResponse(
            res,
            data,
            "Ticket Reasons Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getTicketReasonRequiredFields = async (req, res) => {

    try {

        const {
            departmentId,
            reasonName
        } = req.query;

        if (
            departmentId === undefined ||
            !reasonName
        ) {
            return errorResponse(
                res,
                "DepartmentID and ReasonName are required"
            );
        }

        const data =
            await productionService.getTicketReasonRequiredFields(
                departmentId,
                reasonName
            );

        return successResponse(
            res,
            data,
            "Required Fields Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getDepartments = async (req, res) => {

    try {

        const data = await productionService.getDepartments();

        return successResponse(
            res,
            data,
            "Departments Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getOpenProductionTickets = async (req, res) => {

    try {

        const data =
            await productionService.getOpenProductionTickets();

        return successResponse(
            res,
            data,
            "Open Production Tickets Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getTicketDetails = async (req, res) => {

    try {

        const {
            ticketId
        } = req.params;

        if (!ticketId) {

            return errorResponse(
                res,
                "TicketID is required"
            );

        }

        const data =
            await productionService.getTicketDetails(ticketId);

        return successResponse(
            res,
            data,
            "Ticket Details Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getInspectionPoint = async (req, res) => {

    try {

        const data =
            await productionService.getInspectionPoint();

        return successResponse(
            res,
            data,
            "Inspection Point Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getInspectionDefects = async (req, res) => {

    try {

        const {
            inspectionPointId
        } = req.params;

        if (!inspectionPointId) {

            return errorResponse(
                res,
                "InspectionPointID is required"
            );

        }

        const data =
            await productionService.getInspectionDefects(
                inspectionPointId
            );

        return successResponse(
            res,
            data,
            "Inspection Defects Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

module.exports = {
    getLatestTicketID,
    getTicketReasons,
    getTicketReasonRequiredFields,
    getDepartments,
    getOpenProductionTickets,
    getTicketDetails,
    getInspectionPoint,
    getInspectionDefects
};
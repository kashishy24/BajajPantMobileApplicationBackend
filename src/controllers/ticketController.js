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

const getOpenMaterialTickets = async (req, res) => {

    try {

        const tickets = await ticketService.getOpenMaterialTickets();

        return successResponse(
            res,
            tickets,
            "Open Material Tickets Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }

};

const getOpenQualityTickets = async (req, res) => {

    try {

        const tickets = await ticketService.getOpenQualityTickets();

        return successResponse(
            res,
            tickets,
            "Open Quality Tickets Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }

};

const getOpenMaintenanceTickets = async (req, res) => {

    try {

        const tickets = await ticketService.getOpenMaintenanceTickets();

        return successResponse(
            res,
            tickets,
            "Open Maintenance Tickets Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }

};

const getOpenNotifications = async (req, res) => {

    try {

        const { userId } = req.query;

        if (!userId) {

            return errorResponse(
                res,
                "UserID is required"
            );

        }

        const notifications =
            await ticketService.getOpenNotifications(userId);

        return successResponse(
            res,
            notifications,
            "Open Notifications Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }

};

const closeNotifications = async (req, res) => {

    try {

        const { notificationIds } = req.body;

        if (
            !Array.isArray(notificationIds) ||
            notificationIds.length === 0
        ) {
            return errorResponse(
                res,
                "NotificationIDs are required"
            );
        }

        const invalidIds = notificationIds.some(
            id => !Number.isInteger(Number(id))
        );

        if (invalidIds) {
            return errorResponse(
                res,
                "NotificationIDs must contain valid numeric IDs"
            );
        }

        const notifications =
            await ticketService.closeNotifications(notificationIds);

        return successResponse(
            res,
            notifications,
            "Notification(s) Closed Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }

};

const createIPQCHold = async (req, res) => {

    try {

        const {
            ticketId,
            auditListId,
            auditPointId,
            auditListName,
            auditPointName,
            auditGroup,
            holdType,
            partId,
            planId,
            forwardQty,
            backwordQty,
            role,
            lineId,
            stationId,
            activityId,
            equipmentId,
            breakdownId,
            engineNo,
            expectedClosure,
            userId,
            actionBy
        } = req.body;


        /* =====================================================
           BASIC VALIDATION
           ===================================================== */

        if (!ticketId) {
            return errorResponse(
                res,
                "TicketID is required"
            );
        }

        if (!auditListId) {
            return errorResponse(
                res,
                "AuditListID is required"
            );
        }

        if (!auditPointId) {
            return errorResponse(
                res,
                "AuditPointID is required"
            );
        }

        if (!auditListName) {
            return errorResponse(
                res,
                "AuditListName is required"
            );
        }

        if (!auditPointName) {
            return errorResponse(
                res,
                "AuditPointName is required"
            );
        }

        if (!auditGroup) {
            return errorResponse(
                res,
                "AuditGroup is required"
            );
        }

        if (!holdType) {
            return errorResponse(
                res,
                "HoldType is required"
            );
        }

        if (!lineId) {
            return errorResponse(
                res,
                "LineID is required"
            );
        }

        if (!stationId) {
            return errorResponse(
                res,
                "StationID is required"
            );
        }

        if (!engineNo) {
            return errorResponse(
                res,
                "EngineNo is required"
            );
        }

        if (!userId) {
            return errorResponse(
                res,
                "UserID is required"
            );
        }

        if (!actionBy) {
            return errorResponse(
                res,
                "ActionBy is required"
            );
        }


        /* =====================================================
           SERVICE
           ===================================================== */

        const result = await ticketService.createIPQCHold({

            ticketId,

            auditListId,
            auditPointId,

            auditListName,
            auditPointName,

            auditGroup,
            holdType,

            partId,
            planId,

            forwardQty,
            backwordQty,

            role,

            lineId,
            stationId,

            activityId,
            equipmentId,
            breakdownId,

            engineNo,

            expectedClosure,

            userId,
            actionBy
        });


        return successResponse(
            res,
            result,
            "IPQC hold ticket created successfully"
        );

    } catch (error) {

        console.error(
            "createIPQCHold error:",
            error
        );

        return errorResponse(
            res,
            error.message || "Failed to create IPQC hold ticket"
        );
    }
};

module.exports = {
    getStations,
    getLines,
    getReasons,
    getRoles,
    createTicket,
    getOpenMaterialTickets,
    getOpenQualityTickets,
    getOpenMaintenanceTickets,
    getOpenNotifications,
    closeNotifications,
    createIPQCHold
};
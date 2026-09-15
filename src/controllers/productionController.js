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

const getReworkTakeInEngines = async (req, res) => {

    try {

        const data =
            await productionService.getReworkTakeInEngines();

        return successResponse(
            res,
            data,
            "Rework Take IN Engines Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getEngineTakeInDetails = async (req, res) => {

    try {

        const {
            engineNo,
            vrEngineNo
        } = req.query;

        if (!engineNo && !vrEngineNo) {

            return errorResponse(
                res,
                "EngineNo or VREngineNo is required"
            );

        }

        const data =
            await productionService.getEngineTakeInDetails(
                engineNo,
                vrEngineNo
            );

        return successResponse(
            res,
            data,
            "Engine Details Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const engineTakeIn = async (req, res) => {

    try {

        const {
            engineNo,
            takeINStation
        } = req.body;

        if (
            !engineNo ||
            takeINStation === undefined
        ) {

            return errorResponse(
                res,
                "EngineNo and TakeINStation are required"
            );

        }

        const data =
            await productionService.engineTakeIn(
                engineNo,
                takeINStation
            );

        return successResponse(
            res,
            "Engine Take IN Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getNonMesControlledMaterials = async (req, res) => {

    try {

        const {
            stationId,
            lineId
        } = req.query;

        if (
            stationId === undefined ||
            lineId === undefined
        ) {

            return errorResponse(
                res,
                "StationID and LineID are required"
            );

        }

        const data =
            await productionService.getNonMesControlledMaterials(
                stationId,
                lineId
            );

        return successResponse(
            res,
            data,
            "Non-MES Controlled Materials Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const createMaterialRequest = async (req, res) => {

    try {

        const {
            partId,
            stationId,
            lineId,
            planId
        } = req.body;

        if (
            !partId ||
            stationId === undefined ||
            lineId === undefined ||
            planId === undefined
        ) {

            return errorResponse(
                res,
                "PartID, StationID, LineID and PlanID are required"
            );

        }

        const data =
            await productionService.createMaterialRequest(
                partId,
                stationId,
                lineId,
                planId
            );

        return successResponse(
            res,
            data,
            "Material Request Created Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getProductionCallLogs = async (req, res) => {

    try {

        const data =
            await productionService.getProductionCallLogs();

        return successResponse(
            res,
            data,
            "Production Call Logs Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const acknowledgeProductionCall = async (req, res) => {

    try {

        const {
            rowId,
            lineId,
            stationId
        } = req.body;

        if (
            rowId === undefined ||
            lineId === undefined ||
            stationId === undefined
        ) {

            return errorResponse(
                res,
                "RowID, LineID and StationID are required"
            );

        }

        const data =
            await productionService.acknowledgeProductionCall(
                rowId,
                lineId,
                stationId
            );

        return successResponse(
            res,
            data,
            "Production Call Acknowledged Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const closeProductionCall = async (req, res) => {

    try {

        const {
            rowId,
            lineId,
            stationId
        } = req.body;

        if (
            rowId === undefined ||
            lineId === undefined ||
            stationId === undefined
        ) {

            return errorResponse(
                res,
                "RowID, LineID and StationID are required"
            );

        }

        const data =
            await productionService.closeProductionCall(
                rowId,
                lineId,
                stationId
            );

        return successResponse(
            res,
            data,
            "Production Call Closed Successfully"
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
    getInspectionDefects,
    getReworkTakeInEngines,
    getEngineTakeInDetails,
    engineTakeIn,
    getNonMesControlledMaterials,
    createMaterialRequest,
    getProductionCallLogs,
    acknowledgeProductionCall,
    closeProductionCall
};
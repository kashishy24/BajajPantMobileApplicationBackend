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

const notifySubmit = async (req, res) => {
    try {
        const {
            lineId,
            stationId,
            activityId,
            partId,
            equipmentId,
            breakdownId,
            engineNo,
            userId,
            reasonId,
            remark,
            expectedClosure,
            actionBy,
            role
        } = req.body;

        if (!lineId) {
            return errorResponse(res, "LineID is required");
        }

        if (!stationId) {
            return errorResponse(res, "StationID is required");
        }

        if (!userId) {
            return errorResponse(res, "UserID is required");
        }

        if (!reasonId) {
            return errorResponse(res, "ReasonID is required");
        }

        if (!actionBy) {
            return errorResponse(res, "ActionBy is required");
        }

        if (!role) {
            return errorResponse(res, "Role is required");
        }

        const result = await productionService.notifySubmit({
            lineId,
            stationId,
            activityId,
            partId,
            equipmentId,
            breakdownId,
            engineNo,
            userId,
            reasonId,
            remark,
            expectedClosure,
            actionBy,
            role
        });

        return successResponse(
            res,
            result,
            "Ticket notification submitted successfully"
        );

    } catch (error) {
        console.error("Notify Submit Error:", error);

        return errorResponse(
            res,
            error.message || "Failed to submit ticket notification"
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

const confirmEngineInspection = async (req, res) => {

    try {

        const {
            ticketId,
            auditGroup,
            holdType,
            partId,
            planId,
            forwardQty,
            backwordQty,
            inspectionDetails,
            userId
        } = req.body;


        // Basic validation
        if (
            ticketId === undefined ||
            auditGroup === undefined ||
            holdType === undefined ||
            userId === undefined
        ) {
            return errorResponse(
                res,
                "TicketID, AuditGroup, HoldType and UserID are required"
            );
        }


        // Validate inspection details
        if (
            !Array.isArray(inspectionDetails) ||
            inspectionDetails.length === 0
        ) {
            return errorResponse(
                res,
                "InspectionDetails are required"
            );
        }


        // Validate every inspection detail
        for (const detail of inspectionDetails) {

            if (
                detail.inspectionPointId === undefined ||
                detail.inspectionDefectId === undefined
            ) {
                return errorResponse(
                    res,
                    "InspectionPointID and InspectionDefectID are required for every inspection detail"
                );
            }

        }


        // Validate HoldType
        if (![1, 2, 3].includes(Number(holdType))) {

            return errorResponse(
                res,
                "Invalid HoldType. Allowed values are 1-Engine, 2-Batch, 3-Plan"
            );

        }


        // Engine Hold
        if (Number(holdType) === 1) {

            if (
                forwardQty === undefined ||
                backwordQty === undefined
            ) {
                return errorResponse(
                    res,
                    "ForwardQty and BackwordQty are required for Engine Hold"
                );
            }


            if (
                Number(forwardQty) < 0 ||
                Number(backwordQty) < 0
            ) {
                return errorResponse(
                    res,
                    "ForwardQty and BackwordQty cannot be negative"
                );
            }

        }


        // Batch Hold
        if (
            Number(holdType) === 2 &&
            !partId
        ) {

            return errorResponse(
                res,
                "PartID is required for Batch Hold"
            );

        }


        // Plan Hold
        if (
            Number(holdType) === 3 &&
            planId === undefined
        ) {

            return errorResponse(
                res,
                "PlanID is required for Plan Hold"
            );

        }


        const data =
            await productionService.confirmEngineInspection({

                ticketId,
                auditGroup,
                holdType,

                partId:
                    partId || null,

                planId:
                    planId === undefined
                        ? null
                        : planId,

                forwardQty:
                    forwardQty === undefined
                        ? 0
                        : forwardQty,

                backwordQty:
                    backwordQty === undefined
                        ? 0
                        : backwordQty,

                inspectionDetails,

                userId
            });


        return successResponse(
            res,
            data,
            "Engine Inspection Confirmed Successfully"
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
    notifySubmit,
    getOpenProductionTickets,
    getTicketDetails,
    getInspectionPoint,
    getInspectionDefects,
    confirmEngineInspection,
    getReworkTakeInEngines,
    getEngineTakeInDetails,
    engineTakeIn,
    getNonMesControlledMaterials,
    createMaterialRequest,
    getProductionCallLogs,
    acknowledgeProductionCall,
    closeProductionCall
};
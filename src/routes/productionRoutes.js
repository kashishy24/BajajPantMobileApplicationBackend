const express = require("express");
const router = express.Router();

const productionController = require("../controllers/productionController");

router.get(
    "/latest-ticket-id",
    productionController.getLatestTicketID
);

router.get(
    "/ticket-reasons",
    productionController.getTicketReasons
);

router.get(
    "/ticket-reasons/required-fields",
    productionController.getTicketReasonRequiredFields
);

router.get(
    "/departments",
    productionController.getDepartments
);

router.post(
    "/notify-submit",
    productionController.notifySubmit
);

router.get(
    "/open-tickets",
    productionController.getOpenProductionTickets
);

router.get(
    "/open-tickets/:ticketId",
    productionController.getTicketDetails
);

router.post(
    "/submit-update",
    productionController.submitUpdateTicket
);

router.post(
    "/close",
    productionController.closeTicket
);

router.get(
    "/inspection-points",
    productionController.getInspectionPoint
);

router.get(
    "/inspection-points/:inspectionPointId/defects",
    productionController.getInspectionDefects
);

router.post(
    "/engine-inspection/confirm",
    productionController.confirmEngineInspection
);

// =====================================================
// Engine Take IN
// =====================================================

router.get(
    "/engine-takein/engines",
    productionController.getReworkTakeInEngines
);


router.get(
    "/engine-takein/details",
    productionController.getEngineTakeInDetails
);


router.post(
    "/engine-takein",
    productionController.engineTakeIn
);


// =====================================================
// Material Request
// =====================================================

router.get(
    "/material-request/materials",
    productionController.getNonMesControlledMaterials
);


router.post(
    "/material-request",
    productionController.createMaterialRequest
);

router.get(
    "/call-logs",
    productionController.getProductionCallLogs
);

router.post(
    "/call-logs/ack",
    productionController.acknowledgeProductionCall
);

router.post(
    "/call-logs/close",
    productionController.closeProductionCall
);

module.exports = router;
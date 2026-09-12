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

router.get(
    "/open-tickets",
    productionController.getOpenProductionTickets
);

router.get(
    "/open-tickets/:ticketId",
    productionController.getTicketDetails
);

router.get(
    "/inspection-points",
    productionController.getInspectionPoint
);

router.get(
    "/inspection-points/:inspectionPointId/defects",
    productionController.getInspectionDefects
);

module.exports = router;
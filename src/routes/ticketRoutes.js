const express = require("express");
const router = express.Router();

const ticketController = require("../controllers/ticketController");

// Get Station List
router.get(
    "/stations",
    ticketController.getStations
);

router.get(
    "/lines",
    ticketController.getLines
);

// Get Reason List
router.get(
    "/reasons",
    ticketController.getReasons
);

// Get Role List
router.get(
    "/roles",
    ticketController.getRoles
);

router.post(
    "/create",
    ticketController.createTicket
);

// Get Open Material Tickets
router.get(
    "/open-material-tickets",
    ticketController.getOpenMaterialTickets
);


// Get Open Quality Tickets
router.get(
    "/open-quality-tickets",
    ticketController.getOpenQualityTickets
);

// Get Open Maintenance Tickets
router.get(
    "/open-maintenance-tickets",
    ticketController.getOpenMaintenanceTickets
);

// Get Open Notifications
router.get(
    "/open-notifications",
    ticketController.getOpenNotifications
);

router.post(
    "/close-notifications",
    ticketController.closeNotifications
);

router.post(
    "/ipqc-hold",
    ticketController.createIPQCHold
);


module.exports = router;
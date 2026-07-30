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

module.exports = router;
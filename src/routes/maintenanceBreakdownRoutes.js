const express = require("express");
const router = express.Router();

const controller = require(
  "../controllers/maintenanceBreakdownController"
);

router.get(
  "/breakdowns/assigned/:userId",
  controller.getAssignedBreakdowns
);

router.post(
  "/breakdowns/assign",
  controller.assignBreakdown
);

router.post(
  "/breakdowns/close",
  controller.closeBreakdown
);

router.post(
  "/breakdowns",
  controller.createBreakdown
);

module.exports = router;
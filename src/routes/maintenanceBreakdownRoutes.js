const express = require("express");
const router = express.Router();

const controller = require(
  "../controllers/maintenanceBreakdownController"
);

router.get("/breakdowns/open", controller.getOpenBreakdowns);
router.get("/breakdowns/assigned/:userId", controller.getAssignedBreakdowns);
router.get("/breakdowns/:breakdownId", controller.getBreakdownById);

router.get("/loss-codes", controller.getLossCodes);
router.get("/loss-codes/:lossId/sub-loss-codes", controller.getSubLossCodes);

router.post("/breakdowns/assign", controller.assignBreakdown);
router.post("/breakdowns/close", controller.closeBreakdown);
router.post("/breakdowns", controller.createBreakdown);


module.exports = router;
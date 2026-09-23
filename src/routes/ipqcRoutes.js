const express = require("express");
const router = express.Router();

const IPQCHome =require("../controllers/TabAPI/Operator/IPQC/IPQCHome");


//Operator Login

//Monitoring Screen
router.get("/getScheduleAuditList", IPQCHome.getScheduleAuditList);
router.post("/executeIPQCAudit", IPQCHome.executeIPQCAudit);
router.get("/getIPQCAuditPointsForExecute", IPQCHome.getIPQCAuditPointsForExecute);
router.put("/updateIPQCCheckpointResult",IPQCHome.updateIPQCCheckpointResult);
router.post("/submitIPQCAuditPoint",IPQCHome.submitIPQCAuditPoint);
router.get("/getWaitingForApprovalIPQCAuditList",IPQCHome.getWaitingForApprovalIPQCAuditList);
router.get("/getExecutedIPQCCheckpointDetails",IPQCHome.getExecutedIPQCCheckpointDetails);
router.post("/approveIPQCAudit",IPQCHome.approveIPQCAudit);


module.exports = router;
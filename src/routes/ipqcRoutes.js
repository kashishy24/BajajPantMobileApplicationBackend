const express = require("express");
const router = express.Router();

const IPQCHome =require("../controllers/TabAPI/Operator/IPQC/IPQCHome");


//Operator Login

router.get("/getDocListByGroup", IPQCHome.getDocListByGroup);
router.get("/getScheduleAuditList", IPQCHome.getScheduleAuditList);
router.post("/executeIPQCAudit", IPQCHome.executeIPQCAudit);
router.get("/getIPQCExecutionDetails", IPQCHome.getIPQCExecutionDetails);
router.post("/saveIPQCCheckpointResult", IPQCHome.saveIPQCCheckpointResult);
router.post("/submitIPQCAudit", IPQCHome.submitIPQCAudit);
router.get("/getExecutedIPQCAuditList", IPQCHome.getExecutedIPQCAuditList);
router.get("/getExecutedIPQCAuditPoints", IPQCHome.getExecutedIPQCAuditPoints);
router.post("/getPendingIPQCAuditApproval", IPQCHome.getPendingIPQCAuditApproval);
router.post("/approveIPQCAudit", IPQCHome.approveIPQCAudit);

module.exports = router;
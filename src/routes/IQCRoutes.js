const express = require("express");
const router = express.Router();

const IQCHome = require("../controllers/TabAPI/Operator/IQC/IQCHome");



//IQC Tab Screen
router.get("/getAuditListByGroup", IQCHome.getAuditListByGroup);
router.get("/getAuditListAndParts", IQCHome.getAuditListAndParts);
router.get("/getActiveAuditListIds",IQCHome.getActiveAuditListIds);
router.post("/executeIQCAudit", IQCHome.executeIQCAudit);
router.post("/getIQCExecutionCheckpoints", IQCHome.getIQCExecutionCheckpoints);
router.post("/saveIQCCheckpointResult", IQCHome.saveIQCCheckpointResult);
router.post("/submitIQCAudit", IQCHome.submitIQCAudit);
router.post("/getExecutedIQCAuditList", IQCHome.getExecutedIQCAuditList);
router.post("/getExecutedIQCCheckpointDetails", IQCHome.getExecutedIQCCheckpointDetails);
router.post("/getPendingIQCAuditApproval", IQCHome.getPendingIQCAuditApproval);
router.post("/approveIQCAudit", IQCHome.approveIQCAudit);
module.exports = router;
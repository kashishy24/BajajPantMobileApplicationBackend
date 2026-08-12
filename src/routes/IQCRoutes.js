const express = require("express");
const router = express.Router();

const IQCHome = require("../controllers/TabAPI/Operator/IQC/IQCHome");



//IQC Tab Screen
router.get("/getAuditListByGroup", IQCHome.getAuditListByGroup);
router.get("/getPlannedIQCAuditList", IQCHome.getPlannedIQCAuditList);
router.get("/getWaitingForApprovalIQCAuditHistory", IQCHome.getWaitingForApprovalIQCAuditHistory);
router.get("/getExecutedIQCCheckpoint", IQCHome.getExecutedIQCCheckpoint);
router.get("/getApprovedIQCAuditHistory", IQCHome.getApprovedIQCAuditHistory);
router.get("/getIQCCheckpointDetails", IQCHome.getIQCCheckpointDetails);
router.put("/updateIQCCheckpointResult", IQCHome.updateIQCCheckpointResult);
router.post("/approveIQCAudit", IQCHome.approveIQCAudit);

module.exports = router;
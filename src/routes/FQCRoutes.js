const express = require("express");
const router = express.Router();

const FQCHome = require("../controllers/TabAPI/Operator/FQC/FQCHome");
const { route } = require("./ipqcRoutes");


router.get("/getAuditListByGroup", FQCHome.getAuditListByGroup);
//Monitoring Screen
router.get("/getScheduleAuditList", FQCHome.getScheduleAuditList);
router.post("/executeFQCAudit", FQCHome.executeFQCAudit);

//Waiting for Approval Screen
router.get("/getWaitingForApprovalAuditList", FQCHome.getWaitingForApprovalFQCAuditList);
router.get( "/getWaitingForApprovalFQCAuditPoints",FQCHome.getWaitingForApprovalFQCAuditPoints);

//Approved Audit List Screen
router.get("/getApprovedFQCAuditList", FQCHome.getApprovedFQCAuditList);

//Checkpoint Mark Screen
router.get("/getFQCEngInbuiltCheckpointDetails",FQCHome.getFQCEngInbuiltCheckpointDetails);
router.put("/updateFQCEngInbuiltCheckpointResult",FQCHome.updateFQCEngInbuiltCheckpointResult);
router.put("/updateFQCEngInbuiltEngineNo",FQCHome.updateFQCEngInbuiltEngineNo);
router.post("/moveToNextFQCSampleLevelEngInbuilt",FQCHome.moveToNextFQCSampleLevelEngInbuilt);
router.post("/submitFQCEngInbuiltAudit",FQCHome.submitFQCEngInbuiltAudit);

router.get("/getFQCEngPerformanceCheckpointDetails",FQCHome.getFQCEngPerformanceCheckpointDetails);
router.put("/updateFQCEngPerformanceCheckpointResult",FQCHome.updateFQCEngPerformanceCheckpointResult);
router.put("/updateFQCEngPerformanceEngineNo",FQCHome.updateFQCEngPerformanceEngineNo);
router.post("/moveToNextFQCSampleLevelEngPerformance",FQCHome.moveToNextFQCSampleLevelEngPerformance);
router.post("/submitFQCEngPerformanceAudit",FQCHome.submitFQCEngPerformanceAudit);


//Checkpoint Details Screen
router.get("/getExecutedFQCEngInbuiltCheckpointDetails",FQCHome.getExecutedFQCEngInbuiltCheckpointDetails);
router.get("/getExecutedFQCEngPerformanceCheckpointDetails",FQCHome.getExecutedFQCEngPerformanceCheckpointDetails);


//Supervisor Login

router.put("/approveFQCAudit", FQCHome.approveFQCAudit);


module.exports = router;
const express = require("express");
const router = express.Router();

const PMLargeDevice =require("../controllers/PM/PMHomeLargeDevice");


//Operator Login
 
//Monitoring Screen
router.get("/getExecutionChecklist",PMLargeDevice.getExecutionChecklist);
router.post("/startPMChecklistExecution",PMLargeDevice.startPMChecklistExecution);
//Checkpoint Execution Screen
router.get("/getPMExecutionCheckPoints/:CheckListID",PMLargeDevice.getPMExecutionCheckPoints);
router.put("/updatePMExecutionCheckPoint",PMLargeDevice.updatePMExecutionCheckPoint);
router.post("/submitPMChecklistForApproval",PMLargeDevice.submitPMChecklistForApproval);
//Approval checklist screen
router.get("/getPMChecklistHistory",PMLargeDevice.getPMChecklistHistory);
router.post("/approvePMChecklist",PMLargeDevice.approvePMChecklist);
//Approval Checkpoint Screen
router.get("/getPMExecutionCheckPointHistory",PMLargeDevice.getPMExecutionCheckPointHistory);
router.put("/updatePMExecutionCheckPointHistory",PMLargeDevice.updatePMExecutionCheckPointHistory);

module.exports = router;
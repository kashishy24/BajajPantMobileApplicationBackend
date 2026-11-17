const express = require("express");
const router = express.Router();

const PMLargeDevice =require("../controllers/PM/PMHomeLargeDevice");


//Operator Login
 
//Monitoring Screen
router.get("/getExecutionChecklist",PMLargeDevice.getExecutionChecklist);
router.post("/startPMChecklistExecution",PMLargeDevice.startPMChecklistExecution);
module.exports = router;
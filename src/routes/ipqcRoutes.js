const express = require("express");
const router = express.Router();

const IPQCHome =require("../controllers/TabAPI/Operator/IPQC/IPQCHome");


//Operator Login

//Monitoring Screen
router.get("/getScheduleAuditList", IPQCHome.getScheduleAuditList);
router.post("/executeIPQCAudit", IPQCHome.executeIPQCAudit);


module.exports = router;
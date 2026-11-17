const express = require("express");
const router = express.Router();

const PMSmallDevice =require("../controllers/PM/CheckListDetailSmallDevice");


//Operator Login
 
//Monitoring Screen

router.get("/getAllPMChecklists",PMSmallDevice.getAllPMChecklists);
router.post("/moveChecklistToExecution",PMSmallDevice.moveChecklistToExecution);

module.exports = router;
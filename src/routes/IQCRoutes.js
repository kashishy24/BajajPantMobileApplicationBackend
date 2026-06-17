const express = require("express");
const router = express.Router();

const IQCHome = require("../controllers/TabAPI/Operator/IQC/IQCHome");



//IQC Home Screen
router.get("/getAuditListByGroup", IQCHome.getAuditListByGroup);

module.exports = router;
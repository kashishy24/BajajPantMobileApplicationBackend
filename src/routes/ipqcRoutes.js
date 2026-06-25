const express = require("express");
const router = express.Router();

const ipqcController =
    require("../controllers/ipqcController");

router.get(
    "/documents",
    ipqcController.getScheduledDocuments
);

router.get(
    "/audit-list/:documentId",
    ipqcController.getAuditList
);

module.exports = router;
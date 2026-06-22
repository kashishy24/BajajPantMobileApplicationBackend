const express = require("express");
const router = express.Router();

const ediController = require("../controllers/ediController");

router.get(
    "/",
    ediController.getEDIList
);

router.get(
    "/validated",
    ediController.getValidatedMaterials
);

router.get(
    "/:ediNumber",
    ediController.getEDIDetails
);

router.get(
    "/:ediNumber/part/:partId",
    ediController.getPartDetails
);

router.post(
    "/validate",
    ediController.validateQuantity
);

module.exports = router;
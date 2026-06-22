const express = require("express");
const router = express.Router();

const ediController = require("../controllers/ediController");

router.get(
    "/validated",
    ediController.getValidatedMaterials
);

router.post(
    "/validate",
    ediController.validateQuantity
);

router.get(
    "/:ediNumber/part/:partId",
    ediController.getPartDetails
);

router.get(
    "/:ediNumber",
    ediController.getEDIDetails
);

router.get(
    "/",
    ediController.getEDIList
);

router.post(
    "/bypass",
    ediController.bypassMaterial
);

module.exports = router;
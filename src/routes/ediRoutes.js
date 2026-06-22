const express = require("express");
const router = express.Router();

const ediController = require("../controllers/ediController");


router.get(
    "/gap-materials",
    ediController.getGapMaterials
);

router.get(
    "/iqc-cleared",
    ediController.getIQCClearedList
);

router.get(
    "/iqc-hold",
    ediController.getIQCHoldList
);

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
    "/validated",
    ediController.getValidatedMaterials
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

router.post(
    "/sample-collection",
    ediController.sampleCollection
);

router.post(
    "/iqc-cleared",
    ediController.iqcCleared
);


module.exports = router;
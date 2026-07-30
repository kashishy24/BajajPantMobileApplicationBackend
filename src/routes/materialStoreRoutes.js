const express = require("express");
const router = express.Router();

const materialStoreController = require("../controllers/materialStoreController");


router.get(
    "/materials",
    materialStoreController.getMaterialStoreList
);

router.get(
    "/delivery-plans",
    materialStoreController.getDeliveryPlans
);

router.get(
    "/kitting-details/:planId/:skuId",
    materialStoreController.getKittingDetails
);

router.get(
    "/sub-assembly-lines",
    materialStoreController.getSubAssemblyLines
);

router.get(
    "/sub-assembly-details/:planId/:skuId/:subAssemblyId",
    materialStoreController.getSubAssemblyDetails
);

router.get(
    "/line-side-material",
    materialStoreController.getLineSideMaterial
);

router.post(
    "/line-side-to-store",
    materialStoreController.moveMaterialToStore
);

module.exports = router;
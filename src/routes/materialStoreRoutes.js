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

router.get(
    "/materials/rejected",
    materialStoreController.getMaterialRejectedList
);

router.get(
    "/production-plans/running",
    materialStoreController.getRunningProductionPlans
);

router.get(
    "/materials/request",
    materialStoreController.getMaterialRequestList
);

router.get(
    "/materials/alert",
    materialStoreController.getMaterialAlertList
);

router.post(
    "/materials/issue",
    materialStoreController.issueMaterial
);

router.get(
    "/materials/deliver",
    materialStoreController.getMaterialDeliverList
);

router.post(
    "/materials/deliver",
    materialStoreController.deliverMaterial
);

module.exports = router;
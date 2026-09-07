const materialStoreService = require("../services/materialStoreService");


const {
    successResponse,
    errorResponse
} = require("../middlewares/responseHandler");

const getMaterialStoreList = async (req, res) => {
    try {

        const data = await materialStoreService.getMaterialStoreList();

        return successResponse(
            res,
            data,
            "Material Store Data Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getDeliveryPlans = async (req, res) => {
    try {

        const data = await materialStoreService.getDeliveryPlans();

        return successResponse(
            res,
            data,
            "Delivery Plans Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getKittingDetails = async (req, res) => {
    try {

        const { planId, skuId } = req.params;

        const data = await materialStoreService.getKittingDetails(
            planId,
            skuId
        );

        return successResponse(
            res,
            data,
            "Kitting Details Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getSubAssemblyLines = async (req, res) => {
    try {

        const data = await materialStoreService.getSubAssemblyLines();

        return successResponse(
            res,
            data,
            "Sub Assembly Lines Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getSubAssemblyDetails = async (req, res) => {

    try {

        const {
            planId,
            skuId,
            subAssemblyId
        } = req.params;

        const data = await materialStoreService.getSubAssemblyDetails(
            planId,
            skuId,
            subAssemblyId
        );

        return successResponse(
            res,
            data,
            "Sub Assembly Details Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }

};

const getLineSideMaterial = async (req, res) => {
    try {

        const data = await materialStoreService.getLineSideMaterial();

        return successResponse(
            res,
            data,
            "Line Side Material Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const moveMaterialToStore = async (req, res) => {

    try {

        const {
            partId,
            qty
        } = req.body;

        const data = await materialStoreService.moveMaterialToStore(
            partId,
            qty
        );

        return successResponse(
            res,
            data,
            "Material Moved Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }

};

const getMaterialRejectedList = async (req, res) => {

    try {

        const data = await materialStoreService.getMaterialRejectedList();

        return successResponse(
            res,
            data,
            "Rejected Material Data Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getRunningProductionPlans = async (req, res) => {

    try {

        const data = await materialStoreService.getRunningProductionPlans();

        return successResponse(
            res,
            data,
            "Running Production Plan Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }

};

const getMaterialRequestList = async (req, res) => {

    try {

        const data = await materialStoreService.getMaterialRequestList();

        return successResponse(
            res,
            data,
            "Material Request Data Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }

};

const getMaterialAlertList = async (req, res) => {
    try {
        const data = await materialStoreService.getMaterialAlertList();

        return successResponse(
            res,
            data,
            "Material Alert Data Fetched Successfully"
        );
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

const issueMaterial = async (req, res) => {
    try {
        const { planId, partId, requiredQty } = req.body;

        if (!planId || !partId || requiredQty === undefined) {
            return errorResponse(
                res,
                "PlanID, PartID and RequiredQty are required."
            );
        }

        const data = await materialStoreService.issueMaterial(
            planId,
            partId,
            requiredQty
        );

        return successResponse(
            res,
            data,
            "Material Issued Successfully"
        );
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

const getMaterialDeliverList = async (req, res) => {
    try {
        const data = await materialStoreService.getMaterialDeliverList();

        return successResponse(
            res,
            data,
            "Material Deliver List Fetched Successfully"
        );
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

const deliverMaterial = async (req, res) => {

    try {

        const {
            planId,
            partId,
            deliveredQty,
            materialMoveType
        } = req.body;

        if (
            planId === undefined ||
            !partId ||
            deliveredQty === undefined ||
            materialMoveType === undefined
        ) {

            return errorResponse(
                res,
                "PlanID, PartID, DeliveredQty and MaterialMoveType are required."
            );

        }

        if (deliveredQty <= 0) {

            return errorResponse(
                res,
                "DeliveredQty must be greater than 0."
            );

        }

        const data =
            await materialStoreService.deliverMaterial(
                planId,
                partId,
                deliveredQty,
                materialMoveType
            );

        return successResponse(
            res,
            data,
            "Material Delivered Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

module.exports = {
    getMaterialStoreList,
    getDeliveryPlans,
    getKittingDetails,
    getSubAssemblyLines,
    getSubAssemblyDetails,
    getLineSideMaterial,
    moveMaterialToStore,
    getMaterialRejectedList,
    getRunningProductionPlans,
    getMaterialRequestList,
    getMaterialAlertList,
    issueMaterial,
    getMaterialDeliverList,
    deliverMaterial
};
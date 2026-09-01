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

module.exports = {
    getMaterialStoreList,
    getDeliveryPlans,
    getKittingDetails,
    getSubAssemblyLines,
    getSubAssemblyDetails,
    getLineSideMaterial,
    moveMaterialToStore,
    getMaterialRejectedList,
    getRunningProductionPlans
};
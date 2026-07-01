const ediService = require("../services/ediService");

const {
    successResponse,
    errorResponse
} = require("../middlewares/responseHandler");

const getEDIList = async (req, res) => {
    try {

        const data = await ediService.getEDIList();

        return successResponse(
            res,
            data,
            "EDI List Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getEDIDetails = async (req, res) => {
    try {

        const { ediNumber } = req.params;

        const data = await ediService.getEDIDetails(
            ediNumber
        );

        return successResponse(
            res,
            data,
            "EDI Details Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getPartDetails = async (req, res) => {
    try {

        const { ediNumber, partId } = req.params;

        const data = await ediService.getPartDetails(
            ediNumber,
            partId
        );

        return successResponse(
            res,
            data,
            "Part Details Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const validateQuantity = async (req, res) => {
    try {

        const result = await ediService.validateQuantity(
            req.body
        );

        return successResponse(
            res,
            result,
            "Quantity Validated Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getValidatedMaterials = async (
    req,
    res
) => {
    try {

         console.log("GET /api/edi/validated called");

        const data =
            await ediService.getValidatedMaterials();

        return successResponse(
            res,
            data,
            "Validated Materials Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const bypassMaterial = async (req, res) => {
    try {

        const result = await ediService.bypassMaterial(
            req.body
        );

        return successResponse(
            res,
            result,
            "Material Bypassed Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const sampleCollection = async (req, res) => {
    try {

        const result = await ediService.sampleCollection(
            req.body
        );

        return successResponse(
            res,
            result,
            "Sample Collected Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getIQCHoldList = async (req, res) => {
    try {

        const data =
            await ediService.getIQCHoldList();

        return successResponse(
            res,
            data,
            "IQC Hold List Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const iqcCleared = async (req, res) => {
    try {

        const result =
            await ediService.iqcCleared(req.body);

        return successResponse(
            res,
            result,
            "IQC Cleared Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const iqcFailed = async (req, res) => {
    try {

        const result =
            await ediService.iqcFailed(req.body);

        return successResponse(
            res,
            result,
            "IQC Failed Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getIQCClearedList = async (req, res) => {
    try {

        const data =
            await ediService.getIQCClearedList();

        return successResponse(
            res,
            data,
            "IQC Cleared Materials Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

const getGapMaterials = async (req, res) => {
    try {

        const data =
            await ediService.getGapMaterials();

        return successResponse(
            res,
            data,
            "Gap Materials Fetched Successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};


module.exports = {
    getEDIList,
    getEDIDetails,
    getPartDetails,
    validateQuantity,
    getValidatedMaterials,
    bypassMaterial,
    sampleCollection,   
    getIQCHoldList,
    iqcCleared,
    getIQCClearedList,
    getGapMaterials,
    iqcFailed
};
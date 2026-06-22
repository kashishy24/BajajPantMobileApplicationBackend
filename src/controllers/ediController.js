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

const getValidatedMaterials = async (req, res) => {
    try {
        const data = await ediService.getValidatedMaterials();
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

module.exports = {
    getEDIList,
    getEDIDetails,
    getPartDetails,
    validateQuantity,
    getValidatedMaterials
};
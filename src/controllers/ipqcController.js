const ipqcService =
    require("../services/ipqcService");

const {
    successResponse,
    errorResponse
} = require("../middlewares/responseHandler");

const getScheduledDocuments =
    async (req, res) => {

        try {

            const documents =
                await ipqcService.getScheduledDocuments();

            return successResponse(
                res,
                documents,
                "Documents fetched successfully"
            );

        } catch (error) {

            return errorResponse(
                res,
                error.message
            );

        }

    };

const getAuditList = async (req, res) => {
    try {

        const { documentId } = req.params;

        const data =
            await ipqcService.getAuditList(documentId);

        return successResponse(
            res,
            data,
            "Audit List fetched successfully"
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message
        );

    }
};

module.exports = {
    getScheduledDocuments,
    getAuditList
};
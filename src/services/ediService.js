const ediRepository = require("../repositories/ediRepository");

const getEDIList = async () => {

    return await ediRepository.getEDIList();

};

const getEDIDetails = async (ediNumber) => {

    if (!ediNumber) {
        throw new Error("EDI Number is required");
    }

    return await ediRepository.getEDIDetails(
        ediNumber
    );
};

const getPartDetails = async (
    ediNumber,
    partId
) => {

    if (!ediNumber) {
        throw new Error("EDI Number is required");
    }

    if (!partId) {
        throw new Error("Part ID is required");
    }

    return await ediRepository.getPartDetails(
        ediNumber,
        partId
    );
};

const validateQuantity = async (data) => {

    const {
        ediNumber,
        partId,
        receivedQty,
        userId,
        remark
    } = data;

    if (!ediNumber)
        throw new Error("EDI Number is required");

    if (!partId)
        throw new Error("Part ID is required");

    if (receivedQty == null)
        throw new Error("Received Quantity is required");

    return await ediRepository.validateQuantity(
        ediNumber,
        partId,
        receivedQty,
        userId,
        remark
    );
};

module.exports = {
    getEDIList,
    getEDIDetails,
    getPartDetails,
    validateQuantity
};
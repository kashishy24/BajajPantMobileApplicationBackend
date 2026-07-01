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

const getValidatedMaterials = async () => {

        return await ediRepository.getValidatedMaterials();

    };


const bypassMaterial = async (data) => {

    const {
        ediNumber,
        partId
    } = data;

    if (!ediNumber)
        throw new Error("EDI Number is required");

    if (!partId)
        throw new Error("Part ID is required");

    return await ediRepository.bypassMaterial(
        ediNumber,
        partId
    );

};

const sampleCollection = async (data) => {

    const {
        ediNumber,
        partId
    } = data;

    if (!ediNumber)
        throw new Error("EDI Number is required");

    if (!partId)
        throw new Error("Part ID is required");

    return await ediRepository.sampleCollection(
        ediNumber,
        partId
    );

};

const getIQCHoldList = async () => {

    return await ediRepository.getIQCHoldList();

};

const iqcCleared = async (data) => {

    const {
        ediNumber,
        partId
    } = data;

    if (!ediNumber)
        throw new Error("EDI Number is required");

    if (!partId)
        throw new Error("Part ID is required");

    return await ediRepository.iqcCleared(
        ediNumber,
        partId
    );
};

const iqcFailed = async (data) => {

    const {
        ediNumber,
        partId
    } = data;

    if (!ediNumber)
        throw new Error("EDI Number is required");

    if (!partId)
        throw new Error("Part ID is required");

    return await ediRepository.iqcFailed(
        ediNumber,
        partId
    );
};

const getIQCClearedList = async () => {

    return await ediRepository.getIQCClearedList();

};

const getGapMaterials = async () => {

    return await ediRepository.getGapMaterials();

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
    iqcFailed,
    getIQCClearedList,
    getGapMaterials
};
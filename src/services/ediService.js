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

const confirmIQC = async (data) => {

    const {
        ediNumber,
        partId,
        userId
    } = data;

    if (!ediNumber)
        throw new Error("EDI Number is required");

    if (!partId)
        throw new Error("Part ID is required");

    return await ediRepository.confirmIQC(
        ediNumber,
        partId,
        userId
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
        partId,
        userId
    } = data;

    if (!ediNumber)
        throw new Error("EDI Number is required");

    if (!partId)
        throw new Error("Part ID is required");

    if (!userId)
        throw new Error("User ID is required");

    return await ediRepository.bypassMaterial(
        ediNumber,
        partId,
        userId
    );

};

const sampleCollection = async (data) => {

    const {
        batchId,
        partId,
        userId
    } = data;

    if (!batchId)
        throw new Error("Batch ID is required");

    if (!partId)
        throw new Error("Part ID is required");

    if (!userId)
        throw new Error("User ID is required");

    return await ediRepository.sampleCollection(
        batchId,
        partId,
        userId
    );

};

const getIQCHoldList = async () => {

    return await ediRepository.getIQCHoldList();

};

const iqcCleared = async (data) => {

    const {
        ediNumber,
        partId,
        userId
    } = data;

    if (!ediNumber)
        throw new Error("EDI Number is required");

    if (!partId)
        throw new Error("Part ID is required");

    if (!userId)
        throw new Error("User ID is required");

    return await ediRepository.iqcCleared(
        ediNumber,
        partId,
        userId
    );
};

const iqcFailed = async (data) => {

    const {
        ediNumber,
        partId,
        userId
    } = data;

    if (!ediNumber)
        throw new Error("EDI Number is required");

    if (!partId)
        throw new Error("Part ID is required");

    if (!userId)
        throw new Error("User ID is required");

    return await ediRepository.iqcFailed(
        ediNumber,
        partId,
        userId
    );
};

const iqcFailedCheck = async (data) => {

    const {
        ediNumber,
        partId,
        userId,
        okQty,
        nokQty
    } = data;

    if (!ediNumber)
        throw new Error("EDI Number is required");

    if (!partId)
        throw new Error("Part ID is required");

    if (!userId)
        throw new Error("User ID is required");

    return await ediRepository.iqcFailed(
        ediNumber,
        partId,
        userId
    );
};

const getIQCClearedList = async () => {

    return await ediRepository.getIQCClearedList();

};

const getGapMaterials = async () => {

    return await ediRepository.getGapMaterials();

};

const getHoldMaterialList = async () => {

    return await ediRepository.getHoldMaterialList();

};

const confirmHoldMaterial = async ({
    EDINumber,
    PartID,
    HoldOk,
    HoldRejected,
    LastUpdatedBy
}) => {

    return await ediRepository.confirmHoldMaterial({
        EDINumber,
        PartID,
        HoldOk,
        HoldRejected,
        LastUpdatedBy
    });

};

module.exports = {
    getEDIList,
    getEDIDetails,
    getPartDetails,
    confirmIQC,
    validateQuantity,
    getValidatedMaterials,
    bypassMaterial,
    sampleCollection,
    getIQCHoldList,
    iqcCleared,
    iqcFailed,
    getIQCClearedList,
    getGapMaterials,
    getHoldMaterialList,
    confirmHoldMaterial
};
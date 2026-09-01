const materialStoreRepository = require("../repositories/materialStoreRepository");

const getMaterialStoreList = async () => {

    return await materialStoreRepository.getMaterialStoreList();

};

const getDeliveryPlans = async () => {

    return await materialStoreRepository.getDeliveryPlans();

};

// const getKittingDetails = async (planId, skuId) => {

//     return await materialStoreRepository.getKittingDetails(
//         planId,
//         skuId
//     );

// };

const getKittingDetails = async (planId, skuId) => {

    const rows = await materialStoreRepository.getKittingDetails(
        planId,
        skuId
    );

    const parts = [];

    rows.forEach(row => {

        let part = parts.find(p => p.PartID === row.PartID);

        if (!part) {

            part = {
                PartID: row.PartID,
                PartName: row.PartName,
                PlannedQty: row.PlannedQty,
                LineSideQty: row.LineSideQty,
                Batches: []
            };

            parts.push(part);
        }

        part.Batches.push({
            BatchID: row.BatchID,
            Priority: row.Priority,
            AvailableQty: row.AvailableQty
        });

    });

    return parts;
};

const getSubAssemblyLines = async () => {

    return await materialStoreRepository.getSubAssemblyLines();

};

// const getSubAssemblyDetails = async (
//     planId,
//     skuId,
//     subAssemblyId
// ) => {

//     return await materialStoreRepository.getSubAssemblyDetails(
//         planId,
//         skuId,
//         subAssemblyId
//     );

// };

const getSubAssemblyDetails = async (
    planId,
    skuId,
    subAssemblyId
) => {

    const rows = await materialStoreRepository.getSubAssemblyDetails(
        planId,
        skuId,
        subAssemblyId
    );

    const parts = [];

    rows.forEach(row => {

        let part = parts.find(
            p => p.PartID === row.PartID
        );

        if (!part) {

            part = {
                PartID: row.PartID,
                PartName: row.PartName,
                StationName: row.StationName,
                PlannedQty: row.PlannedQty,
                LineSideQty: row.LineSideQty,
                Batches: []
            };

            parts.push(part);
        }

        part.Batches.push({
            BatchID: row.BatchID,
            Priority: row.Priority,
            AvailableQty: row.AvailableQty
        });

    });

    return parts;

};

const getLineSideMaterial = async () => {

    return await materialStoreRepository.getLineSideMaterial();

};

const moveMaterialToStore = async (
    partId,
    qty
) => {

    return await materialStoreRepository.moveMaterialToStore(
        partId,
        qty
    );

};

const getMaterialRejectedList = async () => {

    return await materialStoreRepository.getMaterialRejectedList();

};

const getRunningProductionPlans = async () => {

    return await materialStoreRepository.getRunningProductionPlans();

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
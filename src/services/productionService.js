const productionRepository = require("../repositories/productionRepository");

const getLatestTicketID = async () => {

    return await productionRepository.getLatestTicketID();

};

const getTicketReasons = async () => {

    return await productionRepository.getTicketReasons();

};

const getTicketReasonRequiredFields = async (
    departmentId,
    reasonName
) => {

    return await productionRepository.getTicketReasonRequiredFields(
        departmentId,
        reasonName
    );

};

const getDepartments = async () => {

    return await productionRepository.getDepartments();

};

const notifySubmit = async ({
    lineId,
    stationId,
    activityId,
    partId,
    equipmentId,
    breakdownId,
    engineNo,
    userId,
    reasonId,
    remark,
    expectedClosure,
    actionBy,
    role
}) => {

    return await productionRepository.notifySubmit({
        lineId,
        stationId,
        activityId,
        partId,
        equipmentId,
        breakdownId,
        engineNo,
        userId,
        reasonId,
        remark,
        expectedClosure,
        actionBy,
        role
    });
};

const getOpenProductionTickets = async () => {

    return await productionRepository.getOpenProductionTickets();

};

const getTicketDetails = async (ticketId) => {

    return await productionRepository.getTicketDetails(ticketId);

};

const getInspectionPoint = async () => {

    return await productionRepository.getInspectionPoint();

};

const getInspectionDefects = async (inspectionPointId) => {

    return await productionRepository.getInspectionDefects(
        inspectionPointId
    );

};

const confirmEngineInspection = async (data) => {

    return await productionRepository.confirmEngineInspection(
        data
    );

};

const getReworkTakeInEngines = async () => {

    return await productionRepository.getReworkTakeInEngines();

};

const getEngineTakeInDetails = async (
    engineNo,
    vrEngineNo
) => {

    return await productionRepository.getEngineTakeInDetails(
        engineNo,
        vrEngineNo
    );

};

const engineTakeIn = async (
    engineNo,
    takeINStation
) => {

    return await productionRepository.engineTakeIn(
        engineNo,
        takeINStation
    );

};

const getNonMesControlledMaterials = async (
    stationId,
    lineId
) => {

    return await productionRepository.getNonMesControlledMaterials(
        stationId,
        lineId
    );

};

const createMaterialRequest = async (
    partId,
    stationId,
    lineId,
    planId
) => {

    return await productionRepository.createMaterialRequest(
        partId,
        stationId,
        lineId,
        planId
    );

};

const getProductionCallLogs = async () => {

    return await productionRepository.getProductionCallLogs();

};

const acknowledgeProductionCall = async (
    rowId,
    lineId,
    stationId
) => {

    return await productionRepository.acknowledgeProductionCall(
        rowId,
        lineId,
        stationId
    );

};

const closeProductionCall = async (
    rowId,
    lineId,
    stationId
) => {

    return await productionRepository.closeProductionCall(
        rowId,
        lineId,
        stationId
    );

};

module.exports = {
    getLatestTicketID,
    getTicketReasons,
    getTicketReasonRequiredFields,
    getDepartments,
    notifySubmit,
    getOpenProductionTickets,
    getTicketDetails,
    getInspectionPoint,
    getInspectionDefects,
    confirmEngineInspection,
    getReworkTakeInEngines,
    getEngineTakeInDetails,
    engineTakeIn,
    getNonMesControlledMaterials,
    createMaterialRequest,
    getProductionCallLogs,
    acknowledgeProductionCall,
    closeProductionCall
};
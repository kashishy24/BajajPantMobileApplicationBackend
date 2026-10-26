const productionRepository = require("../repositories/productionRepository");

const getLatestTicketID = async () => {

    return await productionRepository.getLatestTicketID();

};

const getTicketReasons = async () => {

    return await productionRepository.getTicketReasons();

};

const getTicketReasonRequiredFields = async (reasonName) => {
 
    return await productionRepository.getTicketReasonRequiredFields(
        reasonName
    );
 
};

const getDepartments = async () => {

    return await productionRepository.getDepartments();

};

const createTicketNotifySubmit = async ({
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

    return await productionRepository.createTicketNotifySubmit({
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

const openTicketNotify = async ({
    ticketId,
    userId,
    remark,
    actionBy
}) => {

    return await productionRepository.openTicketNotify({
        ticketId,
        userId,
        remark,
        actionBy
    });
};

const closeTicket = async ({
    ticketId,
    userId,
    remark,
    actionBy
}) => {

    return await productionRepository.closeTicket({
        ticketId,
        userId,
        remark,
        actionBy
    });
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

const getUnassignedDowntime = async () => {

    return await productionRepository.getUnassignedDowntime();

};

const updateDowntime = async (payload) => {

    return await productionRepository.updateDowntime(payload);

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

const createBreakdown = async (payload) => {
  const required = ["ticketId", "bdType", "lineId", "stationId", "equipmentId",
                    "raiseToDepartment", "raiseToRole", "userId"];

  for (const key of required) {
    if (payload[key] === undefined || payload[key] === null || payload[key] === "") {
      const err = new Error(`${key} is required.`);
      err.status = 400;
      throw err;
    }
  }

  return await productionRepository.createBreakdown({
    ...payload,
    remark: payload.remark?.trim() || null,
  });
};

const updateTicket = async ({
    ticketId,
    lineId,
    stationId,
    activityId,
    partId,
    equipmentId,
    breakdownId,
    engineNo,
    userId,
    raiseBy, 
    reasonId,
    remark,
    expectedClosure,
    actionBy,
    role
}) => {

    return await productionRepository.updateTicket({
        ticketId,
        lineId,
        stationId,
        activityId,
        partId,
        equipmentId,
        breakdownId,
        engineNo,
        userId,
        raiseBy, 
        reasonId,
        remark,
        expectedClosure,
        actionBy,
        role
    });
};

module.exports = {
    getLatestTicketID,
    getTicketReasons,
    getTicketReasonRequiredFields,
    getDepartments,
    createTicketNotifySubmit,
    getOpenProductionTickets,
    getTicketDetails,
    openTicketNotify,
    closeTicket,
    getInspectionPoint,
    getInspectionDefects,
    confirmEngineInspection,
    getReworkTakeInEngines,
    getEngineTakeInDetails,
    engineTakeIn,
    getNonMesControlledMaterials,
    createMaterialRequest,
    getProductionCallLogs,
    getUnassignedDowntime,
    updateDowntime,
    acknowledgeProductionCall,
    closeProductionCall,
    createBreakdown,
    updateTicket
};
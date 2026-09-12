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

module.exports = {
    getLatestTicketID,
    getTicketReasons,
    getTicketReasonRequiredFields,
    getDepartments,
    getOpenProductionTickets,
    getTicketDetails,
    getInspectionPoint,
    getInspectionDefects
};
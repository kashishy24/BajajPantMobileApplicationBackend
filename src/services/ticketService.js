const ticketRepository = require("../repositories/ticketRepository");

const getStations = async () => {

    return await ticketRepository.getStations();

};

const getLines = async () => {

    return await ticketRepository.getLines();

};

const getReasons = async () => {

    return await ticketRepository.getReasons();

};

const getRoles = async () => {

    return await ticketRepository.getRoles();

};

const createTicket = async (data) => {

    return await ticketRepository.createTicket(data);

};

const getOpenMaterialTickets = async () => {

    return await ticketRepository.getOpenMaterialTickets();

};

const getOpenQualityTickets = async () => {

    return await ticketRepository.getOpenQualityTickets();

};

const getOpenMaintenanceTickets = async () => {

    return await ticketRepository.getOpenMaintenanceTickets();

};

const getOpenNotifications = async (userId) => {

    return await ticketRepository.getOpenNotifications(userId);

};

const closeNotifications = async (notificationIds) => {

    return await ticketRepository.closeNotifications(notificationIds);

};

const createIPQCHold = async (data) => {

    return await ticketRepository.createIPQCHold(data);

};

const confirmIPQCHoldService = async ({ ticketId }) => {

    if (!ticketId) {
        throw new Error("TicketID is required");
    }

    const result = await ticketRepository.confirmIPQCHold({
        ticketId
    });

    return result;
};

const createFQCHold = async (data) => {

    if (!data.ticketId) {
        throw new Error("TicketID is required");
    }

    if (Number(data.holdType) === 2 && !data.partId) {
        throw new Error("PartID is required for Batch Hold");
    }

    if (Number(data.holdType) === 3 && !data.planId) {
        throw new Error("PlanID is required for Plan Hold");
    }

    return await ticketRepository.createFQCHold(data);
};

module.exports = {
    getStations,
    getLines,
    getReasons,
    getRoles,
    createTicket,
    getOpenMaterialTickets,
    getOpenQualityTickets,
    getOpenMaintenanceTickets,
    getOpenNotifications,
    closeNotifications,
    createIPQCHold, 
    confirmIPQCHoldService,
    createFQCHold
};
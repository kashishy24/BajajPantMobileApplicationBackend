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

module.exports = {
    getStations,
    getLines,
    getReasons,
    getRoles,
    createTicket
};
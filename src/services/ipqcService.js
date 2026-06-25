const ipqcRepository =
    require("../repositories/ipqcRepository");

const getScheduledDocuments =
    async () => {

        return await ipqcRepository.getScheduledDocuments();

    };

const getAuditList = async (documentId) => {

    if (!documentId) {
        throw new Error("Document ID is required");
    }

    return await ipqcRepository.getAuditList(
        documentId
    );
};

module.exports = {
    getScheduledDocuments,
    getAuditList
};
const { sql } = require("../config/db");

const getStations = async () => {

    const result = await new sql.Request().query(`
        SELECT
            StationID,
            StationName
        FROM Config_Station
        ORDER BY StationName
    `);

    return result.recordset;

};

const getLines = async () => {

    const result = await new sql.Request().query(`
        SELECT
            LineID,
            LineName
        FROM Config_Line
        ORDER BY LineName
    `);

    return result.recordset;

};

const getReasons = async () => {

    const result = await new sql.Request().query(`
        SELECT DISTINCT
            DefectID,
            DefectName
        FROM Config_Inspection_Defect
        ORDER BY DefectName
    `);

    return result.recordset;

};

const getRoles = async () => {

    const result = await new sql.Request().query(`
        SELECT
            RoleID,
            RoleName
        FROM Config_Role
        ORDER BY RoleName
    `);

    return result.recordset;

};

const createTicket = async (data) => {

    const transaction = new sql.Transaction();

    try {

        await transaction.begin();

        const request = new sql.Request(transaction);

        request.input("LineID", sql.Int, data.LineID);
        request.input("StationID", sql.Int, data.StationID);
        request.input("RaiseBy", sql.NVarChar, data.RaiseBy);
        request.input("Reason", sql.NVarChar, data.Reason);
        request.input("Remark", sql.NVarChar, data.Remark);
        request.input("Role", sql.NVarChar, data.Role);
        request.input("Category", sql.NVarChar, data.Category);

        const result = await request.query(`

            DECLARE @TicketID INT;

            SELECT
                @TicketID = ISNULL(MAX(TicketID),0)+1
            FROM TicketManagement;

            INSERT INTO TicketManagement
            (
                TicketID,
                TimeStamp,
                LineID,
                StationID,
                RaiseBy,
                Reason,
                Remark,
                TrackingStatus,
                TicketStatus
            )

            VALUES
            (
                @TicketID,
                GETDATE(),
                @LineID,
                @StationID,
                @RaiseBy,
                @Reason,
                @Remark,
                1,
                1
            );

            INSERT INTO NotificationManagement
            (
                NotificationDesc,
                TimeStamp,
                RaiseBy,
                Category,
                LineID,
                StationID,
                Role,
                Status
            )

            VALUES
            (
                @Reason,
                GETDATE(),
                @RaiseBy,
                @Category,
                @LineID,
                @StationID,
                @Role,
                1
            );

            SELECT @TicketID AS TicketID;

        `);

        await transaction.commit();

        return {
            TicketID: result.recordset[0].TicketID
        };

    } catch (error) {

        await transaction.rollback();

        throw error;

    }

};

module.exports = {
    getStations,
    getLines,
    getReasons,
    getRoles,
    createTicket
};
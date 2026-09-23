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

const getOpenMaterialTickets = async () => {

    const result = await new sql.Request().query(`
        SELECT
            TM.TicketID,
            TM.TimeStamp,
            TM.LineID,
            L.LineName,
            TM.StationID,
            S.StationName,
            TM.RaiseBy,
            TM.Reason,
            TM.Remark,
            TM.ExpectedClosure,
            TM.TicketStatus
        FROM TicketManagement TM
        INNER JOIN Config_Line L
            ON TM.LineID = L.LineID
        INNER JOIN Config_Station S
            ON TM.StationID = S.StationID
        WHERE TM.ActionBy = 'Material'
          AND TM.TicketStatus = 1
        ORDER BY
            TM.TimeStamp DESC
    `);

    return result.recordset;
};

const getOpenQualityTickets = async () => {

    const result = await new sql.Request().query(`
        SELECT
            TM.TicketID,
            TM.TimeStamp,
            TM.LineID,
            L.LineName,
            TM.StationID,
            S.StationName,
            TM.RaiseBy,
            TM.Reason,
            TM.Remark,
            TM.ExpectedClosure,
            TM.TicketStatus
        FROM TicketManagement TM
        INNER JOIN Config_Line L
            ON TM.LineID = L.LineID
        INNER JOIN Config_Station S
            ON TM.StationID = S.StationID
        WHERE TM.ActionBy = 'Quality'
          AND TM.TicketStatus = 1
        ORDER BY
            TM.TimeStamp DESC
    `);

    return result.recordset;
};

const getOpenNotifications = async (userId) => {

    const request = new sql.Request();

    request.input(
        "UserID",
        sql.NVarChar(50),
        userId
    );

    const result = await request.query(`
        SELECT
            NM.NotificationID,
            NM.NotificationDesc,
            NM.TimeStamp,
            NM.RaiseBy,
            RU.UserName AS RaiseByUserName,
            RD.DepartmentName AS RaiseByDepartmentName,
            NM.Category,
            NM.LineID,
            L.LineName,
            NM.StationID,
            S.StationName,
            NM.Role,
            NM.Status
        FROM NotificationManagement NM
        
        -- Logged-in user
        INNER JOIN Config_User U
            ON U.UserID = @UserID
        
        -- Logged-in user's department
        INNER JOIN Config_Department D
            ON U.DepartmentID = D.DepartmentID
        
        -- Notification raised by user
        LEFT JOIN Config_User RU
            ON NM.RaiseBy = RU.UserID
        
        -- Department of notification raiser
        LEFT JOIN Config_Department RD
            ON RU.DepartmentID = RD.DepartmentID
        
        LEFT JOIN Config_Line L
            ON NM.LineID = L.LineID
        
        LEFT JOIN Config_Station S
            ON NM.StationID = S.StationID
        
        WHERE NM.Category = D.DepartmentName
          AND NM.Status = 1
        
        ORDER BY
            NM.TimeStamp DESC;
    `);

    return result.recordset;
};

const closeNotifications = async (notificationIds) => {

    const request = new sql.Request();

    const idList = notificationIds
        .map((id, index) => {
            request.input(`NotificationID${index}`, sql.Int, Number(id));
            return `@NotificationID${index}`;
        })
        .join(",");

    const result = await request.query(`
        UPDATE NotificationManagement
        SET Status = 2
        WHERE NotificationID IN (${idList})
          AND Status = 1;

        SELECT
            NotificationID,
            Status
        FROM NotificationManagement
        WHERE NotificationID IN (${idList});
    `);

    return result.recordset;
};

module.exports = {
    getStations,
    getLines,
    getReasons,
    getRoles,
    createTicket,
    getOpenMaterialTickets,
    getOpenQualityTickets,
    getOpenNotifications,
    closeNotifications
};
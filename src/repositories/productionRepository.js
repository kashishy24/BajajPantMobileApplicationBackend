const { sql } = require("../config/db");

const getLatestTicketID = async () => {

    const result = await new sql.Request().query(`
        SELECT ISNULL(MAX(TicketID), 0) + 1 AS TicketID
        FROM TicketManagement
    `);

    return result.recordset[0];
};

const getTicketReasons = async () => {

    const result = await new sql.Request().query(`
        SELECT
            TR.UID,
            TR.DepartmentID,
            D.DepartmentName,
            TR.Priority
        FROM Config_TicketReason TR
        INNER JOIN Config_Department D
            ON TR.DepartmentID = D.DepartmentID
        ORDER BY
            TR.UID
    `);

    return result.recordset;
};

const getTicketReasonRequiredFields = async (
    departmentId,
    reasonName
) => {

    const request = new sql.Request();

    request.input("DepartmentID", sql.Int, departmentId);
    request.input("ReasonName", sql.NVarChar(100), reasonName);

    const result = await request.query(`
        SELECT
            IsPokaYoka,
            IsEngineNO,
            IsStationID,
            IsPartID,
            IsEquipmentID,
            IsBreakdownID
        FROM Config_TicketReason
        WHERE DepartmentID = @DepartmentID
          AND ReasonName = @ReasonName
    `);

    return result.recordset;
};

const getDepartments = async () => {

    const result = await new sql.Request().query(`
        SELECT
            DepartmentID,
            DepartmentName,
            DepartmentDesc
        FROM Config_Department
        ORDER BY DepartmentName
    `);

    return result.recordset;
};

const getOpenProductionTickets = async () => {

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
        WHERE TM.ActionBy = 'Production'
          AND TM.TicketStatus = 1
        ORDER BY
            TM.TimeStamp DESC
    `);

    return result.recordset;
};

const getTicketDetails = async (ticketId) => {

    const request = new sql.Request();

    request.input("TicketID", sql.Int, ticketId);

    const result = await request.query(`
        SELECT
            TM.UID,
            TM.TicketID,
            TM.TimeStamp,
            TM.LineID,
            TM.StationID,
            TM.ActivityID,
            TM.PartID,
            TM.EquipmentID,
            TM.BreakdownID,
            TM.EngineNo,
            TM.RaiseBy,
            TM.Reason,
            TM.ActionBy,
            TM.Remark,
            TM.TrackingSeqNo,
            TM.ExpectedClosure,
            TM.TicketStatus
        FROM TicketManagement TM
        WHERE TM.TicketID = @TicketID
    `);

    return result.recordset;
};

const getInspectionPoint = async () => {

    const request = new sql.Request();

    const result = await request.query(`
        SELECT
            UID,
            InspectionPointID,
            InspectionStationID,
            ModelFamilyID,
            ModelID,
            SKUID,
            InspectionPointName,
            InspectionPointDes,
            InspectionPointType,
            InspectionPointAction
        FROM Config_Inspection_Point
    `);

    return result.recordset;
};

const getInspectionDefects = async (inspectionPointId) => {

    const request = new sql.Request();

    request.input(
        "InspectionPointID",
        sql.Int,
        inspectionPointId
    );

    const result = await request.query(`
        SELECT
            UID,
            DefectID,
            InspectionPointID,
            DefectName,
            QAlertStation
        FROM Config_Inspection_Defect
        WHERE InspectionPointID = @InspectionPointID
        ORDER BY DefectName
    `);

    return result.recordset;
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
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

const getReworkTakeInEngines = async () => {

    const request = new sql.Request();

    const result = await request.query(`
        SELECT
            VREngineNo,
            EngineNo,
            PlanID,
            SKUID,
            LineID,
            Status,
            NotOkStation,
            SAMarrigeStatus
        FROM Prod_Engine_WIP
        WHERE Status IN (13, 15, 17, 20, 22, 25, 27)
        ORDER BY
            EndTime DESC,
            StartTime DESC
    `);

    return result.recordset;
};

const getEngineTakeInDetails = async (engineNo, vrEngineNo) => {

    const request = new sql.Request();

    request.input(
        "EngineNo",
        sql.NVarChar(14),
        engineNo || null
    );

    request.input(
        "VREngineNo",
        sql.NVarChar(10),
        vrEngineNo || null
    );

    const result = await request.query(`
        SELECT
            VREngineNo,
            EngineNo,
            LineID,
            ReEntryStation,
            Status,
            StartTime,
            EndTime,
            PlanID,
            SKUID,
            KITID,
            NotOkStation,
            SAMarrigeStatus
        FROM Prod_Engine_WIP
        WHERE
            (@EngineNo IS NOT NULL AND EngineNo = @EngineNo)
            OR
            (@VREngineNo IS NOT NULL AND VREngineNo = @VREngineNo)
    `);

    return result.recordset;
};

const engineTakeIn = async (
    engineNo,
    takeINStation
) => {

    const request = new sql.Request();

    request.input(
        "EngineNo",
        sql.NVarChar(14),
        engineNo
    );

    request.input(
        "TakeINStation",
        sql.Int,
        takeINStation
    );

    const result = await request.query(`
        UPDATE Prod_Engine_WIP
        SET
            ReEntryStation = @TakeINStation,
            Status = 5
        WHERE EngineNo = @EngineNo
    `);

    return result.recordsets[1];
};

const getNonMesControlledMaterials = async (
    stationId,
    lineId
) => {

    const request = new sql.Request();

    request.input(
        "StationID",
        sql.Int,
        stationId
    );

    request.input(
        "LineID",
        sql.Int,
        lineId
    );

    const result = await request.query(`
        SELECT
            PP.PlanID,
            PP.LineID,
            BOM.StationID,
            BOM.PartID,
            BOM.PartDesc AS PartName
        FROM Prod_Plan PP
        INNER JOIN Config_BOM BOM
            ON PP.SKUID = BOM.SKUID
        WHERE PP.Status IN (2, 3)
          AND PP.LineID = @LineID
          AND BOM.StationID = @StationID
          AND BOM.MesControlled = 2
        ORDER BY
            PP.PlanID,
            BOM.PartID
    `);

    return result.recordset;
};

const createMaterialRequest = async (
    partId,
    stationId,
    lineId,
    planId
) => {

    const request = new sql.Request();

    request.input(
        "PartID",
        sql.NVarChar(20),
        partId
    );

    request.input(
        "StationID",
        sql.Int,
        stationId
    );

    request.input(
        "LineID",
        sql.Int,
        lineId
    );

    request.input(
        "PlanID",
        sql.Int,
        planId
    );

    const result = await request.query(`

        BEGIN TRANSACTION;

        BEGIN TRY

            /*
               Check if request already exists
            */
            IF EXISTS (
                SELECT 1
                FROM Material_Running_Plan
                WHERE PlanID = @PlanID
                  AND PartID = @PartID
                  AND MesControlled = 2
            )
            BEGIN

                SELECT
                    UID,
                    PlanID,
                    PartID,
                    TotalRequiredQty,
                    RequiredQty,
                    ToBeIssuedQty,
                    DeliveredQty,
                    ConsumedQty,
                    MesControlled,
                    Status
                FROM Material_Running_Plan
                WHERE PlanID = @PlanID
                  AND PartID = @PartID
                  AND MesControlled = 2;

            END
            ELSE
            BEGIN

                INSERT INTO Material_Running_Plan
                (
                    PlanID,
                    PartID,
                    TotalRequiredQty,
                    RequiredQty,
                    ToBeIssuedQty,
                    DeliveredQty,
                    ConsumedQty,
                    MesControlled,
                    Status
                )
                VALUES
                (
                    @PlanID,
                    @PartID,
                    0,
                    0,
                    0,
                    0,
                    0,
                    2,
                    1
                );


                SELECT
                    UID,
                    PlanID,
                    PartID,
                    TotalRequiredQty,
                    RequiredQty,
                    ToBeIssuedQty,
                    DeliveredQty,
                    ConsumedQty,
                    MesControlled,
                    Status
                FROM Material_Running_Plan
                WHERE UID = SCOPE_IDENTITY();

            END;


            COMMIT TRANSACTION;

        END TRY

        BEGIN CATCH

            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            THROW;

        END CATCH;
    `);

    return result.recordset;
};

const getProductionCallLogs = async () => {

    const result = await new sql.Request().query(`
        SELECT
            RowId,
            ProdDate,
            ProdShift,
            LineID,
            StationID,
            StartTime,
            AckTime,
            EndTime,
            CallStatus
        FROM Prod_Call_Log
        WHERE CallStatus IN (1, 2)
        ORDER BY
            StartTime DESC
    `);

    return result.recordset;
};

const acknowledgeProductionCall = async (
    rowId,
    lineId,
    stationId
) => {

    const request = new sql.Request();

    request.input(
        "RowId",
        sql.Int,
        rowId
    );

    request.input(
        "LineID",
        sql.Int,
        lineId
    );

    request.input(
        "StationID",
        sql.Int,
        stationId
    );

    const result = await request.query(`

        UPDATE Prod_Call_Log
        SET
            AckTime = GETDATE(),
            CallStatus = 2
        WHERE RowId = @RowId
          AND LineID = @LineID
          AND StationID = @StationID
          AND CallStatus = 1;

        IF @@ROWCOUNT = 0
        BEGIN
            THROW 50001,
                'Production call not found or already acknowledged',
                1;
        END;

        SELECT
            RowId,
            ProdDate,
            ProdShift,
            LineID,
            StationID,
            StartTime,
            AckTime,
            EndTime,
            CallStatus
        FROM Prod_Call_Log
        WHERE RowId = @RowId;
    `);

    return result.recordset;
};

const closeProductionCall = async (
    rowId,
    lineId,
    stationId
) => {

    const request = new sql.Request();

    request.input(
        "RowId",
        sql.Int,
        rowId
    );

    request.input(
        "LineID",
        sql.Int,
        lineId
    );

    request.input(
        "StationID",
        sql.Int,
        stationId
    );

    const result = await request.query(`

        UPDATE Prod_Call_Log
        SET
            EndTime = GETDATE(),
            CallStatus = 3
        WHERE RowId = @RowId
          AND LineID = @LineID
          AND StationID = @StationID
          AND CallStatus = 2;

        IF @@ROWCOUNT = 0
        BEGIN
            THROW 50002,
                'Production call not found or not acknowledged',
                1;
        END;

        SELECT
            RowId,
            ProdDate,
            ProdShift,
            LineID,
            StationID,
            StartTime,
            AckTime,
            EndTime,
            CallStatus
        FROM Prod_Call_Log
        WHERE RowId = @RowId;
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
    getInspectionDefects,
    getReworkTakeInEngines,
    getEngineTakeInDetails,
    engineTakeIn,
    getNonMesControlledMaterials,
    createMaterialRequest,
    getProductionCallLogs,
    acknowledgeProductionCall,
    closeProductionCall
};
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
            TR.ReasonName,
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

    const request = new sql.Request();

    request.input("LineID", sql.Int, lineId);
    request.input("StationID", sql.Int, stationId);
    request.input("ActivityID", sql.Int, activityId ?? null);
    request.input("PartID", sql.NVarChar(20), partId ?? null);
    request.input("EquipmentID", sql.Int, equipmentId ?? null);
    request.input("BreakdownID", sql.Int, breakdownId ?? null);
    request.input("EngineNo", sql.NVarChar(14), engineNo ?? null);
    request.input("UserID", sql.NVarChar(50), userId);
    request.input("ReasonID", sql.Int, reasonId);
    request.input("Remark", sql.NVarChar(sql.MAX), remark ?? null);
    request.input("ExpectedClosure", sql.Date, expectedClosure ?? null);
    request.input("ActionBy", sql.NVarChar(50), actionBy);
    request.input("Role", sql.NVarChar(50), role);

    const result = await request.query(`
        SET NOCOUNT ON;

        BEGIN TRY

            BEGIN TRANSACTION;

            DECLARE @TicketID INT;
            DECLARE @ReasonName NVARCHAR(100);
            DECLARE @DepartmentID INT;
            DECLARE @DepartmentName NVARCHAR(100);

            /* =====================================================
               1. Get User Department
               ===================================================== */

            SELECT TOP 1
                @DepartmentID = U.DepartmentID
            FROM Config_User U
            WHERE U.UserID = @UserID;

            IF @DepartmentID IS NULL
            BEGIN
                THROW 50001, 'User not found or DepartmentID not configured', 1;
            END;


            /* =====================================================
               2. Get Department Name
               ===================================================== */

            SELECT TOP 1
                @DepartmentName = D.DepartmentName
            FROM Config_Department D
            WHERE D.DepartmentID = @DepartmentID;

            IF @DepartmentName IS NULL
            BEGIN
                THROW 50002, 'Department not found for UserID', 1;
            END;


            /* =====================================================
               3. Get Reason Name
               ===================================================== */

            SELECT TOP 1
                @ReasonName = ReasonName
            FROM Config_TicketReason
            WHERE UID = @ReasonID;

            IF @ReasonName IS NULL
            BEGIN
                THROW 50003, 'Reason not found for ReasonID', 1;
            END;


            /* =====================================================
               4. Generate New TicketID
               ===================================================== */

            SELECT
                @TicketID = ISNULL(MAX(TicketID), 0) + 1
            FROM TicketManagement;


            /* =====================================================
               5. Insert TicketManagement
               ===================================================== */

            INSERT INTO TicketManagement
            (
                TicketID,
                TimeStamp,
                LineID,
                StationID,
                ActivityID,
                PartID,
                EquipmentID,
                BreakdownID,
                EngineNo,
                RaiseBy,
                Reason,
                ActionBy,
                Remark,
                TrackingSeqNo,
                ExpectedClosure,
                TicketStatus
            )
            VALUES
            (
                @TicketID,
                GETDATE(),
                @LineID,
                @StationID,
                @ActivityID,
                @PartID,
                @EquipmentID,
                @BreakdownID,
                @EngineNo,
                @DepartmentName,
                @ReasonName,
                @ActionBy,
                @Remark,
                1,
                @ExpectedClosure,
                1
            );


            /* =====================================================
               6. Insert NotificationManagement
               ===================================================== */

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
                @ReasonName,
                GETDATE(),
                @UserID,
                @ActionBy,
                @LineID,
                @StationID,
                @Role,
                1
            );


            /* =====================================================
               7. Return Created Ticket
               ===================================================== */

            SELECT
                UID,
                TicketID,
                TimeStamp,
                LineID,
                StationID,
                ActivityID,
                PartID,
                EquipmentID,
                BreakdownID,
                EngineNo,
                RaiseBy,
                Reason,
                ActionBy,
                Remark,
                TrackingSeqNo,
                ExpectedClosure,
                TicketStatus
            FROM TicketManagement
            WHERE TicketID = @TicketID;


            /* =====================================================
               8. Return Created Notification
               ===================================================== */

            SELECT TOP 1
                NotificationID,
                NotificationDesc,
                TimeStamp,
                RaiseBy,
                Category,
                LineID,
                StationID,
                Role,
                Status
            FROM NotificationManagement
            WHERE RaiseBy = @UserID
              AND LineID = @LineID
              AND StationID = @StationID
              AND NotificationDesc = @ReasonName
            ORDER BY NotificationID DESC;


            /* =====================================================
               9. Return Additional Information
               ===================================================== */

            SELECT
                @TicketID AS TicketID,
                @DepartmentID AS DepartmentID,
                @DepartmentName AS RaiseBy,
                @ReasonID AS ReasonID,
                @ReasonName AS ReasonName;


            COMMIT TRANSACTION;

        END TRY

        BEGIN CATCH

            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            THROW;

        END CATCH;
    `);

    return {
        ticket: result.recordsets[0][0],
        notification: result.recordsets[1][0],
        details: result.recordsets[2][0]
    };
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

const submitUpdateTicket = async ({
    ticketId,
    userId,
    remark,
    actionBy
}) => {

    const request = new sql.Request();

    request.input("TicketID", sql.Int, Number(ticketId));
    request.input("UserID", sql.NVarChar(50), userId);
    request.input("Remark", sql.NVarChar(sql.MAX), remark ?? null);
    request.input("ActionBy", sql.NVarChar(50), actionBy);

    const result = await request.query(`
        SET NOCOUNT ON;

        BEGIN TRY

            BEGIN TRANSACTION;

            DECLARE @DepartmentID INT;
            DECLARE @DepartmentName NVARCHAR(100);
            DECLARE @TrackingSeqNo INT;

            /* =====================================================
               1. Check Ticket Exists
               ===================================================== */

            IF NOT EXISTS
            (
                SELECT 1
                FROM TicketManagement
                WHERE TicketID = @TicketID
            )
            BEGIN
                THROW 50001, 'TicketID not found', 1;
            END;


            /* =====================================================
               2. Check Ticket is Open
               ===================================================== */

            IF NOT EXISTS
            (
                SELECT 1
                FROM TicketManagement
                WHERE TicketID = @TicketID
                  AND TicketStatus = 1
            )
            BEGIN
                THROW 50002, 'Ticket is already closed', 1;
            END;


            /* =====================================================
               3. Get User Department
               ===================================================== */

            SELECT TOP 1
                @DepartmentID = U.DepartmentID
            FROM Config_User U
            WHERE U.UserID = @UserID;

            IF @DepartmentID IS NULL
            BEGIN
                THROW 50003, 'User not found or DepartmentID not configured', 1;
            END;


            /* =====================================================
               4. Get Department Name
               ===================================================== */

            SELECT TOP 1
                @DepartmentName = D.DepartmentName
            FROM Config_Department D
            WHERE D.DepartmentID = @DepartmentID;

            IF @DepartmentName IS NULL
            BEGIN
                THROW 50004, 'Department not found for UserID', 1;
            END;


            /* =====================================================
               5. Get Next Tracking Sequence
               ===================================================== */

            SELECT
                @TrackingSeqNo = ISNULL(MAX(TrackingSeqNo), 0) + 1
            FROM TicketManagement WITH (UPDLOCK, HOLDLOCK)
            WHERE TicketID = @TicketID;


            /* =====================================================
               6. Insert New Ticket Tracking Entry
               ===================================================== */

            INSERT INTO TicketManagement
            (
                TicketID,
                TimeStamp,
                LineID,
                StationID,
                ActivityID,
                PartID,
                EquipmentID,
                BreakdownID,
                EngineNo,
                RaiseBy,
                Reason,
                ActionBy,
                Remark,
                TrackingSeqNo,
                ExpectedClosure,
                TicketStatus
            )
            SELECT TOP 1
                TicketID,
                GETDATE(),
                LineID,
                StationID,
                ActivityID,
                PartID,
                EquipmentID,
                BreakdownID,
                EngineNo,
                @DepartmentName,
                Reason,
                @ActionBy,
                @Remark,
                @TrackingSeqNo,
                ExpectedClosure,
                1
            FROM TicketManagement
            WHERE TicketID = @TicketID
            ORDER BY UID DESC;


            /* =====================================================
               7. Return Created Tracking Entry
               ===================================================== */

            SELECT TOP 1
                UID,
                TicketID,
                TimeStamp,
                LineID,
                StationID,
                ActivityID,
                PartID,
                EquipmentID,
                BreakdownID,
                EngineNo,
                RaiseBy,
                Reason,
                ActionBy,
                Remark,
                TrackingSeqNo,
                ExpectedClosure,
                TicketStatus
            FROM TicketManagement
            WHERE TicketID = @TicketID
              AND TrackingSeqNo = @TrackingSeqNo
            ORDER BY UID DESC;


            COMMIT TRANSACTION;

        END TRY

        BEGIN CATCH

            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            THROW;

        END CATCH;
    `);

    return {
        ticket: result.recordset[0]
    };
};

const closeTicket = async ({
    ticketId,
    userId,
    remark,
    actionBy
}) => {

    const request = new sql.Request();

    request.input("TicketID", sql.Int, Number(ticketId));
    request.input("UserID", sql.NVarChar(50), userId);
    request.input("Remark", sql.NVarChar(sql.MAX), remark ?? null);
    request.input("ActionBy", sql.NVarChar(50), actionBy);

    const result = await request.query(`
        SET NOCOUNT ON;

        BEGIN TRY

            BEGIN TRANSACTION;

            DECLARE @DepartmentID INT;
            DECLARE @DepartmentName NVARCHAR(100);
            DECLARE @TrackingSeqNo INT;

            /* =====================================================
               1. Check Ticket Exists
               ===================================================== */

            IF NOT EXISTS
            (
                SELECT 1
                FROM TicketManagement
                WHERE TicketID = @TicketID
            )
            BEGIN
                THROW 50001, 'TicketID not found', 1;
            END;


            /* =====================================================
               2. Check Ticket is Open
               ===================================================== */

            IF NOT EXISTS
            (
                SELECT 1
                FROM TicketManagement
                WHERE TicketID = @TicketID
                  AND TicketStatus = 1
            )
            BEGIN
                THROW 50002, 'Ticket is already closed', 1;
            END;


            /* =====================================================
               3. Get User Department
               ===================================================== */

            SELECT TOP 1
                @DepartmentID = U.DepartmentID
            FROM Config_User U
            WHERE U.UserID = @UserID;


            IF @DepartmentID IS NULL
            BEGIN
                THROW 50003, 'User not found or DepartmentID not configured', 1;
            END;


            /* =====================================================
               4. Get Department Name
               ===================================================== */

            SELECT TOP 1
                @DepartmentName = D.DepartmentName
            FROM Config_Department D
            WHERE D.DepartmentID = @DepartmentID;


            IF @DepartmentName IS NULL
            BEGIN
                THROW 50004, 'Department not found for UserID', 1;
            END;


            /* =====================================================
               5. Get Next Tracking Sequence
               ===================================================== */

            SELECT
                @TrackingSeqNo = ISNULL(MAX(TrackingSeqNo), 0) + 1
            FROM TicketManagement WITH (UPDLOCK, HOLDLOCK)
            WHERE TicketID = @TicketID;


            /* =====================================================
               6. Insert New Closed Tracking Entry
               ===================================================== */

            INSERT INTO TicketManagement
            (
                TicketID,
                TimeStamp,
                LineID,
                StationID,
                ActivityID,
                PartID,
                EquipmentID,
                BreakdownID,
                EngineNo,
                RaiseBy,
                Reason,
                ActionBy,
                Remark,
                TrackingSeqNo,
                ExpectedClosure,
                TicketStatus
            )
            SELECT TOP 1
                TicketID,
                GETDATE(),
                LineID,
                StationID,
                ActivityID,
                PartID,
                EquipmentID,
                BreakdownID,
                EngineNo,
                @DepartmentName,
                Reason,
                @ActionBy,
                @Remark,
                @TrackingSeqNo,
                ExpectedClosure,
                2
            FROM TicketManagement
            WHERE TicketID = @TicketID
            ORDER BY UID DESC;


            /* =====================================================
               6.1. Close ALL Entries for TicketID
               ===================================================== */

            UPDATE TicketManagement
            SET
                TicketStatus = 2
            WHERE TicketID = @TicketID;


            /* =====================================================
               7. Return Newly Created Closed Entry
               ===================================================== */

            SELECT TOP 1
                UID,
                TicketID,
                TimeStamp,
                LineID,
                StationID,
                ActivityID,
                PartID,
                EquipmentID,
                BreakdownID,
                EngineNo,
                RaiseBy,
                Reason,
                ActionBy,
                Remark,
                TrackingSeqNo,
                ExpectedClosure,
                TicketStatus
            FROM TicketManagement
            WHERE TicketID = @TicketID
              AND TrackingSeqNo = @TrackingSeqNo
            ORDER BY UID DESC;


            COMMIT TRANSACTION;

        END TRY

        BEGIN CATCH

            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            THROW;

        END CATCH;
    `);

    return {
        ticket: result.recordset[0]
    };
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

const confirmEngineInspection = async ({
    ticketId,
    auditGroup,
    holdType,
    partId,
    planId,
    forwardQty,
    backwordQty,
    inspectionDetails,
    userId
}) => {

    const request = new sql.Request();


    request.input(
        "TicketID",
        sql.Int,
        ticketId
    );

    request.input(
        "AuditGroup",
        sql.Int,
        auditGroup
    );

    request.input(
        "HoldType",
        sql.Int,
        holdType
    );

    request.input(
        "PartID",
        sql.NVarChar(20),
        partId
    );

    request.input(
        "PlanID",
        sql.Int,
        planId
    );

    request.input(
        "ForwardQty",
        sql.Int,
        forwardQty
    );

    request.input(
        "BackwordQty",
        sql.Int,
        backwordQty
    );

    request.input(
        "UserID",
        sql.NVarChar(50),
        userId
    );


    /*
     * Convert inspectionDetails array
     * into JSON for SQL Server.
     */
    request.input(
        "InspectionDetails",
        sql.NVarChar(sql.MAX),
        JSON.stringify(inspectionDetails)
    );


    const result = await request.query(`

        SET NOCOUNT ON;


        BEGIN TRY

            BEGIN TRANSACTION;


            /* =========================================================
               VARIABLES
               ========================================================= */

            DECLARE @EngineNo NVARCHAR(14);
            DECLARE @SelectedPlanID INT;
            DECLARE @SelectedLineID INT;
            DECLARE @SelectedSKUID INT;
            DECLARE @PartBatchID NVARCHAR(20);


            /* =========================================================
               1. GET ENGINE NO FROM TICKET
               ========================================================= */

            SELECT TOP 1
                @EngineNo = EngineNo
            FROM TicketManagement
            WHERE TicketID = @TicketID
              AND EngineNo IS NOT NULL
            ORDER BY UID DESC;


            IF @EngineNo IS NULL
            BEGIN

                THROW 50001,
                    'Engine number not found against TicketID',
                    1;

            END;


            /* =========================================================
               2. GET SELECTED ENGINE INFORMATION
               ========================================================= */

            SELECT TOP 1
                @SelectedPlanID = PlanID,
                @SelectedLineID = LineID,
                @SelectedSKUID = SKUID
            FROM Prod_Engine_WIP
            WHERE EngineNo = @EngineNo;


            IF @SelectedPlanID IS NULL
            BEGIN

                SELECT TOP 1
                    @SelectedPlanID = PlanID,
                    @SelectedLineID = LineID,
                    @SelectedSKUID = SKUID
                FROM Prod_Engine_WIPHistory
                WHERE EngineNo = @EngineNo;

            END;


            IF @SelectedPlanID IS NULL
            BEGIN

                THROW 50002,
                    'Engine not found in Prod_Engine_WIP or Prod_Engine_WIPHistory',
                    1;

            END;


            /* =========================================================
               3. GET BATCH ID FOR BATCH HOLD
               ========================================================= */

            IF @HoldType = 2
            BEGIN

                SELECT TOP 1
                    @PartBatchID = BatchID
                FROM Prod_Engine_Part_Geneology
                WHERE EngineNo = @EngineNo
                  AND PartID = @PartID
                ORDER BY UID DESC;


                IF @PartBatchID IS NULL
                BEGIN

                    THROW 50003,
                        'BatchID not found for selected EngineNo and PartID',
                        1;

                END;

            END;


            /* =========================================================
               4. INSERT PROD_ENGINEHOLD
               ========================================================= */

            INSERT INTO Prod_EngineHold
            (
                TicketID,
                AuditGroup,
                HoldType,
                PartID,
                PartBatchID,
                PlanID,
                ForwardQty,
                BackwordQty,
                OkQty,
                RejectedQty,
                Status
            )
            VALUES
            (
                @TicketID,
                @AuditGroup,
                @HoldType,
                @PartID,

                CASE
                    WHEN @HoldType = 2
                        THEN @PartBatchID
                    ELSE @PartID
                END,

                CASE
                    WHEN @HoldType = 3
                        THEN @PlanID
                    ELSE @SelectedPlanID
                END,

                @ForwardQty,
                @BackwordQty,
                0,
                0,
                2
            );


            DECLARE @EngineHoldUID INT;

            SET @EngineHoldUID = SCOPE_IDENTITY();


            /* =========================================================
               5. CREATE INSPECTION DETAILS TABLE
               ========================================================= */

            DECLARE @InspectionDetailsTable TABLE
            (
                InspectionPointID INT,
                InspectionDefectID INT,
                Remarks NVARCHAR(MAX)
            );


            INSERT INTO @InspectionDetailsTable
            (
                InspectionPointID,
                InspectionDefectID,
                Remarks
            )
            SELECT
                InspectionPointID,
                InspectionDefectID,
                Remarks
            FROM OPENJSON(@InspectionDetails)
            WITH
            (
                InspectionPointID INT
                    '$.inspectionPointId',

                InspectionDefectID INT
                    '$.inspectionDefectId',

                Remarks NVARCHAR(MAX)
                    '$.remarks'
            );


            /* =========================================================
               6. VALIDATE INSPECTION DETAILS
               ========================================================= */

            IF NOT EXISTS
            (
                SELECT 1
                FROM @InspectionDetailsTable
            )
            BEGIN

                THROW 50004,
                    'At least one inspection detail is required',
                    1;

            END;


            /* =========================================================
               7. TEMP TABLE FOR AFFECTED ENGINES
               ========================================================= */

            CREATE TABLE #AffectedEngines
            (
                EngineNo NVARCHAR(14) PRIMARY KEY,
                TargetStatus INT
            );


            /* =========================================================
               8. HOLD TYPE = 1
            
               ENGINE HOLD
            
               Selected engine = 14
               Forward/Backward = 16
            
               VALIDATION:
               If requested ForwardQty or BackwordQty is not
               completely available, reject the complete request.
               ========================================================= */
            
            IF @HoldType = 1
            BEGIN
            
                DECLARE @AvailableForwardQty INT;
                DECLARE @AvailableBackwordQty INT;
            
            
                /* =====================================================
                   8.1 CHECK AVAILABLE FORWARD ENGINES
                   ===================================================== */
            
                SELECT
                    @AvailableForwardQty = COUNT(*)
                FROM
                (
                    SELECT
                        EngineNo,
                        StartTime
                    FROM Prod_Engine_WIP
                    WHERE PlanID = @SelectedPlanID
                      AND LineID = @SelectedLineID
                      AND EngineNo <> @EngineNo
            
                    UNION ALL
            
                    SELECT
                        EngineNo,
                        StartTime
                    FROM Prod_Engine_WIPHistory
                    WHERE PlanID = @SelectedPlanID
                      AND LineID = @SelectedLineID
                      AND EngineNo <> @EngineNo
            
                ) E
                WHERE E.StartTime >
                (
                    SELECT TOP 1
                        StartTime
                    FROM
                    (
                        SELECT
                            StartTime
                        FROM Prod_Engine_WIP
                        WHERE EngineNo = @EngineNo
            
                        UNION ALL
            
                        SELECT
                            StartTime
                        FROM Prod_Engine_WIPHistory
                        WHERE EngineNo = @EngineNo
                    ) S
                    ORDER BY StartTime
                );
            
            
                /* =====================================================
                   8.2 CHECK AVAILABLE BACKWARD ENGINES
                   ===================================================== */
            
                SELECT
                    @AvailableBackwordQty = COUNT(*)
                FROM
                (
                    SELECT
                        EngineNo,
                        StartTime
                    FROM Prod_Engine_WIP
                    WHERE PlanID = @SelectedPlanID
                      AND LineID = @SelectedLineID
                      AND EngineNo <> @EngineNo
            
                    UNION ALL
            
                    SELECT
                        EngineNo,
                        StartTime
                    FROM Prod_Engine_WIPHistory
                    WHERE PlanID = @SelectedPlanID
                      AND LineID = @SelectedLineID
                      AND EngineNo <> @EngineNo
            
                ) E
                WHERE E.StartTime <
                (
                    SELECT TOP 1
                        StartTime
                    FROM
                    (
                        SELECT
                            StartTime
                        FROM Prod_Engine_WIP
                        WHERE EngineNo = @EngineNo
            
                        UNION ALL
            
                        SELECT
                            StartTime
                        FROM Prod_Engine_WIPHistory
                        WHERE EngineNo = @EngineNo
                    ) S
                    ORDER BY StartTime DESC
                );
            
            
                /* =====================================================
                   8.3 VALIDATE FORWARD QUANTITY
                   ===================================================== */
            
                IF @AvailableForwardQty < @ForwardQty
                BEGIN
            
                    THROW 50005,
                        'Requested forward engine quantity is not available',
                        1;
            
                END;
            
            
                /* =====================================================
                   8.4 VALIDATE BACKWARD QUANTITY
                   ===================================================== */
            
                IF @AvailableBackwordQty < @BackwordQty
                BEGIN
            
                    THROW 50006,
                        'Requested backward engine quantity is not available',
                        1;
            
                END;
            
            
                /* =====================================================
                   8.5 ADD SELECTED ENGINE
                   ===================================================== */
            
                INSERT INTO #AffectedEngines
                (
                    EngineNo,
                    TargetStatus
                )
                VALUES
                (
                    @EngineNo,
                    14
                );
            
            
                /* =====================================================
                   8.6 ADD FORWARD ENGINES
                   ===================================================== */
            
                INSERT INTO #AffectedEngines
                (
                    EngineNo,
                    TargetStatus
                )
                SELECT TOP (@ForwardQty)
                    E.EngineNo,
                    16
                FROM
                (
                    SELECT
                        EngineNo,
                        StartTime
                    FROM Prod_Engine_WIP
                    WHERE PlanID = @SelectedPlanID
                      AND LineID = @SelectedLineID
                      AND EngineNo <> @EngineNo
            
                    UNION ALL
            
                    SELECT
                        EngineNo,
                        StartTime
                    FROM Prod_Engine_WIPHistory
                    WHERE PlanID = @SelectedPlanID
                      AND LineID = @SelectedLineID
                      AND EngineNo <> @EngineNo
            
                ) E
                WHERE E.StartTime >
                (
                    SELECT TOP 1
                        StartTime
                    FROM
                    (
                        SELECT
                            StartTime
                        FROM Prod_Engine_WIP
                        WHERE EngineNo = @EngineNo
            
                        UNION ALL
            
                        SELECT
                            StartTime
                        FROM Prod_Engine_WIPHistory
                        WHERE EngineNo = @EngineNo
                    ) S
                    ORDER BY StartTime
                )
                ORDER BY
                    E.StartTime ASC;
            
            
                /* =====================================================
                   8.7 ADD BACKWARD ENGINES
                   ===================================================== */
            
                INSERT INTO #AffectedEngines
                (
                    EngineNo,
                    TargetStatus
                )
                SELECT TOP (@BackwordQty)
                    E.EngineNo,
                    16
                FROM
                (
                    SELECT
                        EngineNo,
                        StartTime
                    FROM Prod_Engine_WIP
                    WHERE PlanID = @SelectedPlanID
                      AND LineID = @SelectedLineID
                      AND EngineNo <> @EngineNo
            
                    UNION ALL
            
                    SELECT
                        EngineNo,
                        StartTime
                    FROM Prod_Engine_WIPHistory
                    WHERE PlanID = @SelectedPlanID
                      AND LineID = @SelectedLineID
                      AND EngineNo <> @EngineNo
            
                ) E
                WHERE E.StartTime <
                (
                    SELECT TOP 1
                        StartTime
                    FROM
                    (
                        SELECT
                            StartTime
                        FROM Prod_Engine_WIP
                        WHERE EngineNo = @EngineNo
            
                        UNION ALL
            
                        SELECT
                            StartTime
                        FROM Prod_Engine_WIPHistory
                        WHERE EngineNo = @EngineNo
                    ) S
                    ORDER BY StartTime DESC
                )
                AND NOT EXISTS
                (
                    SELECT 1
                    FROM #AffectedEngines A
                    WHERE A.EngineNo = E.EngineNo
                )
                ORDER BY
                    E.StartTime DESC;
            
            END;


            /* =========================================================
               9. HOLD TYPE = 2
               
               BATCH HOLD
               ========================================================= */

            ELSE IF @HoldType = 2
            BEGIN

                INSERT INTO #AffectedEngines
                (
                    EngineNo,
                    TargetStatus
                )
                SELECT DISTINCT
                    G.EngineNo,

                    CASE
                        WHEN G.EngineNo = @EngineNo
                            THEN 14
                        ELSE 16
                    END

                FROM Prod_Engine_Part_Geneology G
                WHERE G.PartID = @PartID
                  AND G.BatchID = @PartBatchID
                  AND G.EngineNo IS NOT NULL;


            END;


            /* =========================================================
               10. HOLD TYPE = 3
               
               PLAN HOLD
               ========================================================= */

            ELSE IF @HoldType = 3
            BEGIN

                INSERT INTO #AffectedEngines
                (
                    EngineNo,
                    TargetStatus
                )
                SELECT DISTINCT
                    E.EngineNo,

                    CASE
                        WHEN E.EngineNo = @EngineNo
                            THEN 14
                        ELSE 16
                    END

                FROM
                (
                    SELECT EngineNo
                    FROM Prod_Engine_WIP
                    WHERE PlanID = @PlanID

                    UNION ALL

                    SELECT EngineNo
                    FROM Prod_Engine_WIPHistory
                    WHERE PlanID = @PlanID

                ) E

                WHERE E.EngineNo IS NOT NULL;

            END;


            /* =========================================================
               11. ENSURE SELECTED ENGINE EXISTS
               ========================================================= */

            IF NOT EXISTS
            (
                SELECT 1
                FROM #AffectedEngines
                WHERE EngineNo = @EngineNo
            )
            BEGIN

                INSERT INTO #AffectedEngines
                (
                    EngineNo,
                    TargetStatus
                )
                VALUES
                (
                    @EngineNo,
                    14
                );

            END;


            /* =========================================================
               12. MOVE HISTORY ENGINES INTO WIP
               ========================================================= */

            INSERT INTO Prod_Engine_WIP
            (
                VREngineNo,
                EngineNo,
                PlanID,
                SKUID,
                LineID,
                KITID,
                StartTime,
                EndTime,
                Status,
                NotOkStation,
                ReEntryStation,
                SAMarrigeStatus
            )
            SELECT
                H.VREngineNo,
                H.EngineNo,
                H.PlanID,
                H.SKUID,
                H.LineID,
                H.KITID,
                H.StartTime,
                H.EndTime,
                A.TargetStatus,
                H.NotOkStation,
                H.ReEntryStation,
                H.SAMarrigeStatus

            FROM Prod_Engine_WIPHistory H

            INNER JOIN #AffectedEngines A
                ON H.EngineNo = A.EngineNo

            WHERE NOT EXISTS
            (
                SELECT 1
                FROM Prod_Engine_WIP W
                WHERE W.VREngineNo = H.VREngineNo
            );


            /* =========================================================
               13. DELETE MOVED HISTORY RECORDS
               ========================================================= */

            DELETE H

            FROM Prod_Engine_WIPHistory H

            INNER JOIN #AffectedEngines A
                ON H.EngineNo = A.EngineNo

            INNER JOIN Prod_Engine_WIP W
                ON W.VREngineNo = H.VREngineNo;


            /* =========================================================
               14. UPDATE WIP STATUS
               ========================================================= */

            UPDATE W

            SET
                W.Status = A.TargetStatus

            FROM Prod_Engine_WIP W

            INNER JOIN #AffectedEngines A
                ON W.EngineNo = A.EngineNo;


            /* =========================================================
               15. INSERT DEFECT LOG
               
               CROSS JOIN:
               
               Affected Engines
                       X
               Inspection Details
               
               Example:
               
               4 Engines
               3 Defects
               
               = 12 Defect Logs
               ========================================================= */

            INSERT INTO Prod_Defect_Log
            (
                TicketID,
                TimeStamp,
                InspectionRefID,
                DefectRefID,
                EngineNo,
                Remark,
                EngineStatus,
                DefectStatus,
                UpdatedBy,
                LastUpdatedTime,
                QAlert
            )

            SELECT
                @TicketID,
                GETDATE(),

                I.InspectionPointID,
                I.InspectionDefectID,

                A.EngineNo,

                I.Remarks,

                A.TargetStatus,

                2,

                @UserID,

                GETDATE(),

                2

            FROM #AffectedEngines A

            CROSS JOIN @InspectionDetailsTable I;


            /* =========================================================
               16. RETURN HOLD DATA
               ========================================================= */

            SELECT
                UID,
                TicketID,
                AuditGroup,
                HoldType,
                PartID,
                PartBatchID,
                PlanID,
                ForwardQty,
                BackwordQty,
                OkQty,
                RejectedQty,
                Status

            FROM Prod_EngineHold

            WHERE UID = @EngineHoldUID;


            /* =========================================================
               17. RETURN AFFECTED ENGINES
               ========================================================= */

            SELECT
                A.EngineNo,
                A.TargetStatus AS EngineStatus,
                W.VREngineNo,
                W.PlanID,
                W.SKUID,
                W.LineID

            FROM #AffectedEngines A

            INNER JOIN Prod_Engine_WIP W
                ON W.EngineNo = A.EngineNo

            ORDER BY
                CASE
                    WHEN A.EngineNo = @EngineNo
                        THEN 0
                    ELSE 1
                END,
                W.StartTime;


            /* =========================================================
               18. RETURN DEFECT LOGS CREATED
               ========================================================= */

            SELECT
                DefectLogID,
                TicketID,
                InspectionRefID,
                DefectRefID,
                EngineNo,
                Remark,
                EngineStatus,
                DefectStatus,
                UpdatedBy,
                LastUpdatedTime,
                QAlert

            FROM Prod_Defect_Log

            WHERE TicketID = @TicketID

              AND LastUpdatedTime >=
                    DATEADD(SECOND, -5, GETDATE())

            ORDER BY
                DefectLogID;


            COMMIT TRANSACTION;


        END TRY


        BEGIN CATCH

            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            THROW;

        END CATCH;

    `);


    return {

        hold: result.recordsets[0],

        engines: result.recordsets[1],

        defectLogs: result.recordsets[2]

    };

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
        PEW.VREngineNo,
        PEW.EngineNo,
    
        PEW.LineID,
        CL.LineName,
    
        PEW.ReEntryStation,
        RS.StationName AS ReEntryStationName,
    
        PEW.NotOkStation,
        NS.StationName AS NotOkStationName,
    
        PEW.Status,
        PEW.StartTime,
        PEW.EndTime,
        PEW.PlanID,
        PEW.SKUID,
        PEW.KITID,
        PEW.SAMarrigeStatus
    
    FROM Prod_Engine_WIP PEW
    
    LEFT JOIN Config_Station RS
        ON RS.StationID = PEW.ReEntryStation
    
    LEFT JOIN Config_Station NS
        ON NS.StationID = PEW.NotOkStation
    
    INNER JOIN Config_Line CL
        ON CL.LineID = PEW.LineID
    
    WHERE
        (@EngineNo IS NOT NULL AND PEW.EngineNo = @EngineNo)
        OR
        (@VREngineNo IS NOT NULL AND PEW.VREngineNo = @VREngineNo);
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
    notifySubmit,
    getOpenProductionTickets,
    getTicketDetails,
    submitUpdateTicket,
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
    acknowledgeProductionCall,
    closeProductionCall
};
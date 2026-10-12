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
        WHERE TM.TicketStatus = 1 AND
        TM.TrackingSeqNo = 1 AND (
                TM.RaiseBy = 'Material'                                   -- My Tickets
             OR (TM.RaiseBy <> 'Material' AND TM.ActionBy = 'Material')   -- Other Tickets
    )
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
            TM.ActionBy,
            TM.Reason,
            TM.Remark,
            TM.ExpectedClosure,
            TM.TicketStatus
        FROM TicketManagement TM
        INNER JOIN Config_Line L
            ON TM.LineID = L.LineID
        INNER JOIN Config_Station S
            ON TM.StationID = S.StationID
        WHERE TM.TicketStatus = 1 AND
        TM.TrackingSeqNo = 1 AND (
                TM.RaiseBy = 'Quality'                                   -- My Tickets
             OR (TM.RaiseBy <> 'Quality' AND TM.ActionBy = 'Quality')   -- Other Tickets
    )
        ORDER BY
            TM.TimeStamp DESC
    `);
 
    return result.recordset;
};

const getOpenMaintenanceTickets = async () => {

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
        WHERE TM.TicketStatus = 1 AND TM.TrackingSeqNo = 1 AND (
                TM.RaiseBy = 'Maintenance'                                   -- My Tickets
             OR (TM.RaiseBy <> 'Maintenance' AND TM.ActionBy = 'Maintenance')   -- Other Tickets
    )
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

const createIPQCHold = async ({
    ticketId,
    auditListId,
    auditPointId,
    auditListName,
    auditPointName,
    auditGroup,
    holdType,
    partId,
    planId,
    forwardQty,
    backwordQty,
    role,
    lineId,
    stationId,
    activityId,
    equipmentId,
    breakdownId,
    engineNo,
    expectedClosure,
    userId,
    actionBy
}) => {

    const request = new sql.Request();

    request.input("TicketID", sql.Int, ticketId);
    request.input("AuditListID", sql.Int, auditListId);
    request.input("AuditPointID", sql.Int, auditPointId);

    request.input(
        "AuditListName",
        sql.NVarChar(sql.MAX),
        auditListName
    );

    request.input(
        "AuditPointName",
        sql.NVarChar(sql.MAX),
        auditPointName
    );

    request.input("AuditGroup", sql.Int, auditGroup);
    request.input("HoldType", sql.Int, holdType);

    request.input(
        "PartID",
        sql.NVarChar(20),
        partId ?? null
    );

    request.input(
        "PlanID",
        sql.Int,
        planId ?? null
    );

    request.input(
        "ForwardQty",
        sql.Int,
        forwardQty ?? 0
    );

    request.input(
        "BackwordQty",
        sql.Int,
        backwordQty ?? 0
    );

    request.input(
        "Role",
        sql.NVarChar(50),
        role
    );

    request.input("LineID", sql.Int, lineId);
    request.input("StationID", sql.Int, stationId);

    request.input(
        "ActivityID",
        sql.Int,
        activityId ?? null
    );

    request.input(
        "EquipmentID",
        sql.Int,
        equipmentId ?? null
    );

    request.input(
        "BreakdownID",
        sql.Int,
        breakdownId ?? null
    );

    request.input(
        "EngineNo",
        sql.NVarChar(14),
        engineNo ?? null
    );

    request.input(
        "ExpectedClosure",
        sql.Date,
        expectedClosure ?? null
    );

    request.input(
        "UserID",
        sql.NVarChar(50),
        userId
    );

    request.input(
        "ActionBy",
        sql.NVarChar(50),
        actionBy
    );

    const result = await request.query(`

        SET NOCOUNT ON;

        BEGIN TRY

            BEGIN TRANSACTION;

            /* =====================================================
               VARIABLES
               ===================================================== */

            DECLARE @DepartmentID INT;
            DECLARE @DepartmentName NVARCHAR(100);

            DECLARE @PartBatchID NVARCHAR(20);

            DECLARE @EngineHoldUID INT;

            /* =====================================================
               1. VALIDATION
               ===================================================== */

            IF @TicketID IS NULL
            BEGIN
                THROW 50001, 'TicketID is required', 1;
            END;

            IF @AuditListID IS NULL
            BEGIN
                THROW 50002, 'AuditListID is required', 1;
            END;

            IF @AuditPointID IS NULL
            BEGIN
                THROW 50003, 'AuditPointID is required', 1;
            END;

            IF @AuditListName IS NULL
            BEGIN
                THROW 50004, 'AuditListName is required', 1;
            END;

            IF @AuditPointName IS NULL
            BEGIN
                THROW 50005, 'AuditPointName is required', 1;
            END;

            IF @EngineNo IS NULL
            BEGIN
                THROW 50006, 'EngineNo is required', 1;
            END;

            IF @HoldType NOT IN (1, 2, 3)
            BEGIN
                THROW 50007, 'Invalid HoldType. Allowed values are 1, 2, 3', 1;
            END;

            /* =====================================================
               2. GET USER DEPARTMENT
               ===================================================== */

            SELECT TOP 1
                @DepartmentID = U.DepartmentID
            FROM Config_User U
            WHERE U.UserID = @UserID;

            IF @DepartmentID IS NULL
            BEGIN
                THROW 50008,
                    'User not found or DepartmentID not configured',
                    1;
            END;


            /* =====================================================
               3. GET DEPARTMENT NAME
               ===================================================== */

            SELECT TOP 1
                @DepartmentName = D.DepartmentName
            FROM Config_Department D
            WHERE D.DepartmentID = @DepartmentID;

            IF @DepartmentName IS NULL
            BEGIN
                THROW 50009,
                    'Department not found for UserID',
                    1;
            END;


            /* =====================================================
               4. CHECK DUPLICATE TICKET
               ===================================================== */

            IF EXISTS
            (
                SELECT 1
                FROM TicketManagement
                WHERE TicketID = @TicketID
            )
            BEGIN
                THROW 50010,
                    'TicketID already exists',
                    1;
            END;


            /* =====================================================
               5. INSERT TICKET MANAGEMENT
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
                @AuditListName,
                @ActionBy,
                @AuditPointName,
                1,
                @ExpectedClosure,
                1
            );


            /* =====================================================
               6. INSERT NOTIFICATION
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
                @AuditPointName,
                GETDATE(),
                @UserID,
                @ActionBy,
                @LineID,
                @StationID,
                @Role,
                1
            );


            /* =====================================================
               7. GET BATCH ID
               ONLY FOR BATCH HOLD
               ===================================================== */

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
                    THROW 50011,
                        'BatchID not found for selected EngineNo and PartID',
                        1;
                END;

            END;


            /* =====================================================
               8. CREATE AFFECTED ENGINE TABLE
               ===================================================== */

            CREATE TABLE #AffectedEngines
            (
                EngineNo NVARCHAR(14) PRIMARY KEY
            );


            /* =====================================================
               9. HOLD TYPE = 1
                  ENGINE HOLD
               ===================================================== */

            IF @HoldType = 1
            BEGIN

                DECLARE @AvailableForwardQty INT = 0;
                DECLARE @AvailableBackwordQty INT = 0;

                DECLARE @SelectedStartTime DATETIME;


                /* -------------------------------------------------
                   GET SELECTED ENGINE START TIME
                   ------------------------------------------------- */

                SELECT TOP 1
                    @SelectedStartTime = StartTime
                FROM
                (
                    SELECT StartTime
                    FROM Prod_Engine_WIP
                    WHERE EngineNo = @EngineNo

                    UNION ALL

                    SELECT StartTime
                    FROM Prod_Engine_WIPHistory
                    WHERE EngineNo = @EngineNo
                ) S
                ORDER BY StartTime;


                IF @SelectedStartTime IS NULL
                BEGIN
                    THROW 50012,
                        'Selected Engine not found in WIP or WIPHistory',
                        1;
                END;


                /* -------------------------------------------------
                   AVAILABLE FORWARD
                   ------------------------------------------------- */

                SELECT
                    @AvailableForwardQty = COUNT(*)
                FROM
                (
                    SELECT
                        EngineNo,
                        StartTime
                    FROM Prod_Engine_WIP
                    WHERE PlanID =
                    (
                        SELECT TOP 1 PlanID
                        FROM Prod_Engine_WIP
                        WHERE EngineNo = @EngineNo
                    )
                    AND LineID =
                    (
                        SELECT TOP 1 LineID
                        FROM Prod_Engine_WIP
                        WHERE EngineNo = @EngineNo
                    )
                    AND EngineNo <> @EngineNo

                    UNION ALL

                    SELECT
                        EngineNo,
                        StartTime
                    FROM Prod_Engine_WIPHistory
                    WHERE PlanID =
                    (
                        SELECT TOP 1 PlanID
                        FROM Prod_Engine_WIPHistory
                        WHERE EngineNo = @EngineNo
                    )
                    AND LineID =
                    (
                        SELECT TOP 1 LineID
                        FROM Prod_Engine_WIPHistory
                        WHERE EngineNo = @EngineNo
                    )
                    AND EngineNo <> @EngineNo
                ) E
                WHERE E.StartTime > @SelectedStartTime;


                /* -------------------------------------------------
                   AVAILABLE BACKWARD
                   ------------------------------------------------- */

                SELECT
                    @AvailableBackwordQty = COUNT(*)
                FROM
                (
                    SELECT
                        EngineNo,
                        StartTime
                    FROM Prod_Engine_WIP
                    WHERE PlanID =
                    (
                        SELECT TOP 1 PlanID
                        FROM Prod_Engine_WIP
                        WHERE EngineNo = @EngineNo
                    )
                    AND LineID =
                    (
                        SELECT TOP 1 LineID
                        FROM Prod_Engine_WIP
                        WHERE EngineNo = @EngineNo
                    )
                    AND EngineNo <> @EngineNo

                    UNION ALL

                    SELECT
                        EngineNo,
                        StartTime
                    FROM Prod_Engine_WIPHistory
                    WHERE PlanID =
                    (
                        SELECT TOP 1 PlanID
                        FROM Prod_Engine_WIPHistory
                        WHERE EngineNo = @EngineNo
                    )
                    AND LineID =
                    (
                        SELECT TOP 1 LineID
                        FROM Prod_Engine_WIPHistory
                        WHERE EngineNo = @EngineNo
                    )
                    AND EngineNo <> @EngineNo
                ) E
                WHERE E.StartTime < @SelectedStartTime;


                IF @AvailableForwardQty < ISNULL(@ForwardQty, 0)
                BEGIN
                    THROW 50013,
                        'Requested forward engine quantity is not available',
                        1;
                END;


                IF @AvailableBackwordQty < ISNULL(@BackwordQty, 0)
                BEGIN
                    THROW 50014,
                        'Requested backward engine quantity is not available',
                        1;
                END;


                /* -------------------------------------------------
                   SELECTED ENGINE
                   ------------------------------------------------- */

                INSERT INTO #AffectedEngines
                (
                    EngineNo
                )
                VALUES
                (
                    @EngineNo
                );


                /* -------------------------------------------------
                   FORWARD ENGINES
                   ------------------------------------------------- */

                INSERT INTO #AffectedEngines
                (
                    EngineNo
                )
                SELECT TOP (@ForwardQty)
                    E.EngineNo
                FROM
                (
                    SELECT
                        EngineNo,
                        StartTime
                    FROM Prod_Engine_WIP
                    WHERE EngineNo <> @EngineNo

                    UNION ALL

                    SELECT
                        EngineNo,
                        StartTime
                    FROM Prod_Engine_WIPHistory
                    WHERE EngineNo <> @EngineNo
                ) E
                WHERE E.StartTime > @SelectedStartTime
                ORDER BY E.StartTime ASC;


                /* -------------------------------------------------
                   BACKWARD ENGINES
                   ------------------------------------------------- */

                INSERT INTO #AffectedEngines
                (
                    EngineNo
                )
                SELECT TOP (@BackwordQty)
                    E.EngineNo
                FROM
                (
                    SELECT
                        EngineNo,
                        StartTime
                    FROM Prod_Engine_WIP
                    WHERE EngineNo <> @EngineNo

                    UNION ALL

                    SELECT
                        EngineNo,
                        StartTime
                    FROM Prod_Engine_WIPHistory
                    WHERE EngineNo <> @EngineNo
                ) E
                WHERE E.StartTime < @SelectedStartTime
                  AND NOT EXISTS
                  (
                      SELECT 1
                      FROM #AffectedEngines A
                      WHERE A.EngineNo = E.EngineNo
                  )
                ORDER BY E.StartTime DESC;

            END;


            /* =====================================================
               10. HOLD TYPE = 2
                   BATCH HOLD
               ===================================================== */

            ELSE IF @HoldType = 2
            BEGIN

                INSERT INTO #AffectedEngines
                (
                    EngineNo
                )
                SELECT DISTINCT
                    G.EngineNo

                FROM Prod_Engine_Part_Geneology G
                WHERE G.PartID = @PartID
                  AND G.BatchID = @PartBatchID
                  AND G.EngineNo IS NOT NULL;

            END;


            /* =====================================================
               11. HOLD TYPE = 3
                   PLAN HOLD
               ===================================================== */

            ELSE IF @HoldType = 3
            BEGIN

                INSERT INTO #AffectedEngines
                (
                    EngineNo
                )
                SELECT DISTINCT
                    E.EngineNo

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


            /* =====================================================
               12. ENSURE SELECTED ENGINE EXISTS
               ===================================================== */

            IF NOT EXISTS
            (
                SELECT 1
                FROM #AffectedEngines
                WHERE EngineNo = @EngineNo
            )
            BEGIN

                INSERT INTO #AffectedEngines
                (
                    EngineNo
                )
                VALUES
                (
                    @EngineNo
                );

            END;


            /* =====================================================
               13. CREATE PROD_ENGINEHOLD
               ===================================================== */

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

                @PlanID,

                ISNULL(@ForwardQty, 0),
                ISNULL(@BackwordQty, 0),

                0,
                0,

                1
            );


            SET @EngineHoldUID = SCOPE_IDENTITY();


            /* =====================================================
               14. MOVE HISTORY ENGINES INTO WIP
               ===================================================== */

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
                H.Status,
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


            /* =====================================================
               15. DELETE MOVED HISTORY
               ===================================================== */

            DELETE H

            FROM Prod_Engine_WIPHistory H

            INNER JOIN #AffectedEngines A
                ON H.EngineNo = A.EngineNo

            INNER JOIN Prod_Engine_WIP W
                ON W.VREngineNo = H.VREngineNo;


            /* =====================================================
               16. INSERT DEFECT LOG
               ===================================================== */

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

                @AuditListID,
                @AuditPointID,

                A.EngineNo,

                @AuditPointName,

                COALESCE(W.Status, H.Status),

                2,

                @UserID,

                GETDATE(),

                2

            FROM #AffectedEngines A
            LEFT JOIN Prod_Engine_WIP W
                ON W.EngineNo = A.EngineNo
            
            LEFT JOIN Prod_Engine_WIPHistory H
                ON H.EngineNo = A.EngineNo;


            /* =====================================================
               18. RETURN TICKET
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
               19. RETURN NOTIFICATION
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
              AND NotificationDesc = @AuditPointName

            ORDER BY NotificationID DESC;


            /* =====================================================
               20. RETURN ENGINE HOLD
               ===================================================== */

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


            /* =====================================================
               21. RETURN DEFECT LOGS
               ===================================================== */

            SELECT
                DefectLogID,
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

            FROM Prod_Defect_Log

            WHERE TicketID = @TicketID

            ORDER BY DefectLogID;


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
        engineHold: result.recordsets[2][0],
        defectLogs: result.recordsets[3]
    };
};

const confirmIPQCHold = async ({ ticketId }) => {

    const request = new sql.Request();

    request.input("TicketID", sql.Int, ticketId);

    const result = await request.query(`

        SET NOCOUNT ON;

        BEGIN TRY

            BEGIN TRANSACTION;

            /* =====================================================
               VARIABLES
            ===================================================== */

            DECLARE @EngineNo NVARCHAR(14);
            DECLARE @EngineHoldUID INT;


            /* =====================================================
               1. VALIDATION
            ===================================================== */

            IF @TicketID IS NULL
            BEGIN
                THROW 51001, 'TicketID is required', 1;
            END;


            /* =====================================================
               2. GET TICKET ENGINE
            ===================================================== */

            SELECT TOP 1
                @EngineNo = EngineNo
            FROM TicketManagement
            WHERE TicketID = @TicketID;


            IF @EngineNo IS NULL
            BEGIN
                THROW 51002,
                    'Ticket not found or EngineNo is not configured for TicketID',
                    1;
            END;


            /* =====================================================
               3. GET ENGINE HOLD
            ===================================================== */

            SELECT TOP 1
                @EngineHoldUID = UID
            FROM Prod_EngineHold
            WHERE TicketID = @TicketID
              AND Status = 1
            ORDER BY UID DESC;


            IF @EngineHoldUID IS NULL
            BEGIN
                THROW 51003,
                    'Active Engine Hold not found for TicketID',
                    1;
            END;


            /* =====================================================
               4. VALIDATE DEFECT LOGS
            ===================================================== */

            IF NOT EXISTS
            (
                SELECT 1
                FROM Prod_Defect_Log
                WHERE TicketID = @TicketID
            )
            BEGIN
                THROW 51004,
                    'No defect logs found for TicketID',
                    1;
            END;


            /* =====================================================
               5. UPDATE WIP STATUS
               
               Selected Engine       -> 19
               Other affected Engine -> 21
            ===================================================== */

            UPDATE W
            SET
                W.Status =
                    CASE
                        WHEN W.EngineNo = @EngineNo
                            THEN 19
                        ELSE 21
                    END
            FROM Prod_Engine_WIP W
            INNER JOIN
            (
                SELECT DISTINCT
                    EngineNo
                FROM Prod_Defect_Log
                WHERE TicketID = @TicketID
                  AND EngineNo IS NOT NULL
            ) D
                ON D.EngineNo = W.EngineNo;


            /* =====================================================
               6. UPDATE DEFECT LOG STATUS
               
               Selected Engine       -> 19
               Other affected Engine -> 21
            ===================================================== */

            UPDATE D
            SET
                D.EngineStatus =
                    CASE
                        WHEN D.EngineNo = @EngineNo
                            THEN 19
                        ELSE 21
                    END,
                D.LastUpdatedTime = GETDATE()
            FROM Prod_Defect_Log D
            WHERE D.TicketID = @TicketID;


            /* =====================================================
               7. UPDATE ENGINE HOLD
               
               Active Hold:
               1 -> 2
            ===================================================== */

            UPDATE Prod_EngineHold
            SET
                Status = 2
            WHERE UID = @EngineHoldUID
              AND Status = 1;


            /* =====================================================
               8. RETURN TICKET
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
               9. RETURN ENGINE HOLD
            ===================================================== */

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


            /* =====================================================
               10. RETURN WIP
            ===================================================== */

            SELECT
                W.VREngineNo,
                W.EngineNo,
                W.PlanID,
                W.SKUID,
                W.LineID,
                W.KITID,
                W.StartTime,
                W.EndTime,
                W.Status,
                W.NotOkStation,
                W.ReEntryStation,
                W.SAMarrigeStatus
            FROM Prod_Engine_WIP W
            INNER JOIN
            (
                SELECT DISTINCT
                    EngineNo
                FROM Prod_Defect_Log
                WHERE TicketID = @TicketID
                  AND EngineNo IS NOT NULL
            ) D
                ON D.EngineNo = W.EngineNo
            ORDER BY W.StartTime;


            /* =====================================================
               11. RETURN DEFECT LOGS
            ===================================================== */

            SELECT
                DefectLogID,
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
            FROM Prod_Defect_Log
            WHERE TicketID = @TicketID
            ORDER BY DefectLogID;


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
        engineHold: result.recordsets[1][0],
        wip: result.recordsets[2],
        defectLogs: result.recordsets[3]
    };
};

const createFQCHold = async ({
    ticketId,
    auditListId,
    auditPointId,
    auditListName,
    auditPointName,
    auditGroup,
    holdType,
    partId,
    planId,
    forwardQty,
    backwordQty,
    role,
    lineId,
    stationId,
    activityId,
    equipmentId,
    breakdownId,
    engineNo,
    expectedClosure,
    userId,
    actionBy,
    documentId,   
    uid
}) => {

    const request = new sql.Request();

    request.input("TicketID", sql.Int, ticketId);
    request.input("AuditListID", sql.Int, auditListId);
    request.input("AuditPointID", sql.Int, auditPointId);
    request.input("AuditListName", sql.NVarChar(sql.MAX), auditListName);
    request.input("AuditPointName", sql.NVarChar(sql.MAX), auditPointName);
    request.input("AuditGroup", sql.Int, auditGroup);
    request.input("HoldType", sql.Int, holdType);
    request.input("PartID", sql.NVarChar(20), partId ?? null);
    request.input("PlanID", sql.Int, planId ?? null);
    request.input("ForwardQty", sql.Int, forwardQty ?? 0);
    request.input("BackwordQty", sql.Int, backwordQty ?? 0);
    request.input("Role", sql.NVarChar(50), role ?? null);
    request.input("LineID", sql.Int, lineId);
    request.input("StationID", sql.Int, stationId);
    request.input("ActivityID", sql.Int, activityId ?? null);
    request.input("EquipmentID", sql.Int, equipmentId ?? null);
    request.input("BreakdownID", sql.Int, breakdownId ?? null);
    request.input("EngineNo", sql.NVarChar(14), engineNo ?? null);
    request.input("ExpectedClosure", sql.Date, expectedClosure ?? null);
    request.input("UserID", sql.NVarChar(50), userId);
    request.input("ActionBy", sql.NVarChar(50), actionBy);
    request.input("DocumentID", sql.Int, documentId);
    request.input("ExecutionUID", sql.Int, uid);

    const result = await request.query(`

        SET NOCOUNT ON;
        SET XACT_ABORT ON;

        BEGIN TRY

            BEGIN TRANSACTION;

            /* ================= VARIABLES ================= */

            DECLARE @DepartmentID INT;
            DECLARE @DepartmentName NVARCHAR(100);
            DECLARE @PartBatchID NVARCHAR(20);
            DECLARE @EngineHoldUID INT;

            DECLARE @EnginePlanID INT;
            DECLARE @EngineLineID INT;
            DECLARE @SelectedStartTime DATETIME;
            DECLARE @AvailableForwardQty INT = 0;
            DECLARE @AvailableBackwordQty INT = 0;

            DECLARE @HoldStatusConfirmed INT = 2;   -- Prod_EngineHold.Status (directly 2)
            DECLARE @WipStatusSelected   INT = 24;  -- selected engine
            DECLARE @WipStatusAffected   INT = 26;  -- other affected engines

            /* ================= 1. VALIDATION ================= */

            IF @TicketID IS NULL       THROW 52001, 'TicketID is required', 1;
            IF @AuditListID IS NULL    THROW 52002, 'AuditListID is required', 1;
            IF @AuditPointID IS NULL   THROW 52003, 'AuditPointID is required', 1;
            IF @AuditListName IS NULL  THROW 52004, 'AuditListName is required', 1;
            IF @AuditPointName IS NULL THROW 52005, 'AuditPointName is required', 1;
            IF @EngineNo IS NULL       THROW 52006, 'EngineNo is required', 1;

            IF @HoldType NOT IN (1, 2, 3)
                THROW 52007, 'Invalid HoldType. Allowed values are 1, 2, 3', 1;

            IF @HoldType = 2 AND @PartID IS NULL
                THROW 52015, 'PartID is required for Batch Hold', 1;

            IF @HoldType = 3 AND @PlanID IS NULL
                THROW 52016, 'PlanID is required for Plan Hold', 1;

            IF @DocumentID IS NULL
                THROW 52018, 'DocumentID is required', 1;
            
            IF @DocumentID NOT IN (9, 10, 11, 12)
                THROW 52019, 'Invalid DocumentID. Allowed values are 9, 10, 11, 12', 1;
            
            IF @ExecutionUID IS NULL
                THROW 52020, 'UID is required', 1;

            /* ================= 2. USER DEPARTMENT ================= */

            SELECT TOP 1 @DepartmentID = U.DepartmentID
            FROM Config_User U
            WHERE U.UserID = @UserID;

            IF @DepartmentID IS NULL
                THROW 52008, 'User not found or DepartmentID not configured', 1;

            SELECT TOP 1 @DepartmentName = D.DepartmentName
            FROM Config_Department D
            WHERE D.DepartmentID = @DepartmentID;

            IF @DepartmentName IS NULL
                THROW 52009, 'Department not found for UserID', 1;

            /* ================= 3. DUPLICATE TICKET ================= */

            IF EXISTS (SELECT 1 FROM TicketManagement WHERE TicketID = @TicketID)
                THROW 52010, 'TicketID already exists', 1;

            /* ================= 4. TICKET ================= */

            INSERT INTO TicketManagement
            (
                TicketID, TimeStamp, LineID, StationID, ActivityID, PartID,
                EquipmentID, BreakdownID, EngineNo, RaiseBy, Reason, ActionBy,
                Remark, TrackingSeqNo, ExpectedClosure, TicketStatus
            )
            VALUES
            (
                @TicketID, GETDATE(), @LineID, @StationID, @ActivityID, @PartID,
                @EquipmentID, @BreakdownID, @EngineNo, @DepartmentName, @AuditListName, @ActionBy,
                @AuditPointName, 1, @ExpectedClosure, 1
            );

            /* ================= 4A. LINK TICKET TO AUDIT POINT EXECUTION ================= */

            IF @DocumentID = 10
            BEGIN
                UPDATE QA_Execute_FQC_EngPerformanceAuditPoint
                SET TicketID = @TicketID
                WHERE UID = @ExecutionUID;
            END
            ELSE  -- 9, 11, 12
            BEGIN
                UPDATE QA_Execute_FQC_EngInbuiltAuditPoint
                SET TicketID = @TicketID
                WHERE UID = @ExecutionUID;
            END;
            
            IF @@ROWCOUNT = 0
                THROW 52021, 'Audit point execution record not found for given DocumentID and UID', 1;

            /* ================= 5. NOTIFICATION ================= */

            INSERT INTO NotificationManagement
            (
                NotificationDesc, TimeStamp, RaiseBy, Category,
                LineID, StationID, Role, Status
            )
            VALUES
            (
                @AuditPointName, GETDATE(), @UserID, @ActionBy,
                @LineID, @StationID, @Role, 1
            );

            /* ================= 6. BATCH ID (BATCH HOLD ONLY) ================= */

            IF @HoldType = 2
            BEGIN
                SELECT TOP 1 @PartBatchID = BatchID
                FROM Prod_Engine_Part_Geneology
                WHERE EngineNo = @EngineNo
                  AND PartID = @PartID
                ORDER BY UID DESC;

                IF @PartBatchID IS NULL
                    THROW 52011, 'BatchID not found for selected EngineNo and PartID', 1;
            END;

            /* ================= 7. AFFECTED ENGINES ================= */

            CREATE TABLE #AffectedEngines
            (
                EngineNo NVARCHAR(14) PRIMARY KEY
            );

            /* ---------- HOLD TYPE 1 : ENGINE HOLD ---------- */

            IF @HoldType = 1
            BEGIN

                SELECT TOP 1
                    @EnginePlanID = S.PlanID,
                    @EngineLineID = S.LineID,
                    @SelectedStartTime = S.StartTime
                FROM
                (
                    SELECT PlanID, LineID, StartTime
                    FROM Prod_Engine_WIP
                    WHERE EngineNo = @EngineNo

                    UNION ALL

                    SELECT PlanID, LineID, StartTime
                    FROM Prod_Engine_WIPHistory
                    WHERE EngineNo = @EngineNo
                ) S
                ORDER BY S.StartTime;

                IF @SelectedStartTime IS NULL
                    THROW 52012, 'Selected Engine not found in WIP or WIPHistory', 1;

                /* Same plan + same line engines (WIP + History) */
                CREATE TABLE #PlanEngines
                (
                    EngineNo  NVARCHAR(14),
                    StartTime DATETIME
                );

                INSERT INTO #PlanEngines (EngineNo, StartTime)
                SELECT EngineNo, StartTime
                FROM Prod_Engine_WIP
                WHERE PlanID = @EnginePlanID
                  AND LineID = @EngineLineID
                  AND EngineNo <> @EngineNo

                UNION ALL

                SELECT EngineNo, StartTime
                FROM Prod_Engine_WIPHistory
                WHERE PlanID = @EnginePlanID
                  AND LineID = @EngineLineID
                  AND EngineNo <> @EngineNo;

                SELECT @AvailableForwardQty = COUNT(*)
                FROM #PlanEngines WHERE StartTime > @SelectedStartTime;

                SELECT @AvailableBackwordQty = COUNT(*)
                FROM #PlanEngines WHERE StartTime < @SelectedStartTime;

                IF @AvailableForwardQty < ISNULL(@ForwardQty, 0)
                    THROW 52013, 'Requested forward engine quantity is not available', 1;

                IF @AvailableBackwordQty < ISNULL(@BackwordQty, 0)
                    THROW 52014, 'Requested backward engine quantity is not available', 1;

                INSERT INTO #AffectedEngines (EngineNo) VALUES (@EngineNo);

                INSERT INTO #AffectedEngines (EngineNo)
                SELECT TOP (ISNULL(@ForwardQty, 0)) P.EngineNo
                FROM #PlanEngines P
                WHERE P.StartTime > @SelectedStartTime
                ORDER BY P.StartTime ASC;

                INSERT INTO #AffectedEngines (EngineNo)
                SELECT TOP (ISNULL(@BackwordQty, 0)) P.EngineNo
                FROM #PlanEngines P
                WHERE P.StartTime < @SelectedStartTime
                  AND NOT EXISTS (SELECT 1 FROM #AffectedEngines A WHERE A.EngineNo = P.EngineNo)
                ORDER BY P.StartTime DESC;

            END

            /* ---------- HOLD TYPE 2 : BATCH HOLD ---------- */

            ELSE IF @HoldType = 2
            BEGIN
                INSERT INTO #AffectedEngines (EngineNo)
                SELECT DISTINCT G.EngineNo
                FROM Prod_Engine_Part_Geneology G
                WHERE G.PartID = @PartID
                  AND G.BatchID = @PartBatchID
                  AND G.EngineNo IS NOT NULL;
            END

            /* ---------- HOLD TYPE 3 : PLAN HOLD ---------- */

            ELSE IF @HoldType = 3
            BEGIN
                INSERT INTO #AffectedEngines (EngineNo)
                SELECT DISTINCT E.EngineNo
                FROM
                (
                    SELECT EngineNo FROM Prod_Engine_WIP        WHERE PlanID = @PlanID
                    UNION ALL
                    SELECT EngineNo FROM Prod_Engine_WIPHistory WHERE PlanID = @PlanID
                ) E
                WHERE E.EngineNo IS NOT NULL;
            END;

            /* Ensure selected engine is always included */

            IF NOT EXISTS (SELECT 1 FROM #AffectedEngines WHERE EngineNo = @EngineNo)
                INSERT INTO #AffectedEngines (EngineNo) VALUES (@EngineNo);

            /* ================= 8. PROD_ENGINEHOLD (STATUS = 2) ================= */

            INSERT INTO Prod_EngineHold
            (
                TicketID, AuditGroup, HoldType, PartID, PartBatchID, PlanID,
                ForwardQty, BackwordQty, OkQty, RejectedQty, Status
            )
            VALUES
            (
                @TicketID, @AuditGroup, @HoldType, @PartID,
                CASE WHEN @HoldType = 2 THEN @PartBatchID ELSE @PartID END,
                @PlanID,
                ISNULL(@ForwardQty, 0), ISNULL(@BackwordQty, 0),
                0, 0,
                @HoldStatusConfirmed
            );

            SET @EngineHoldUID = SCOPE_IDENTITY();

            /* ================= 9. MOVE HISTORY ENGINES INTO WIP ================= */

            INSERT INTO Prod_Engine_WIP
            (
                VREngineNo, EngineNo, PlanID, SKUID, LineID, KITID, StartTime,
                EndTime, Status, NotOkStation, ReEntryStation, SAMarrigeStatus
            )
            SELECT
                H.VREngineNo, H.EngineNo, H.PlanID, H.SKUID, H.LineID, H.KITID, H.StartTime,
                H.EndTime, H.Status, H.NotOkStation, H.ReEntryStation, H.SAMarrigeStatus
            FROM Prod_Engine_WIPHistory H
            INNER JOIN #AffectedEngines A ON H.EngineNo = A.EngineNo
            WHERE NOT EXISTS
            (
                SELECT 1 FROM Prod_Engine_WIP W WHERE W.VREngineNo = H.VREngineNo
            );

            DELETE H
            FROM Prod_Engine_WIPHistory H
            INNER JOIN #AffectedEngines A ON H.EngineNo = A.EngineNo
            INNER JOIN Prod_Engine_WIP W  ON W.VREngineNo = H.VREngineNo;

            /* Every affected engine must now be in WIP */

            IF EXISTS
            (
                SELECT 1
                FROM #AffectedEngines A
                WHERE NOT EXISTS (SELECT 1 FROM Prod_Engine_WIP W WHERE W.EngineNo = A.EngineNo)
            )
                THROW 52017, 'One or more affected engines were not found in WIP', 1;

            /* ================= 10. DEFECT LOG (FINAL STATUS) ================= */

            INSERT INTO Prod_Defect_Log
            (
                TicketID, TimeStamp, InspectionRefID, DefectRefID, EngineNo,
                Remark, EngineStatus, DefectStatus, UpdatedBy, LastUpdatedTime, QAlert
            )
            SELECT
                @TicketID,
                GETDATE(),
                @AuditListID,
                @AuditPointID,
                A.EngineNo,
                @AuditPointName,
                CASE WHEN A.EngineNo = @EngineNo
                     THEN @WipStatusSelected
                     ELSE @WipStatusAffected END,
                2,
                @UserID,
                GETDATE(),
                2
            FROM #AffectedEngines A;

            /* ================= 11. UPDATE WIP STATUS DIRECTLY ================= */

            UPDATE W
            SET W.Status =
                CASE WHEN W.EngineNo = @EngineNo
                     THEN @WipStatusSelected
                     ELSE @WipStatusAffected END
            FROM Prod_Engine_WIP W
            INNER JOIN #AffectedEngines A ON A.EngineNo = W.EngineNo;

            /* ================= 12. RETURN DATA ================= */

            -- recordsets[0]
            SELECT
                UID, TicketID, TimeStamp, LineID, StationID, ActivityID, PartID,
                EquipmentID, BreakdownID, EngineNo, RaiseBy, Reason, ActionBy,
                Remark, TrackingSeqNo, ExpectedClosure, TicketStatus
            FROM TicketManagement
            WHERE TicketID = @TicketID;

            -- recordsets[1]
            SELECT TOP 1
                NotificationID, NotificationDesc, TimeStamp, RaiseBy, Category,
                LineID, StationID, Role, Status
            FROM NotificationManagement
            WHERE RaiseBy = @UserID
              AND LineID = @LineID
              AND StationID = @StationID
              AND NotificationDesc = @AuditPointName
            ORDER BY NotificationID DESC;

            -- recordsets[2]
            SELECT
                UID, TicketID, AuditGroup, HoldType, PartID, PartBatchID, PlanID,
                ForwardQty, BackwordQty, OkQty, RejectedQty, Status
            FROM Prod_EngineHold
            WHERE UID = @EngineHoldUID;

            -- recordsets[3]
            SELECT
                W.VREngineNo, W.EngineNo, W.PlanID, W.SKUID, W.LineID, W.KITID,
                W.StartTime, W.EndTime, W.Status, W.NotOkStation,
                W.ReEntryStation, W.SAMarrigeStatus
            FROM Prod_Engine_WIP W
            INNER JOIN #AffectedEngines A ON A.EngineNo = W.EngineNo
            ORDER BY W.StartTime;

            -- recordsets[4]
            SELECT
                DefectLogID, TicketID, TimeStamp, InspectionRefID, DefectRefID,
                EngineNo, Remark, EngineStatus, DefectStatus, UpdatedBy,
                LastUpdatedTime, QAlert
            FROM Prod_Defect_Log
            WHERE TicketID = @TicketID
            ORDER BY DefectLogID;

            -- recordsets[5]
            SELECT @DocumentID AS DocumentID, @ExecutionUID AS UID, @TicketID AS TicketID;

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
        engineHold: result.recordsets[2][0],
        wip: result.recordsets[3],
        defectLogs: result.recordsets[4],
        auditPointLink: result.recordsets[5][0]
    };
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
    confirmIPQCHold,
    createFQCHold
};
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
        WHERE TM.ActionBy = 'Maintenance'
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
    createIPQCHold
};
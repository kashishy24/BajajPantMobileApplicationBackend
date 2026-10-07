const { sql } = require("../config/db");

const getAssignedBreakdowns = async (userId) => {
    const request = new sql.Request();

    request.input("UserID", sql.NVarChar(50), userId);

    console.log("Repository UserID:", userId);
    console.log("Repository UserID Type:", typeof userId);
    
    const result = await request.query(`
        SELECT
            BD.BreakdownID,
            BD.BDTicketType,
            BD.RefBreakdownID,
            BD.StationID,
            S.StationName,
            BD.EquipmentID,
            E.EquipmentName,
            BD.LossID,
            BD.SubLossID,
            BD.AlarmID,
            BD.ProdDate,
            BD.ProdShift,
            BD.BDStartTime,
            BD.BDRemark,
            BD.AssignedUserID,
            BD.BDAssignOpenTime,
            BD.BDStatus,
            BD.BDMaintTicket
        FROM dbo.Maint_BreakDown_Log BD
        LEFT JOIN dbo.Config_Station S
            ON S.StationID = BD.StationID
        LEFT JOIN dbo.Config_Equipment E
            ON E.EquipmentID = BD.EquipmentID
        WHERE BD.AssignedUserID = @UserID
          AND BD.BDStatus = 3
        ORDER BY BD.BDAssignOpenTime DESC;
    `);

    return result.recordset;
};

const assignBreakdown = async ({
    breakdownId,
    lossCode,
    subLossCode,
    prodRemark,
    userId
}) => {

    const transaction = new sql.Transaction();

    await transaction.begin();

    try {
        const request = new sql.Request(transaction);

        request.input("BreakdownID", sql.BigInt, breakdownId);
        request.input("LossID", sql.Int, lossCode);
        request.input("SubLossID", sql.Int, subLossCode ?? null);
        request.input(
            "BDRemark",
            sql.NVarChar(sql.MAX),
            prodRemark ?? null
        );
        request.input("UserID", sql.NVarChar(50), userId);

        const result = await request.query(`
            UPDATE dbo.Maint_BreakDown_Log
            SET
                LossID = @LossID,
                SubLossID = @SubLossID,
                BDRemark = COALESCE(@BDRemark, BDRemark),
                AssignedUserID = @UserID,
                BDAssignOpenTime = GETDATE(),
                BDStatus = 3
            WHERE BreakdownID = @BreakdownID
              AND BDStatus = 2;

            SELECT @@ROWCOUNT AS AffectedRows;
        `);

        if (result.recordset[0].AffectedRows !== 1) {
            throw new Error(
                "Breakdown not found or breakdown status is not 2."
            );
        }

        await transaction.commit();

        return {
            breakdownId,
            assignedUserId: userId
        };

    } catch (error) {

        if (transaction._aborted !== true) {
            await transaction.rollback();
        }

        throw error;
    }
};

const closeBreakdown = async (payload) => {
    const transaction = new sql.Transaction();
    await transaction.begin();

    try {
        const request = new sql.Request(transaction);

        request.input("BreakdownID", sql.BigInt, payload.breakdownId);
        request.input("ResolutionType", sql.Int, payload.resolutionType);
        request.input("CloseStatus", sql.Int, payload.resolutionType === 1 ? 5 : 6);
        request.input("ActionTakenRemark", sql.NVarChar(sql.MAX), payload.actionTakenRemark ?? null);
        request.input("PermanentResolution", sql.NVarChar(sql.MAX), payload.permanentResolution ?? null);
        request.input("UserID", sql.NVarChar(50), payload.userId);
        request.input(
            "NotificationCategory",
            sql.NVarChar(50),
            payload.notificationCategory ?? "Maintenance"
        );

        const result = await request.query(`
            SET NOCOUNT ON;
            SET XACT_ABORT ON;

            DECLARE @Now DATETIME = GETDATE();

            -- breakdown data
            DECLARE @StationID INT, @EquipmentID INT, @LossID INT, @SubLossID INT, @AlarmID INT;
            DECLARE @AssignedUserID NVARCHAR(50), @OriginalStatus INT;
            DECLARE @NewBreakdownID BIGINT = NULL;

            -- ticket data (temp store)
            DECLARE @TicketID INT = NULL, @TLineID INT, @TStationID INT, @TActivityID INT;
            DECLARE @TPartID NVARCHAR(20), @TEquipmentID INT, @TEngineNo NVARCHAR(14);
            DECLARE @TRaiseBy NVARCHAR(50), @TExpectedClosure DATE;
            DECLARE @NextSeqNo INT, @Department NVARCHAR(50);

            SELECT
                @StationID = StationID,
                @EquipmentID = EquipmentID,
                @LossID = LossID,
                @SubLossID = SubLossID,
                @AlarmID = AlarmID,
                @AssignedUserID = AssignedUserID,
                @OriginalStatus = BDStatus
            FROM dbo.Maint_BreakDown_Log WITH (UPDLOCK, HOLDLOCK)
            WHERE BreakdownID = @BreakdownID;

            IF @@ROWCOUNT = 0
                THROW 51001, 'Breakdown not found.', 1;

            IF @OriginalStatus <> 3
                THROW 51002, 'Breakdown must be assigned (status 3) before closure.', 1;

            IF @AssignedUserID IS NULL OR @AssignedUserID <> @UserID
                THROW 51005, 'Breakdown is assigned to a different user.', 1;

            -- latest ticket row for this breakdown
            SELECT TOP 1
                @TicketID = TicketID,
                @TLineID = LineID,
                @TStationID = StationID,
                @TActivityID = ActivityID,
                @TPartID = PartID,
                @TEquipmentID = EquipmentID,
                @TEngineNo = EngineNo,
                @TRaiseBy = RaiseBy,
                @TExpectedClosure = ExpectedClosure
            FROM dbo.TicketManagement WITH (UPDLOCK, HOLDLOCK)
            WHERE BreakdownID = @BreakdownID
            ORDER BY TrackingSeqNo DESC;

            IF @TicketID IS NOT NULL
            BEGIN
                SELECT @NextSeqNo = ISNULL(MAX(TrackingSeqNo), 0) + 1
                FROM dbo.TicketManagement
                WHERE TicketID = @TicketID;

                -- TODO: replace with your real user/department table
                SELECT @Department = Config_Department.DepartmentName
                FROM dbo.Config_User
                inner join dbo.Config_Department on Config_User.DepartmentID = Config_Department.DepartmentID
                WHERE UserID = @UserID;

                IF @Department IS NULL
                    THROW 51006, 'Department not found for this user.', 1;

                INSERT INTO dbo.TicketManagement
                (
                    TicketID, TimeStamp, LineID, StationID, ActivityID, PartID,
                    EquipmentID, BreakdownID, EngineNo, RaiseBy, ActionBy,
                    Remark, TrackingSeqNo, ExpectedClosure, TicketStatus
                )
                VALUES
                (
                    @TicketID, @Now, @TLineID, @TStationID, @TActivityID, @TPartID,
                    @TEquipmentID, @BreakdownID, @TEngineNo, @TRaiseBy, @Department,
                    @ActionTakenRemark, @NextSeqNo, @TExpectedClosure, 2
                );
            END;

            UPDATE dbo.Maint_BreakDown_Log
            SET
                BDEndTime = @Now,
                BDAssignCloseTime = @Now,
                BDTicketCloseTime = CASE WHEN @TicketID IS NULL THEN NULL ELSE @Now END,
                BDResolutionType = @ResolutionType,
                BDActionTaken = @ActionTakenRemark,
                BDPermanentActionPLan =
                    CASE WHEN @ResolutionType = 1
                         THEN @PermanentResolution
                         ELSE BDPermanentActionPLan END,
                BDStatus = @CloseStatus,
                TotalBDTime = ISNULL(TotalBDTime, 0) + DATEDIFF(SECOND, BDStartTime, @Now),
                TotalBDCount = ISNULL(TotalBDCount, 0) + 1
            WHERE BreakdownID = @BreakdownID;

            IF @ResolutionType = 2
            BEGIN
                INSERT INTO dbo.Maint_BreakDown_Log
                (
                    BDTicketType, RefBreakdownID, StationID, EquipmentID,
                    LossID, AlarmID, SubLossID, ProdDate, ProdShift,
                    BDStartTime, BDMaintTicket, BDRemark,
                    TotalBDTime, TotalBDCount, AssignedUserID, BDAssignOpenTime, BDStatus
                )
                VALUES
                (
                    4, @BreakdownID, @StationID, @EquipmentID,
                    @LossID, @AlarmID, @SubLossID,
                    CAST(@Now AS DATE),
                    CASE
                        WHEN CAST(@Now AS TIME) >= '07:00' AND CAST(@Now AS TIME) < '16:00' THEN 'A'
                        WHEN CAST(@Now AS TIME) >= '16:00' OR CAST(@Now AS TIME) < '01:00' THEN 'B'
                        ELSE 'C'
                    END,
                    @Now, NULL, NULL,
                    0, 0, NULL, NULL, 1
                );

                SET @NewBreakdownID = SCOPE_IDENTITY();
            END;

            IF @TicketID IS NOT NULL
            BEGIN
                INSERT INTO dbo.NotificationManagement
                (NotificationDesc, TimeStamp, RaiseBy, LineID, StationID, Category, Role, Status)
                VALUES
                (
                    CONCAT(
                        'Breakdown ', @BreakdownID,
                        CASE WHEN @ResolutionType = 1
                             THEN ' permanently resolved.'
                             ELSE CONCAT(' temporarily resolved. Follow-up breakdown: ', @NewBreakdownID, '.')
                        END,
                        ' Ticket: ', @TicketID
                    ),
                    @Now, @UserID, @TLineID, @TStationID,
                    @NotificationCategory, @TRaiseBy, 1
                );
            END;

            SELECT
                @BreakdownID AS BreakdownID,
                @CloseStatus AS BDStatus,
                @TicketID AS TicketID,
                @NewBreakdownID AS NewBreakdownID;
        `);

        await transaction.commit();
        return result.recordset[0];

    } catch (error) {
        try {
            await transaction.rollback();
        } catch (rollbackError) {
            console.error("Rollback failed:", rollbackError.message);
        }
        throw error;
    }
};

const createBreakdown = async (payload) => {

    const transaction = new sql.Transaction();

    await transaction.begin();

    try {

        const request = new sql.Request(transaction);

        request.input(
            "BDType",
            sql.Int,
            payload.bdType
        );

        request.input(
            "RefBreakdownID",
            sql.BigInt,
            payload.refBreakdownId ?? null
        );

        request.input(
            "LineID",
            sql.Int,
            payload.lineId
        );

        request.input(
            "StationID",
            sql.Int,
            payload.stationId
        );

        request.input(
            "EquipmentID",
            sql.Int,
            payload.equipmentId
        );

        request.input(
            "LossID",
            sql.Int,
            payload.lossCode ?? null
        );

        request.input(
            "SubLossID",
            sql.Int,
            payload.subLossCode ?? null
        );

        request.input(
            "Remark",
            sql.NVarChar(sql.MAX),
            payload.remark ?? null
        );

        request.input(
            "AssignEngineer",
            sql.NVarChar(50),
            payload.assignEngineer ?? null
        );

        request.input(
            "UserID",
            sql.NVarChar(50),
            payload.userId
        );

        request.input(
            "Role",
            sql.NVarChar(50),
            payload.role
        );

        request.input(
            "NotificationCategory",
            sql.NVarChar(50),
            payload.notificationCategory ?? "Maintenance"
        );

        const result = await request.query(`
            SET NOCOUNT ON;

            IF NOT EXISTS
            (
                SELECT 1
                FROM dbo.Config_Station
                WHERE StationID = @StationID
            )
                THROW 51003,
                    'StationID does not exist.',
                    1;

            IF NOT EXISTS
            (
                SELECT 1
                FROM dbo.Config_Equipment
                WHERE EquipmentID = @EquipmentID
                  AND StationID = @StationID
            )
                THROW 51004,
                    'Equipment does not belong to the selected station.',
                    1;

            DECLARE @Now DATETIME = GETDATE();
            DECLARE @NewBreakdownID BIGINT;

            DECLARE @InitialStatus INT =
                CASE
                    WHEN NULLIF(@AssignEngineer, '') IS NULL
                    THEN 1
                    ELSE 3
                END;

            INSERT INTO dbo.Maint_BreakDown_Log
            (
                BDTicketType,
                RefBreakdownID,
                StationID,
                EquipmentID,
                LossID,
                SubLossID,
                ProdDate,
                ProdShift,
                BDStartTime,
                BDMaintTicket,
                BDRemark,
                TotalBDTime,
                TotalBDCount,
                AssignedUserID,
                BDAssignOpenTime,
                BDStatus
            )
            VALUES
            (
                @BDType,
                @RefBreakdownID,
                @StationID,
                @EquipmentID,
                @LossID,
                @SubLossID,
                CAST(@Now AS DATE),

                CASE
                    WHEN CAST(@Now AS TIME) >= '07:00'
                     AND CAST(@Now AS TIME) < '16:00'
                    THEN 'A'

                    WHEN CAST(@Now AS TIME) >= '16:00'
                      OR CAST(@Now AS TIME) < '01:00'
                    THEN 'B'

                    ELSE 'C'
                END,

                @Now,
                1,
                @Remark,
                0,
                0,
                NULLIF(@AssignEngineer, ''),
                CASE
                    WHEN NULLIF(@AssignEngineer, '') IS NULL
                    THEN NULL
                    ELSE @Now
                END,
                @InitialStatus
            );

            SET @NewBreakdownID = SCOPE_IDENTITY();

            INSERT INTO dbo.NotificationManagement
            (
                NotificationDesc,
                TimeStamp,
                RaiseBy,
                LineID,
                StationID,
                Category,
                Role,
                Status
            )
            VALUES
            (
                CONCAT(
                    'New maintenance breakdown created: ',
                    @NewBreakdownID
                ),
                GETDATE(),
                @UserID,
                @LineID,
                @StationID,
                @NotificationCategory,
                @Role,
                1
            );

            SELECT
                @NewBreakdownID AS BreakdownID,
                @InitialStatus AS BDStatus,
                @AssignEngineer AS AssignedUserID;
        `);

        await transaction.commit();

        return result.recordset[0];

    } catch (error) {

        await transaction.rollback();

        throw error;
    }
};


module.exports = {
    getAssignedBreakdowns,
    assignBreakdown,
    closeBreakdown,
    createBreakdown
};
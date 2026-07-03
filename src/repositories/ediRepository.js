const { sql } = require("../config/db");

const getEDIList = async () => {

    const result = await new sql.Request().query(`
        SELECT DISTINCT
            MR.EDINumber,
            V.VendorName
        FROM Material_Receiving MR
        INNER JOIN Config_Vendor V
            ON MR.VendorID = V.VendorID
        WHERE MR.Status = 1
        ORDER BY MR.EDINumber
    `);

    return result.recordset;
};

const getEDIDetails = async (ediNumber) => {

    const request = new sql.Request();

    request.input(
        "EDINumber",
        sql.NVarChar,
        ediNumber
    );

    const result = await request.query(`
        SELECT
            MR.EDINumber,
            MR.PartID,
            CP.PartDesc AS PartName,
            MR.Quantity
        FROM Material_Receiving MR
        INNER JOIN Config_Part CP
            ON MR.PartID = CP.PartID
        WHERE MR.EDINumber = @EDINumber
    `);

    return result.recordset;
};

const getPartDetails = async (
    ediNumber,
    partId
) => {

    const request = new sql.Request();

    request.input(
        "EDINumber",
        sql.NVarChar,
        ediNumber
    );

    request.input(
        "PartID",
        sql.NVarChar,
        partId
    );

    const result = await request.query(`
        SELECT
            MR.EDINumber,
            MR.PartID,
            CP.PartDesc AS PartName,
            CP.PackStdQty AS PackingSTD,
            MR.Quantity
        FROM Material_Receiving MR
        INNER JOIN Config_Part CP
            ON MR.PartID = CP.PartID
        WHERE
            MR.EDINumber = @EDINumber
            AND MR.PartID = @PartID
    `);

    return result.recordset[0];
};

const validateQuantity = async (
    ediNumber,
    partId,
    receivedQty,
    userId,
    remark
) => {

    // Step 1: Get existing record
    const request = new sql.Request();

    request.input("EDINumber", sql.NVarChar, ediNumber);
    request.input("PartID", sql.NVarChar, partId);

    const existing = await request.query(`
        SELECT
            UID,
            Quantity,
            PartID,
            Status,
            ValidatedBy,
            TimeStamp
        FROM Material_Receiving
        WHERE
            EDINumber = @EDINumber
            AND PartID = @PartID
    `);

    if (existing.recordset.length === 0) {
        throw new Error("Record not found");
    }

    const material = existing.recordset[0];

    const materialReceivingUID = material.UID;
    const actualQty = material.Quantity;
    const currentStatus = material.Status;
    const currentUser = material.ValidatedBy;
    const currentTime = material.TimeStamp;


    const beforeRequest = new sql.Request();

    beforeRequest.input("EDINumber", sql.Int, materialReceivingUID);
    beforeRequest.input("PartID", sql.NVarChar, partId);
    beforeRequest.input("Status", sql.Int, currentStatus);
    beforeRequest.input("LastUpdatedBy", sql.NVarChar, currentUser);
    beforeRequest.input("LastUpdatedTime", sql.DateTime, currentTime);

    await beforeRequest.query(`
        IF NOT EXISTS (
            SELECT 1
            FROM Material_Receiving_Geneology
            WHERE EDINumber = @EDINumber
            AND PartID = @PartID
        )
        BEGIN
        INSERT INTO Material_Receiving_Geneology
        (
            EDINumber,
            PartID,
            Status,
            LastUpdatedBy,
            LastUpdatedTime
        )
        VALUES
        (
            @EDINumber,
            @PartID,
            @Status,
            @LastUpdatedBy,
            @LastUpdatedTime
        )
        END
    `);

    // const actualQty = existing.recordset[0].Quantity;
    const gap = actualQty - receivedQty;

    // Step 2: Calculate current shift
    const hour = new Date().getHours();

    let currentShift;

    if (hour >= 6 && hour < 14) {
        currentShift = 1;
    } else if (hour >= 14 && hour < 22) {
        currentShift = 2;
    } else {
        currentShift = 3;
    }

    // Step 3: Check if another entry exists for same PartID, same day & shift
    const checkRequest = new sql.Request();

    checkRequest.input("PartID", sql.NVarChar, partId);
    checkRequest.input("EDINumber", sql.NVarChar, ediNumber);

    const checkResult = await checkRequest.query(`
        SELECT TOP 1 UID
        FROM Material_Receiving
        WHERE
            PartID = @PartID
            AND EDINumber <> @EDINumber
            AND CAST(TimeStamp AS DATE) = CAST(GETDATE() AS DATE)
            AND (
                (${currentShift} = 1 AND DATEPART(HOUR, TimeStamp) BETWEEN 6 AND 13)
                OR
                (${currentShift} = 2 AND DATEPART(HOUR, TimeStamp) BETWEEN 14 AND 21)
                OR
                (${currentShift} = 3 AND (
                    DATEPART(HOUR, TimeStamp) >= 22
                    OR DATEPART(HOUR, TimeStamp) < 6
                ))
            )
    `);

    const status = checkResult.recordset.length > 0 ? 3 : 2;

    // Step 4: Update record
    const updateRequest = new sql.Request();

    updateRequest.input("ReceivedQty", sql.Int, receivedQty);
    // updateRequest.input("ValidatedBy", sql.Int, userId);
    const userResult = await new sql.Request()
    .input("UserName", sql.NVarChar, userId)
    .query(`
        SELECT UserID
        FROM Config_User
        WHERE UserName = @UserName
    `);
    
    if (userResult.recordset.length === 0) {
        throw new Error("User not found");
    }
    
    const validatedBy = userResult.recordset[0].UserID;
    
    updateRequest.input(
        "ValidatedBy",
        sql.NVarChar,
        validatedBy
    );
    updateRequest.input("Remark", sql.NVarChar, remark);
    updateRequest.input("Status", sql.Int, status);
    updateRequest.input("EDINumber", sql.NVarChar, ediNumber);
    updateRequest.input("PartID", sql.NVarChar, partId);

    await updateRequest.query(`
        UPDATE Material_Receiving
        SET
            ValidatedQty = @ReceivedQty,
            ValidatedBy = @ValidatedBy,
            Remark = @Remark,
            Status = @Status,
            TimeStamp = GETDATE()
        WHERE
            EDINumber = @EDINumber
            AND PartID = @PartID
    `);

    const afterRequest = new sql.Request();

    afterRequest.input("EDINumber", sql.Int, materialReceivingUID);
    afterRequest.input("PartID", sql.NVarChar, partId);
    afterRequest.input("Status", sql.Int, status);
    afterRequest.input("LastUpdatedBy", sql.NVarChar, validatedBy);
    
    await afterRequest.query(`
        INSERT INTO Material_Receiving_Geneology
        (
            EDINumber,
            PartID,
            Status,
            LastUpdatedBy,
            LastUpdatedTime
        )
        VALUES
        (
            @EDINumber,
            @PartID,
            @Status,
            @LastUpdatedBy,
            GETDATE()
        )
    `);

    return {
        expectedQty: actualQty,
        receivedQty,
        gap,
        status
    };
};

const getValidatedMaterials = async () => {

        const result =
            await new sql.Request().query(`
                SELECT
                    MR.EDINumber,
                    V.VendorName,
                    CP.PartID,
                    CP.PartDesc AS PartName,
                    MR.ValidatedQty,
                    MR.SampleCount
                FROM Material_Receiving MR
                INNER JOIN Config_Vendor V
                    ON MR.VendorID = V.VendorID
                INNER JOIN Config_Part CP
                    ON MR.PartID = CP.PartID
                WHERE MR.Status = 2
                ORDER BY MR.EDINumber
            `);

        return result.recordset;

    };

const bypassMaterial = async (
    ediNumber,
    partId,
    userId
) => {

    const request = new sql.Request();

    request.input(
        "EDINumber",
        sql.NVarChar,
        ediNumber
    );

    request.input(
        "PartID",
        sql.NVarChar,
        partId
    );

    const fetchRequest = new sql.Request();

    fetchRequest.input("EDINumber", sql.NVarChar, ediNumber);
    fetchRequest.input("PartID", sql.NVarChar, partId);
    
    const existing = await fetchRequest.query(`
        SELECT UID
        FROM Material_Receiving
        WHERE
            EDINumber = @EDINumber
            AND PartID = @PartID
    `);
    
    if (existing.recordset.length === 0) {
        throw new Error("Record not found");
    }

    const userResult = await new sql.Request()
    .input("UserName", sql.NVarChar, userId)
    .query(`
        SELECT UserID
        FROM Config_User
        WHERE UserName = @UserName
    `);
    
    if (userResult.recordset.length === 0) {
        throw new Error("User not found");
    }
    
    const validatedBy = userResult.recordset[0].UserID;

    request.input(
    "ValidatedBy",
    sql.NVarChar, 
    validatedBy
    );
    
    const materialReceivingUID = existing.recordset[0].UID;


    const result = await request.query(`
        UPDATE Material_Receiving
        SET
            Status = 6,
            ValidatedBy = @validatedBy,
            TimeStamp = GETDATE()
        WHERE
            EDINumber = @EDINumber
            AND PartID = @PartID
    `);

    // Insert into Geneology
    const genealogyRequest = new sql.Request();

    genealogyRequest.input("EDINumber", sql.Int, materialReceivingUID);
    genealogyRequest.input("PartID", sql.NVarChar, partId);
    genealogyRequest.input("Status", sql.Int, 6);
    genealogyRequest.input("LastUpdatedBy", sql.NVarChar, validatedBy);

    await genealogyRequest.query(`
        INSERT INTO Material_Receiving_Geneology
        (
            EDINumber,
            PartID,
            Status,
            LastUpdatedBy,
            LastUpdatedTime
        )
        VALUES
        (
            @EDINumber,
            @PartID,
            @Status,
            @LastUpdatedBy,
            GETDATE()
        )
    `);
    return {
        rowsAffected: result.rowsAffected[0]
    };

};


function getCurrentShiftDetails() {
    const now = new Date();

    const minutes =
        now.getHours() * 60 + now.getMinutes();

    let shiftStart;
    let shiftEnd;

    // Shift A : 07:00 - 15:50
    if (minutes >= 420 && minutes < 950) {
        shiftStart = 420;
        shiftEnd = 950;
    }

    // Shift B : 15:50 - 00:40
    else if (minutes >= 950 || minutes < 40) {

        if (minutes >= 950) {
            shiftStart = 950;
            shiftEnd = 1480; // 24:40
        } else {
            shiftStart = -10; // Previous day 23:50
            shiftEnd = 40;
        }
    }

    // Shift C : 00:40 - 07:00
    else {
        shiftStart = 40;
        shiftEnd = 420;
    }

    const total = shiftEnd - shiftStart;
    const current =
        minutes >= shiftStart
            ? minutes - shiftStart
            : (minutes + 1440) - shiftStart;

    const percentage = (current / total) * 100;

    let notification;

    if (percentage <= 70)
        notification = 2;
    else if (percentage <= 90)
        notification = 3;
    else
        notification = 4;

    return {
        percentage,
        notification
    };
}

const sampleCollection = async (
    ediNumber,
    partId,
    userId
) => {

    const request = new sql.Request();

    request.input(
        "EDINumber",
        sql.NVarChar,
        ediNumber
    );

    request.input(
        "PartID",
        sql.NVarChar,
        partId
    );

    const fetchRequest = new sql.Request();

    fetchRequest.input("EDINumber", sql.NVarChar, ediNumber);
    fetchRequest.input("PartID", sql.NVarChar, partId);
    
    const existing = await fetchRequest.query(`
        SELECT UID
        FROM Material_Receiving
        WHERE
            EDINumber = @EDINumber
            AND PartID = @PartID
    `);
    
    if (existing.recordset.length === 0) {
        throw new Error("Record not found");
    }

    const userResult = await new sql.Request()
    .input("UserName", sql.NVarChar, userId)
    .query(`
        SELECT UserID
        FROM Config_User
        WHERE UserName = @UserName
    `);
    
    if (userResult.recordset.length === 0) {
        throw new Error("User not found");
    }
    
    const validatedBy = userResult.recordset[0].UserID;
    
    request.input(
    "ValidatedBy",
    sql.NVarChar, // or sql.Int if the column is INT
    validatedBy
    );

    const materialReceivingUID = existing.recordset[0].UID;

    const result = await request.query(`
        UPDATE Material_Receiving
        SET Status = 5,
        ValidatedBy = @validatedBy,
        TimeStamp = GETDATE()
        WHERE
            EDINumber = @EDINumber
            AND PartID = @PartID
    `);

    // Insert into Geneology
    const genealogyRequest = new sql.Request();

    genealogyRequest.input("EDINumber", sql.Int, materialReceivingUID);
    genealogyRequest.input("PartID", sql.NVarChar, partId);
    genealogyRequest.input("Status", sql.Int, 5);
    genealogyRequest.input("LastUpdatedBy", sql.NVarChar, validatedBy);

    await genealogyRequest.query(`
        INSERT INTO Material_Receiving_Geneology
        (
            EDINumber,
            PartID,
            Status,
            LastUpdatedBy,
            LastUpdatedTime
        )
        VALUES
        (
            @EDINumber,
            @PartID,
            @Status,
            @LastUpdatedBy,
            GETDATE()
        )
    `);

    const auditRequest = new sql.Request();

    auditRequest.input("PartID", sql.NVarChar, partId);
    
    const auditResult = await auditRequest.query(`
        SELECT
            AL.AuditListID,
            AL.DocumentID
        FROM Config_AuditList AL
        INNER JOIN Config_QADocumentList QD
            ON AL.DocumentID = QD.DocumentID
        WHERE
            AL.PartID = @PartID
            AND QD.AuditGroup = 'IQC'
    `);

    for (const audit of auditResult.recordset) {

        const auditListID = audit.AuditListID;
        const documentID = audit.DocumentID;

            // STEP 1: Get next AuditInstanceID
        const instanceRequest = new sql.Request();
    
        instanceRequest.input(
            "DocumentID",
            sql.Int,
            documentID
        );
    
        const instanceResult = await instanceRequest.query(`
            SELECT
                ISNULL(MAX(AuditInstanceID), 0) + 1 AS NextAuditInstanceID
            FROM Config_AuditSchedule
            WHERE DocumentID = @DocumentID
        `);
    
        const auditInstanceID =
            instanceResult.recordset[0].NextAuditInstanceID;

        // STEP 2: Calculate Notification
        const notification =
            getCurrentShiftDetails().notification;
    
        // update tables
        // STEP 3: Update Config_AuditSchedule
        const scheduleRequest = new sql.Request();

        scheduleRequest.input("DocumentID", sql.Int, documentID);
        // scheduleRequest.input("AuditInstanceID", sql.Int, 1);      // decide logic
        scheduleRequest.input("AuditInstanceID", sql.Int, auditInstanceID);
        scheduleRequest.input("Notification", sql.Int, notification);         // Normal
        scheduleRequest.input("StartDateTime", sql.DateTime, new Date());
        
        await scheduleRequest.query(`
            UPDATE Config_AuditSchedule
            SET
                AuditInstanceID = @AuditInstanceID,
                Notification = @Notification,
                StartDateTime = @StartDateTime
            WHERE
                DocumentID = @DocumentID
        `);

        // STEP 4: Update QA_AuditMonitoring

        const monitoringRequest = new sql.Request();

        monitoringRequest.input("LineID", sql.Int, 1); // or fetch actual LineID
        monitoringRequest.input("AuditListID", sql.Int, auditListID);
        monitoringRequest.input("AuditInstanceID", sql.Int, auditInstanceID);
        monitoringRequest.input("StartDateTime", sql.DateTime, new Date());
        monitoringRequest.input("Notification", sql.Int, notification);
        
        await monitoringRequest.query(`
            INSERT INTO QA_AuditMonitoring
            (
                LineID,
                AuditListID,
                AuditInstanceID,
                StartDateTime,
                EndDateTime,
                ActualStartDateTime,
                ActualEndDateTime,
                Notification,
                Status
            )
            VALUES
            (
                @LineID,
                @AuditListID,
                @AuditInstanceID,
                @StartDateTime,
                NULL,
                NULL,
                NULL,
                @Notification,
                1
            )
        `);
    }

    return {
        rowsAffected: result.rowsAffected[0]
    };

};

const getIQCHoldList = async () => {

    const result =
        await new sql.Request().query(`
            SELECT
                MR.UID,
                MR.EDINumber,
                MR.PartID,
                CP.PartDesc AS PartName,
                V.VendorName,
                MR.Quantity,
                MR.ValidatedQty,
                MR.Status
            FROM Material_Receiving MR
            INNER JOIN Config_Part CP
                ON MR.PartID = CP.PartID
            INNER JOIN Config_Vendor V
                ON MR.VendorID = V.VendorID
            WHERE MR.Status in (2,5)
            ORDER BY MR.EDINumber
        `);

    return result.recordset;
};

const iqcCleared = async (
    ediNumber,
    partId,
    userId
) => {

    const request = new sql.Request();

    request.input(
        "EDINumber",
        sql.NVarChar,
        ediNumber
    );

    request.input(
        "PartID",
        sql.NVarChar,
        partId
    );

    const fetchRequest = new sql.Request();

    fetchRequest.input("EDINumber", sql.NVarChar, ediNumber);
    fetchRequest.input("PartID", sql.NVarChar, partId);
    
    const existing = await fetchRequest.query(`
        SELECT UID
        FROM Material_Receiving
        WHERE
            EDINumber = @EDINumber
            AND PartID = @PartID
    `);
    
    if (existing.recordset.length === 0) {
        throw new Error("Record not found");
    }

    const userResult = await new sql.Request()
    .input("UserName", sql.NVarChar, userId)
    .query(`
        SELECT UserID
        FROM Config_User
        WHERE UserName = @UserName
    `);
    
    if (userResult.recordset.length === 0) {
        throw new Error("User not found");
    }
    
    const validatedBy = userResult.recordset[0].UserID;
    
    request.input(
    "ValidatedBy",
    sql.NVarChar, // or sql.Int if the column is INT
    validatedBy
    );

    const materialReceivingUID = existing.recordset[0].UID;

    const result = await request.query(`
        UPDATE Material_Receiving
        SET Status = 7,
        ValidatedBy = @validatedBy,
        Timestamp = GETDATE()
        WHERE
            EDINumber = @EDINumber
            AND PartID = @PartID
            AND Status = 5
    `);

    // Insert into Geneology
    const genealogyRequest = new sql.Request();

    genealogyRequest.input("EDINumber", sql.Int, materialReceivingUID);
    genealogyRequest.input("PartID", sql.NVarChar, partId);
    genealogyRequest.input("Status", sql.Int, 5);
    genealogyRequest.input("LastUpdatedBy", sql.NVarChar, validatedBy);

    await genealogyRequest.query(`
        INSERT INTO Material_Receiving_Geneology
        (
            EDINumber,
            PartID,
            Status,
            LastUpdatedBy,
            LastUpdatedTime
        )
        VALUES
        (
            @EDINumber,
            @PartID,
            @Status,
            @LastUpdatedBy,
            GETDATE()
        )
    `);

    return {
        rowsAffected: result.rowsAffected[0]
    };
};

const getIQCClearedList = async () => {

    const result =
        await new sql.Request().query(`
            SELECT
                MR.UID,
                MR.EDINumber,
                MR.PartID,
                CP.PartDesc AS PartName,
                V.VendorName,
                MR.Quantity,
                MR.ValidatedQty,
                MR.Status,
                MR.Timestamp
            FROM Material_Receiving MR
            INNER JOIN Config_Part CP
                ON MR.PartID = CP.PartID
            INNER JOIN Config_Vendor V
                ON MR.VendorID = V.VendorID
            WHERE MR.Status = 7 OR MR.Status = 6 OR MR.Status = 2 OR MR.Status = 3
            ORDER BY MR.EDINumber
        `);

    return result.recordset;
};

const getGapMaterials = async () => {

    const result =
        await new sql.Request().query(`
            SELECT
                MR.UID,
                MR.EDINumber,
                MR.PartID,
                CP.PartDesc AS PartName,
                V.VendorName,
                MR.Quantity,
                MR.ValidatedQty,
                (MR.Quantity - MR.ValidatedQty) AS GapQty,
                MR.Remark,
                MR.Timestamp
            FROM Material_Receiving MR
            INNER JOIN Config_Part CP
                ON MR.PartID = CP.PartID
            INNER JOIN Config_Vendor V
                ON MR.VendorID = V.VendorID
            WHERE
                MR.ValidatedQty IS NOT NULL
                AND MR.Quantity <> MR.ValidatedQty
            ORDER BY MR.EDINumber
        `);

    return result.recordset;
};

const iqcFailed = async (
    ediNumber,
    partId,
    userId
) => {

    const request = new sql.Request();

    request.input(
        "EDINumber",
        sql.NVarChar,
        ediNumber
    );

    request.input(
        "PartID",
        sql.NVarChar,
        partId
    );

    const fetchRequest = new sql.Request();

    fetchRequest.input("EDINumber", sql.NVarChar, ediNumber);
    fetchRequest.input("PartID", sql.NVarChar, partId);
    
    const existing = await fetchRequest.query(`
        SELECT UID
        FROM Material_Receiving
        WHERE
            EDINumber = @EDINumber
            AND PartID = @PartID
    `);
    
    if (existing.recordset.length === 0) {
        throw new Error("Record not found");
    }

    const userResult = await new sql.Request()
    .input("UserName", sql.NVarChar, userId)
    .query(`
        SELECT UserID
        FROM Config_User
        WHERE UserName = @UserName
    `);
    
    if (userResult.recordset.length === 0) {
        throw new Error("User not found");
    }
    
    const validatedBy = userResult.recordset[0].UserID;
    
    request.input(
    "ValidatedBy",
    sql.NVarChar, // or sql.Int if the column is INT
    validatedBy
    );

    const materialReceivingUID = existing.recordset[0].UID;

    const result = await request.query(`
        UPDATE Material_Receiving
        SET Status = 8,
        ValidatedBy = @validatedBy,
        Timestamp = GETDATE()
        WHERE
            EDINumber = @EDINumber
            AND PartID = @PartID
            AND Status = 5
    `);

    // Insert into Geneology
    const genealogyRequest = new sql.Request();

    genealogyRequest.input("EDINumber", sql.Int, materialReceivingUID);
    genealogyRequest.input("PartID", sql.NVarChar, partId);
    genealogyRequest.input("Status", sql.Int, 8);
    genealogyRequest.input("LastUpdatedBy", sql.NVarChar, validatedBy);

    await genealogyRequest.query(`
        INSERT INTO Material_Receiving_Geneology
        (
            EDINumber,
            PartID,
            Status,
            LastUpdatedBy,
            LastUpdatedTime
        )
        VALUES
        (
            @EDINumber,
            @PartID,
            @Status,
            @LastUpdatedBy,
            GETDATE()
        )
    `);

    return {
        rowsAffected: result.rowsAffected[0]
    };
};
    
module.exports = {
    getEDIList,
    getEDIDetails,
    getPartDetails,
    validateQuantity,
    getValidatedMaterials,
    bypassMaterial,
    sampleCollection,
    getIQCHoldList,
    iqcCleared,
    getIQCClearedList,
    getGapMaterials,
    iqcFailed
}
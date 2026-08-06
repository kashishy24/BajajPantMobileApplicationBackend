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
        INNER JOIN Config_PartVariant CP
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
            CP.EnginePartID AS EnginePartID,
            CP.PartDesc AS PartName,
            CP.PackStdQty AS PackingSTD,
            MR.Quantity
        FROM Material_Receiving MR
        INNER JOIN Config_PartVariant CP
            ON MR.PartID = CP.PartID
        WHERE
            MR.EDINumber = @EDINumber
            AND MR.PartID = @PartID
    `);

    return result.recordset[0];
};

const confirmIQC = async (
    ediNumber,
    partId,
    userId
) => {

    const transaction = new sql.Transaction();

    await transaction.begin();

    try {

        //========================================
        // Get Material Receiving History
        //========================================

        const historyRequest = new sql.Request(transaction);

        historyRequest.input(
            "EDINumber",
            sql.NVarChar,
            ediNumber
        );

        historyRequest.input(
            "PartID",
            sql.NVarChar,
            partId
        );

        const historyResult = await historyRequest.query(`
            SELECT
                VendorID,
                BatchID,
                SampleLevel,
                SampleQty
            FROM Material_Receiving
            WHERE
                EDINumber=@EDINumber
            AND PartID=@PartID
        `);

        if (historyResult.recordset.length === 0) {
            throw new Error(
                "Material Receiving History not found."
            );
        }

        const {
            VendorID,
            BatchID,
            SampleLevel,
            SampleQty
        } = historyResult.recordset[0];


        //========================================
        // Fetch IQC Documents
        //========================================

        const documentResult = await new sql.Request(transaction)
            .query(`
                SELECT
                    DocumentID,
                    DocumentNo,
                    DocumentName,
                    [Group] AS AuditGroup,
                    Revision
                FROM Config_QADocumentList
                WHERE [Group]='IQC'
            `);


        //========================================
        // Loop Documents
        //========================================

        for (const document of documentResult.recordset) {

            //====================================
            // Check Already Exists
            //====================================

            const checkResult = await new sql.Request(transaction)
                .input(
                    "DocumentID",
                    sql.Int,
                    document.DocumentID
                )
                .query(`
                    SELECT TOP 1 UID
                    FROM QA_Execute_DocumentList
                    WHERE
                        DocumentID=@DocumentID
                `);

            if (checkResult.recordset.length > 0) {
                continue;
            }

            //====================================
            // Generate AuditInstanceID
            //====================================

            const instanceResult =
                await new sql.Request(transaction)
                    .input(
                        "DocumentID",
                        sql.Int,
                        document.DocumentID
                    )
                    .query(`
                        SELECT
                            ISNULL(MAX(AuditInstanceID),0)+1
                            AS AuditInstanceID
                        FROM QA_Execute_DocumentList_History
                        WHERE
                            DocumentID=@DocumentID
                    `);

            const auditInstanceID =
                instanceResult.recordset[0].AuditInstanceID;
                    //====================================
            // Insert Execute Document
            //====================================

            await new sql.Request(transaction)
                .input("DocumentID", sql.Int, document.DocumentID)
                .input("DocumentNo", sql.Int, document.DocumentNo)
                .input("DocumentName", sql.NVarChar, document.DocumentName)
                .input("AuditGroup", sql.NVarChar, document.AuditGroup)
                .input("Revision", sql.Int, document.Revision)
                .input("AuditInstanceID", sql.Int, auditInstanceID)
                .query(`
                    INSERT INTO QA_Execute_DocumentList
                    (
                        DocumentID,
                        DocumentNo,
                        DocumentName,
                        AuditGroup,
                        Revision,
                        AuditInstanceID
                    )
                    VALUES
                    (
                        @DocumentID,
                        @DocumentNo,
                        @DocumentName,
                        @AuditGroup,
                        @Revision,
                        @AuditInstanceID
                    )
                `);

            //====================================
            // Fetch Audit List
            //====================================

            const auditListResult =
                await new sql.Request(transaction)
                    .input(
                        "DocumentID",
                        sql.Int,
                        document.DocumentID
                    )
                    .input(
                        "PartID",
                        sql.NVarChar,
                        partId
                    )
                    .query(`
                        SELECT
                            AuditListID,
                            ModelFamilyID,
                            ModelID,
                            SKUID,
                            PartID
                        FROM Config_AuditList
                        WHERE
                            DocumentID=@DocumentID
                        AND PartID=@PartID
                    `);

            //====================================
            // Insert Execute Audit List
            //====================================

            for (const audit of auditListResult.recordset) {

                await new sql.Request(transaction)
                    .input("AuditListID", sql.Int, audit.AuditListID)
                    .input("ModelFamilyID", sql.Int, audit.ModelFamilyID)
                    .input("ModelID", sql.Int, audit.ModelID)
                    .input("SKUID", sql.Int, audit.SKUID)
                    .input("PartID", sql.NVarChar, audit.PartID)
                    .input("VendorID", sql.Int, VendorID)
                    .input("BatchID", sql.NVarChar, BatchID)
                    .input("SampleLevel", sql.Int, SampleLevel)
                    .input("SampleSize", sql.Int, SampleQty)
                    .input("NokSample", sql.Int, 0)
                    .input("Status", sql.Int, 1)
                    .input("ProdDate", sql.Date, new Date())
                    .input("ProdShift", sql.NVarChar, "")
                    .input("AuditInstanceID", sql.Int, auditInstanceID)
                    .input("Revision", sql.Int, 1)
                    .query(`
                        INSERT INTO QA_Execute_IQC_AuditList
                        (
                            AuditListID,
                            ModelFamilyID,
                            ModelID,
                            SKUID,
                            PartID,
                            VendorID,
                            BatchID,
                            SampleLevel,
                            SampleSize,
                            NokSample,
                            Status,
                            ProdDate,
                            ProdShift,
                            AuditInstanceID,
                            Revision
                        )
                        VALUES
                        (
                            @AuditListID,
                            @ModelFamilyID,
                            @ModelID,
                            @SKUID,
                            @PartID,
                            @VendorID,
                            @BatchID,
                            @SampleLevel,
                            @SampleSize,
                            @NokSample,
                            @Status,
                            @ProdDate,
                            @ProdShift,
                            @AuditInstanceID,
                            @Revision
                        )
                    `);
            }
        }

        await transaction.commit();

        return {
            success: true,
            message: "IQC confirmed successfully."
        };

    }
    catch (error) {

        await transaction.rollback();
        throw error;

    }

};

const createExecuteIQC = async (
    ediNumber,
    partId
) => {

    const historyRequest = new sql.Request();

    historyRequest.input("EDINumber", sql.NVarChar, ediNumber);
    historyRequest.input("PartID", sql.NVarChar, partId);

    const historyResult = await historyRequest.query(`
        SELECT
            VendorID,
            BatchID,
            SampleLevel,
            SampleQty
        FROM Material_Receiving
        WHERE
            EDINumber=@EDINumber
            AND PartID=@PartID
    `);

    if (historyResult.recordset.length === 0) {
        throw new Error("Material not found.");
    }

    const {
        VendorID,
        BatchID,
        SampleLevel,
        SampleQty
    } = historyResult.recordset[0];

    const documentResult = await new sql.Request().query(`
        SELECT
            DocumentID,
            DocumentNo,
            DocumentName,
            AuditGroup,
            Revision
        FROM Config_QADocumentList
        WHERE AuditGroup='IQC'
    `);

    for (const document of documentResult.recordset) {

        const checkResult = await new sql.Request()
            .input("DocumentID", sql.Int, document.DocumentID)
            .query(`
                SELECT TOP 1 UID
                FROM QA_Execute_DocumentList
                WHERE DocumentID=@DocumentID
            `);

        if (checkResult.recordset.length > 0)
            continue;

        const instanceResult = await new sql.Request()
            .input("DocumentID", sql.Int, document.DocumentID)
            .query(`
                SELECT
                    ISNULL(MAX(AuditInstanceID),0)+1 AS AuditInstanceID
                FROM QA_Execute_DocumentList_History
                WHERE DocumentID=@DocumentID
            `);

        const auditInstanceID =
            instanceResult.recordset[0].AuditInstanceID;

        await new sql.Request()
            .input("DocumentID", sql.Int, document.DocumentID)
            .input("DocumentNo", sql.Int, document.DocumentNo)
            .input("DocumentName", sql.NVarChar, document.DocumentName)
            .input("AuditGroup", sql.NVarChar, document.AuditGroup)
            .input("Revision", sql.Int, document.Revision)
            .input("AuditInstanceID", sql.Int, auditInstanceID)
            .query(`
                INSERT INTO QA_Execute_DocumentList
                (
                    DocumentID,
                    DocumentNo,
                    DocumentName,
                    AuditGroup,
                    Revision,
                    AuditInstanceID
                )
                VALUES
                (
                    @DocumentID,
                    @DocumentNo,
                    @DocumentName,
                    @AuditGroup,
                    @Revision,
                    @AuditInstanceID
                )
            `);

        const auditListResult = await new sql.Request()
            .input("DocumentID", sql.Int, document.DocumentID)
            .input("PartID", sql.NVarChar, partId)
            .query(`
                SELECT
                    AuditListID,
                    ModelFamilyID,
                    ModelID,
                    SKUID,
                    PartID
                FROM Config_AuditList
                WHERE
                    DocumentID=@DocumentID
                    AND PartID=@PartID
            `);

        for (const audit of auditListResult.recordset) {

            await new sql.Request()
                .input("AuditListID", sql.Int, audit.AuditListID)
                .input("ModelFamilyID", sql.Int, audit.ModelFamilyID)
                .input("ModelID", sql.Int, audit.ModelID)
                .input("SKUID", sql.Int, audit.SKUID)
                .input("PartID", sql.NVarChar, audit.PartID)
                .input("VendorID", sql.Int, VendorID)
                .input("BatchID", sql.NVarChar, BatchID)
                .input("SampleLevel", sql.Int, SampleLevel)
                .input("SampleSize", sql.Int, SampleQty)
                .input("NokSample", sql.Int, 0)
                .input("Status", sql.Int, 1)
                .input("ProdDate", sql.Date, new Date())
                .input("ProdShift", sql.NVarChar, "")
                .input("AuditInstanceID", sql.Int, auditInstanceID)
                .input("Revision", sql.Int, 1)
                .query(`
                    INSERT INTO QA_Execute_IQC_AuditList
                    (
                        AuditListID,
                        ModelFamilyID,
                        ModelID,
                        SKUID,
                        PartID,
                        VendorID,
                        BatchID,
                        SampleLevel,
                        SampleSize,
                        NokSample,
                        Status,
                        ProdDate,
                        ProdShift,
                        AuditInstanceID,
                        Revision
                    )
                    VALUES
                    (
                        @AuditListID,
                        @ModelFamilyID,
                        @ModelID,
                        @SKUID,
                        @PartID,
                        @VendorID,
                        @BatchID,
                        @SampleLevel,
                        @SampleSize,
                        @NokSample,
                        @Status,
                        @ProdDate,
                        @ProdShift,
                        @AuditInstanceID,
                        @Revision
                    )
                `);
        }
    }

    return BatchID;
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

    // const materialReceivingUID = material.UID;
    const actualQty = material.Quantity;
    const currentStatus = material.Status;
    const currentUser = material.ValidatedBy;
    const currentTime = material.TimeStamp;


    const beforeRequest = new sql.Request();

    beforeRequest.input("EDINumber", sql.NVarChar, ediNumber);
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

    const inspectionRequest = new sql.Request();

    inspectionRequest.input("PartID", sql.NVarChar, partId);
    
    const inspectionResult = await inspectionRequest.query(`
        SELECT PartInspection
        FROM Config_PartVariant
        WHERE PartID = @PartID
    `);
    
    if (inspectionResult.recordset.length === 0) {
        throw new Error("Part Variant not found");
    }
    
    const partInspection = inspectionResult.recordset[0].PartInspection;

    console.log("PartInspection:", inspectionResult.recordset[0].PartInspection); 
    console.log("Type:", typeof inspectionResult.recordset[0].PartInspection);

    if (partInspection == 2) {

        // Get UserID
        //===============================
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
    
    
        //===============================
        // Update Material Receiving
        //===============================
        await new sql.Request()
            .input("ReceivedQty", sql.Int, receivedQty)
            .input("ValidatedBy", sql.NVarChar, validatedBy)
            .input("Remark", sql.NVarChar, remark)
            .input("Status", sql.Int, 9)
            .input("BatchID", sql.NVarChar, ediNumber)
            .input("EDINumber", sql.NVarChar, ediNumber)
            .input("PartID", sql.NVarChar, partId)
            .query(`
                UPDATE Material_Receiving
                SET
                    ValidatedQty = @ReceivedQty,
                    OKQty = @ReceivedQty,
                    ValidatedBy = @ValidatedBy,
                    Remark = @Remark,
                    Status = @Status,
                    BatchID = @BatchID,
                    TimeStamp = GETDATE()
                WHERE
                    EDINumber = @EDINumber
                    AND PartID = @PartID
            `);
    
        //===============================
        // Get Batch Details
        //===============================
        const batchResult = await new sql.Request()
            .input("EDINumber", sql.NVarChar, ediNumber)
            .input("PartID", sql.NVarChar, partId)
            .query(`
                SELECT
                    VendorID,
                    BatchID,
                    ValidatedQty
                FROM Material_Receiving
                WHERE
                    EDINumber = @EDINumber
                    AND PartID = @PartID
            `);
    
        const {
            VendorID,
            BatchID,
            ValidatedQty
        } = batchResult.recordset[0];
    
        //===============================
        // Store Area
        //===============================
        const areaResult = await new sql.Request().query(`
            SELECT AreaID
            FROM Config_StorageArea
            WHERE AreaName='Store'
        `);
    
        if (areaResult.recordset.length === 0) {
            throw new Error("Store Area not found");
        }
    
        const areaID = areaResult.recordset[0].AreaID;
    
        //===============================
        // Next Priority
        //===============================
        const priorityResult = await new sql.Request()
            .input("PartID", sql.NVarChar, partId)
            .query(`
                SELECT ISNULL(MAX(Priority),0)+1 AS NextPriority
                FROM Material_BatchWiseQty
                WHERE PartID=@PartID
            `);
    
        const priority = priorityResult.recordset[0].NextPriority;
    
        //===============================
        // Insert Batch
        //===============================
        await new sql.Request()
            .input("PartID", sql.NVarChar, partId)
            .input("VendorID", sql.Int, VendorID)
            .input("AreaID", sql.Int, areaID)
            .input("BatchID", sql.NVarChar, BatchID)
            .input("Priority", sql.Int, priority)
            .input("Quantity", sql.Int, ValidatedQty)
            .input("Consumed", sql.Int, 0)
            .input("Status", sql.Int, 0)
            .query(`
                INSERT INTO Material_BatchWiseQty
                (
                    PartID,
                    VendorID,
                    AreaID,
                    BatchID,
                    Priority,
                    Quantity,
                    Consumed,
                    Status
                )
                VALUES
                (
                    @PartID,
                    @VendorID,
                    @AreaID,
                    @BatchID,
                    @Priority,
                    @Quantity,
                    @Consumed,
                    @Status
                )
            `);
    
        //===============================
        // Update Material Stock
        //===============================
        await new sql.Request()
            .input("PartID", sql.NVarChar, partId)
            .input("Qty", sql.Int, ValidatedQty)
            .query(`
                UPDATE Material_Stock
                SET
                    StoreQty = ISNULL(StoreQty,0) + @Qty
                WHERE PartID = @PartID
            `);
    
        const afterRequest = new sql.Request();

        afterRequest.input("EDINumber", sql.NVarChar, ediNumber);
        afterRequest.input("PartID", sql.NVarChar, partId);
        afterRequest.input("Status", sql.Int, 9);
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

        await new sql.Request()
        .input("EDINumber", sql.NVarChar, ediNumber)
        .input("PartID", sql.NVarChar, partId)
        .query(`
            INSERT INTO Material_Receiving_History
            (
                EDINumber,
                VendorID,
                PartID,
                Quantity,
                TimeStamp,
                ValidatedQty,
                OKQty,
                RejectedQty,
                HoldQty,
                ValidatedBy,
                SampleQty,
                SampleLevel,
                Status,
                BatchID,
                Remark
            )
            SELECT
                EDINumber,
                VendorID,
                PartID,
                Quantity,
                TimeStamp,
                ValidatedQty,
                OKQty,
                RejectedQty,
                HoldQty,
                ValidatedBy,
                SampleQty,
                SampleLevel,
                Status,
                BatchID,
                Remark
            FROM Material_Receiving
            WHERE
                EDINumber = @EDINumber
                AND PartID = @PartID
        `);

        await new sql.Request()
        .input("EDINumber", sql.NVarChar, ediNumber)
        .input("PartID", sql.NVarChar, partId)
        .query(`
            DELETE FROM Material_Receiving
            WHERE
                EDINumber = @EDINumber
                AND PartID = @PartID
        `);

        return {
            expectedQty: actualQty,
            receivedQty,
            gap: actualQty - receivedQty,
            status: 4
        };
    }
    else {
        // Existing IQC Flow

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
            AND Status IN (6,7,8,9,10,11)
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

    const status = checkResult.recordset.length > 0 ? 4 : 3;

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
    updateRequest.input("BatchID", sql.NVarChar, ediNumber);

    await updateRequest.query(`
        UPDATE Material_Receiving
        SET
            ValidatedQty = @ReceivedQty,
            ValidatedBy = @ValidatedBy,
            Remark = @Remark,
            Status = @Status,
            BatchID = @BatchID,
            TimeStamp = GETDATE()
        WHERE
            EDINumber = @EDINumber
            AND PartID = @PartID
    `);

    const afterRequest = new sql.Request();

    afterRequest.input("EDINumber", sql.NVarChar, ediNumber);
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

    // Fetch data required for stock/batch operations
    const batchRequest = new sql.Request();
    
    batchRequest.input("EDINumber", sql.NVarChar, ediNumber);
    batchRequest.input("PartID", sql.NVarChar, partId);
    
    const batchResult = await batchRequest.query(`
        SELECT
            VendorID,
            BatchID,
            ValidatedQty
        FROM Material_Receiving
        WHERE
            EDINumber = @EDINumber
            AND PartID = @PartID
    `);
    
    if (batchResult.recordset.length === 0) {
        throw new Error("Material Receiving record not found");
    }
    
    const {
        VendorID,
        BatchID,
        ValidatedQty
    } = batchResult.recordset[0];
    
    
    //======================================================
    // STATUS = 3
    //======================================================
    
    if (status === 3) {
    
        const stockRequest = new sql.Request();
    
        stockRequest.input("PartID", sql.NVarChar, partId);
        stockRequest.input("Qty", sql.Int, ValidatedQty);
    
        await stockRequest.query(`
            UPDATE Material_Stock
            SET
                IncomingQty = ISNULL(IncomingQty,0) + @Qty
            WHERE
                PartID = @PartID
        `);
    
    }
    
    
    //======================================================
    // STATUS = 4
    //======================================================
    
    else if (status === 4) {
    
        //-------------------------------
        // Find Store Area
        //-------------------------------
    
        const areaRequest = new sql.Request();
    
        const areaResult = await areaRequest.query(`
            SELECT AreaID
            FROM Config_StorageArea
            WHERE AreaName = 'Store'
        `);
    
        if (areaResult.recordset.length === 0) {
            throw new Error("Store Area not found");
        }
    
        const areaID = areaResult.recordset[0].AreaID;
    
    
        //-------------------------------
        // Next Batch Priority
        //-------------------------------
    
        const priorityRequest = new sql.Request();
    
        priorityRequest.input("PartID", sql.NVarChar, partId);
    
        const priorityResult = await priorityRequest.query(`
            SELECT
                ISNULL(MAX(Priority),0)+1 AS NextPriority
            FROM Material_BatchWiseQty
            WHERE PartID=@PartID
        `);
    
        const priority = priorityResult.recordset[0].NextPriority;
    
    
        //-------------------------------
        // Insert Batch
        //-------------------------------
    
        const insertBatchRequest = new sql.Request();
    
        insertBatchRequest.input("PartID", sql.NVarChar, partId);
        insertBatchRequest.input("VendorID", sql.Int, VendorID);
        insertBatchRequest.input("AreaID", sql.Int, areaID);
        insertBatchRequest.input("BatchID", sql.NVarChar, BatchID);
        insertBatchRequest.input("Priority", sql.Int, priority);
        insertBatchRequest.input("Quantity", sql.Int, ValidatedQty);
        insertBatchRequest.input("Consumed", sql.Int, 0);
        insertBatchRequest.input("Status", sql.Int, 0);
    
        await insertBatchRequest.query(`
            INSERT INTO Material_BatchWiseQty
            (
                PartID,
                VendorID,
                AreaID,
                BatchID,
                Priority,
                Quantity,
                Consumed,
                Status
            )
            VALUES
            (
                @PartID,
                @VendorID,
                @AreaID,
                @BatchID,
                @Priority,
                @Quantity,
                @Consumed,
                @Status
            )
        `);
    
    
        //-------------------------------
        // Check Incoming Qty
        //-------------------------------
    
        const checkStock = await new sql.Request()
            .input("PartID", sql.NVarChar, partId)
            .query(`
                SELECT IncomingQty
                FROM Material_Stock
                WHERE PartID=@PartID
            `);
    
        if (checkStock.recordset.length === 0) {
            throw new Error("Material Stock record not found");
        }
    
        if (checkStock.recordset[0].IncomingQty < ValidatedQty) {
            throw new Error("Incoming quantity is less than validated quantity.");
        }
    
    
        //-------------------------------
        // Move Incoming -> Store
        //-------------------------------
    
        const stockRequest = new sql.Request();
    
        stockRequest.input("PartID", sql.NVarChar, partId);
        stockRequest.input("Qty", sql.Int, ValidatedQty);
    
        await stockRequest.query(`
            UPDATE Material_Stock
            SET
                StoreQty    = ISNULL(StoreQty,0) + @Qty
            WHERE
                PartID = @PartID
        `);
    
    }

    return {
        expectedQty: actualQty,
        receivedQty,
        gap,
        status
    };}
};

const getValidatedMaterials = async () => {

        const result =
            await new sql.Request().query(`
                SELECT
                    MR.EDINumber,
                    MR.BatchID,
                    V.VendorName,
                    CP.PartID,
                    CP.PartDesc AS PartName,
                    MR.ValidatedQty
                FROM Material_Receiving MR
                INNER JOIN Config_Vendor V
                    ON MR.VendorID = V.VendorID
                INNER JOIN Config_PartVariant CP
                    ON MR.PartID = CP.PartID
                WHERE MR.Status = 3
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
    
    // const existing = await fetchRequest.query(`
    //     SELECT UID
    //     FROM Material_Receiving
    //     WHERE
    //         EDINumber = @EDINumber
    //         AND PartID = @PartID
    // `);
    
    // if (existing.recordset.length === 0) {
    //     throw new Error("Record not found");
    // }

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
    
    // const materialReceivingUID = existing.recordset[0].UID;


    const result = await request.query(`
        UPDATE Material_Receiving
        SET
            Status = 5,
            ValidatedBy = @validatedBy,
            TimeStamp = GETDATE()
        WHERE
            EDINumber = @EDINumber
            AND PartID = @PartID
    `);

    // Insert into Geneology
    const genealogyRequest = new sql.Request();

    genealogyRequest.input("EDINumber", sql.NVarChar, ediNumber);
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

    const batchRequest = new sql.Request();

    batchRequest.input("EDINumber", sql.NVarChar, ediNumber);
    batchRequest.input("PartID", sql.NVarChar, partId);
    
    const batchResult = await batchRequest.query(`
        SELECT
            VendorID,
            BatchID,
            ValidatedQty
        FROM Material_Receiving
        WHERE
            EDINumber = @EDINumber
            AND PartID = @PartID
    `);
    
    if (batchResult.recordset.length === 0) {
        throw new Error("Material Receiving record not found");
    }
    
    const {
        VendorID,
        BatchID,
        ValidatedQty
    } = batchResult.recordset[0];






    //==================================================
    // Check Execute Audit for Batch
    //==================================================
    
    const executeResult = await new sql.Request()
        .input("BatchID", sql.NVarChar, BatchID)
        .query(`
            SELECT TOP 1 UID
            FROM QA_Execute_IQC_AuditList
            WHERE BatchID = @BatchID
        `);
    
    if (executeResult.recordset.length > 0) {
    
        //------------------------------------------------
        // Audit Already Exists
        //------------------------------------------------
    
        await new sql.Request()
            .input("BatchID", sql.NVarChar, BatchID)
            .input("ExecutedBy", sql.NVarChar, validatedBy)
            .query(`
                UPDATE QA_Execute_IQC_AuditList
                SET
                    Status = 5,
                    ExecutedStartTime = GETDATE(),
                    ExecutedBy = @ExecutedBy
                WHERE
                    BatchID = @BatchID
            `);
    
    }
    else {
    
        //------------------------------------------------
        // Create Execute Document + Audit
        //------------------------------------------------
    
        await confirmIQC(
            ediNumber,
            partId,
            userId
        );
    
        //------------------------------------------------
        // Update Status after insertion
        //------------------------------------------------
    
        await new sql.Request()
            .input("BatchID", sql.NVarChar, BatchID)
            .input("ExecutedBy", sql.NVarChar, validatedBy)
            .query(`
                UPDATE QA_Execute_IQC_AuditList
                SET
                    Status = 5,
                    ExecutedStartTime = GETDATE(),
                    ExecutedBy = @ExecutedBy
                WHERE
                    BatchID = @BatchID
            `);
    
    }





    const insertBatchRequest = new sql.Request();

    insertBatchRequest.input("PartID", sql.NVarChar, partId);
    insertBatchRequest.input("VendorID", sql.Int, VendorID);

    const areaRequest = new sql.Request();

    const areaResult = await areaRequest.query(`
        SELECT AreaID
        FROM Config_StorageArea
        WHERE AreaName = 'Store'
    `);
    
    if (areaResult.recordset.length === 0) {
        throw new Error("Store Area not found");
    }
    
    const areaID = areaResult.recordset[0].AreaID;

    const priorityRequest = new sql.Request();

    priorityRequest.input("PartID", sql.NVarChar, partId);
    
    const priorityResult = await priorityRequest.query(`
        SELECT ISNULL(MAX(Priority), 0) + 1 AS NextPriority
        FROM Material_BatchWiseQty
        WHERE PartID = @PartID
    `);
    
    const priority = priorityResult.recordset[0].NextPriority;
    
    insertBatchRequest.input("AreaID", sql.Int, areaID);
    
    insertBatchRequest.input("BatchID", sql.NVarChar, BatchID);
    
    // Highest priority for new batch
    insertBatchRequest.input("Priority", sql.Int, priority);
    
    insertBatchRequest.input("Quantity", sql.Int, ValidatedQty);
    insertBatchRequest.input("Consumed", sql.Int, 0);
    
    // Completed
    insertBatchRequest.input("Status", sql.Int, 0);
    
    await insertBatchRequest.query(`
        INSERT INTO Material_BatchWiseQty
        (
            PartID,
            VendorID,
            AreaID,
            BatchID,
            Priority,
            Quantity,
            Consumed,
            Status
        )
        VALUES
        (
            @PartID,
            @VendorID,
            @AreaID,
            @BatchID,
            @Priority,
            @Quantity,
            @Consumed,
            @Status
        )
    `);

    const checkStock = await new sql.Request()
    .input("PartID", sql.NVarChar, partId)
    .query(`
        SELECT IncomingQty
        FROM Material_Stock
        WHERE PartID = @PartID
    `);

    if (checkStock.recordset.length === 0) {
        throw new Error("Material Stock record not found");
    }
    
    if (checkStock.recordset[0].IncomingQty < ValidatedQty) {
        throw new Error("Incoming quantity is less than validated quantity.");
    }

    const stockRequest = new sql.Request();

    stockRequest.input("PartID", sql.NVarChar, partId);
    stockRequest.input("Qty", sql.Int, ValidatedQty);
    
    await stockRequest.query(`
        UPDATE Material_Stock
        SET
            IncomingQty = ISNULL(IncomingQty,0) - @Qty,
            StoreQty    = ISNULL(StoreQty,0) + @Qty
        WHERE
            PartID = @PartID
    `);
    return {
        rowsAffected: result.rowsAffected[0]
    };

};

function getCurrentShiftDetails() {
    const now = new Date();

    const minutes = now.getHours() * 60 + now.getMinutes();

    let shiftEnd = new Date(now);

    // Shift A : 07:00 - 15:50
    if (minutes >= 420 && minutes < 950) {

        shiftEnd.setHours(15, 50, 0, 0);

    }
    // Shift B : 15:50 - 00:40 (next day)
    else if (minutes >= 950 || minutes < 40) {

        if (minutes >= 950) {
            // Today 00:40 is already passed, so next day
            shiftEnd.setDate(shiftEnd.getDate() + 1);
        }

        shiftEnd.setHours(0, 40, 0, 0);

    }
    // Shift C : 00:40 - 07:00
    else {

        shiftEnd.setHours(7, 0, 0, 0);

    }

    // Calculate notification
    let shiftStart;
    let shiftEndMinutes;

    if (minutes >= 420 && minutes < 950) {
        shiftStart = 420;
        shiftEndMinutes = 950;
    }
    else if (minutes >= 950 || minutes < 40) {
        shiftStart = minutes >= 950 ? 950 : -10;
        shiftEndMinutes = minutes >= 950 ? 1480 : 40;
    }
    else {
        shiftStart = 40;
        shiftEndMinutes = 420;
    }

    const total = shiftEndMinutes - shiftStart;
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
        notification,
        shiftEndTime: shiftEnd
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
        SET Status = 6,
        ValidatedBy = @validatedBy,
        SampleQty = 5,
        SampleLevel = 1,
        TimeStamp = GETDATE()
        WHERE
            EDINumber = @EDINumber
            AND PartID = @PartID
    `);

    // Insert into Geneology
    const genealogyRequest = new sql.Request();

    genealogyRequest.input("EDINumber", sql.NVarChar, ediNumber);
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

    // const auditRequest = new sql.Request();

    // auditRequest.input("PartID", sql.NVarChar, partId);
    
    // const auditResult = await auditRequest.query(`
    //     SELECT
    //         AL.AuditListID,
    //         AL.DocumentID
    //     FROM Config_AuditList AL
    //     INNER JOIN Config_QADocumentList QD
    //         ON AL.DocumentID = QD.DocumentID
    //     WHERE
    //         AL.PartID = @PartID
    //         AND QD.[Group] = 'IQC'
    // `);

    // for (const audit of auditResult.recordset) {

    //     const auditListID = audit.AuditListID;
    //     const documentID = audit.DocumentID;

    //         // STEP 1: Get next AuditInstanceID
    //     const instanceRequest = new sql.Request();
    
    //     instanceRequest.input(
    //         "DocumentID",
    //         sql.Int,
    //         documentID
    //     );
    
    //     const instanceResult = await instanceRequest.query(`
    //         SELECT
    //             ISNULL(MAX(AuditInstanceID), 0) + 1 AS NextAuditInstanceID
    //         FROM Config_AuditSchedule
    //         WHERE DocumentID = @DocumentID
    //     `);
    
    //     const auditInstanceID =
    //         instanceResult.recordset[0].NextAuditInstanceID;

    //     // STEP 2: Calculate Notification
    //     const shiftDetails = getCurrentShiftDetails();

    //     const notification = shiftDetails.notification;
    //     const endDateTime = shiftDetails.shiftEndTime;
    
    //     // update tables
    //     // STEP 3: Update Config_AuditSchedule
    //     const scheduleRequest = new sql.Request();

    //     scheduleRequest.input("DocumentID", sql.Int, documentID);
    //     scheduleRequest.input("AuditInstanceID", sql.Int, auditInstanceID);
    //     scheduleRequest.input("Notification", sql.Int, notification);         // Normal
        
    //     await scheduleRequest.query(`
    //         UPDATE Config_AuditSchedule
    //         SET
    //             AuditInstanceID = @AuditInstanceID,
    //             Notification = @Notification,
    //             StartDateTime = GETDATE(),
    //             Status = 1
    //         WHERE
    //             DocumentID = @DocumentID
    //     `);

    //     // STEP 4: Update QA_AuditMonitoring

    //     const lineRequest = new sql.Request();

    //     lineRequest.input("DocumentID", sql.Int, documentID);
        
    //     const lineResult = await lineRequest.query(`
    //         SELECT LineID
    //         FROM Config_AuditSchedule
    //         WHERE DocumentID = @DocumentID
    //     `);
        
    //     if (lineResult.recordset.length === 0) {
    //         throw new Error("LineID not found for DocumentID");
    //     }
        
    //     const lineID = lineResult.recordset[0].LineID;

    //     const monitoringRequest = new sql.Request();

    //     monitoringRequest.input("LineID", sql.Int, lineID); // or fetch actual LineID
    //     monitoringRequest.input("AuditListID", sql.Int, auditListID);
    //     monitoringRequest.input("AuditInstanceID", sql.Int, auditInstanceID);
    //     monitoringRequest.input("Notification", sql.Int, notification);
    //     monitoringRequest.input("EndDateTime",sql.DateTime, endDateTime);
        
    //     await monitoringRequest.query(`
    //         INSERT INTO QA_AuditMonitoring
    //         (
    //             LineID,
    //             AuditListID,
    //             AuditInstanceID,
    //             StartDateTime,
    //             EndDateTime,
    //             ActualStartDateTime,
    //             ActualEndDateTime,
    //             Notification,
    //             Status
    //         )
    //         VALUES
    //         (
    //             @LineID,
    //             @AuditListID,
    //             @AuditInstanceID,
    //             GETDATE(),
    //             @EndDateTime,
    //             NULL,
    //             NULL,
    //             @Notification,
    //             1
    //         )
    //     `);
    // }

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
                MR.BatchID,
                MR.PartID,
                CP.PartDesc AS PartName,
                V.VendorName,
                MR.Quantity,
                MR.ValidatedQty,
                MR.Status
            FROM Material_Receiving MR
            INNER JOIN Config_PartVariant CP
                ON MR.PartID = CP.PartID
            INNER JOIN Config_Vendor V
                ON MR.VendorID = V.VendorID
            WHERE MR.Status in (3)
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

    const batchRequest = new sql.Request();

    batchRequest.input("EDINumber", sql.NVarChar, ediNumber);
    batchRequest.input("PartID", sql.NVarChar, partId);
    
    const batchResult = await batchRequest.query(`
        SELECT
            VendorID,
            BatchID,
            ValidatedQty
        FROM Material_Receiving
        WHERE
            EDINumber = @EDINumber
            AND PartID = @PartID
    `);
    
    if (batchResult.recordset.length === 0) {
        throw new Error("Material Receiving record not found");
    }
    
    const {
        VendorID,
        BatchID,
        ValidatedQty
    } = batchResult.recordset[0];

    const insertBatchRequest = new sql.Request();

    insertBatchRequest.input("PartID", sql.NVarChar, partId);
    insertBatchRequest.input("VendorID", sql.Int, VendorID);

    const areaRequest = new sql.Request();

    const areaResult = await areaRequest.query(`
        SELECT AreaID
        FROM Config_StorageArea
        WHERE AreaName = 'Store'
    `);
    
    if (areaResult.recordset.length === 0) {
        throw new Error("Store Area not found");
    }
    
    const areaID = areaResult.recordset[0].AreaID;

    const priorityRequest = new sql.Request();

    priorityRequest.input("PartID", sql.NVarChar, partId);
    
    const priorityResult = await priorityRequest.query(`
        SELECT ISNULL(MAX(Priority), 0) + 1 AS NextPriority
        FROM Material_BatchWiseQty
        WHERE PartID = @PartID
    `);
    
    const priority = priorityResult.recordset[0].NextPriority;
    
    insertBatchRequest.input("AreaID", sql.Int, areaID);
    
    insertBatchRequest.input("BatchID", sql.NVarChar, BatchID);
    
    // Highest priority for new batch
    insertBatchRequest.input("Priority", sql.Int, priority);
    
    insertBatchRequest.input("Quantity", sql.Int, ValidatedQty);
    insertBatchRequest.input("Consumed", sql.Int, 0);
    
    // Completed
    insertBatchRequest.input("Status", sql.Int, 0);
    
    await insertBatchRequest.query(`
        INSERT INTO Material_BatchWiseQty
        (
            PartID,
            VendorID,
            AreaID,
            BatchID,
            Priority,
            Quantity,
            Consumed,
            Status
        )
        VALUES
        (
            @PartID,
            @VendorID,
            @AreaID,
            @BatchID,
            @Priority,
            @Quantity,
            @Consumed,
            @Status
        )
    `);

    const checkStock = await new sql.Request()
    .input("PartID", sql.NVarChar, partId)
    .query(`
        SELECT IncomingQty
        FROM Material_Stock
        WHERE PartID = @PartID
    `);

    if (checkStock.recordset.length === 0) {
        throw new Error("Material Stock record not found");
    }
    
    if (checkStock.recordset[0].IncomingQty < ValidatedQty) {
        throw new Error("Incoming quantity is less than validated quantity.");
    }

    const stockRequest = new sql.Request();

    stockRequest.input("PartID", sql.NVarChar, partId);
    stockRequest.input("Qty", sql.Int, ValidatedQty);
    
    await stockRequest.query(`
        UPDATE Material_Stock
        SET
            IncomingQty = ISNULL(IncomingQty,0) - @Qty,
            StoreQty    = ISNULL(StoreQty,0) + @Qty
        WHERE
            PartID = @PartID
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
            INNER JOIN Config_PartVariant CP
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
                MR.BatchID,
                MR.PartID,
                CP.PartDesc AS PartName,
                V.VendorName,
                MR.Quantity,
                MR.ValidatedQty,
                (MR.Quantity - MR.ValidatedQty) AS GapQty,
                MR.Remark,
                MR.Timestamp
            FROM Material_Receiving MR
            INNER JOIN Config_PartVariant CP
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

    const materialRequest = new sql.Request();

    materialRequest.input("EDINumber", sql.NVarChar, ediNumber);
    materialRequest.input("PartID", sql.NVarChar, partId);
    
    const materialResult = await materialRequest.query(`
        SELECT
            VendorID,
            BatchID,
            ValidatedQty
        FROM Material_Receiving
        WHERE
            EDINumber = @EDINumber
            AND PartID = @PartID
    `);
    
    if (materialResult.recordset.length === 0) {
        throw new Error("Material record not found");
    }
    
    const {
        VendorID,
        BatchID,
        ValidatedQty
    } = materialResult.recordset[0];

    // const stockRequest = new sql.Request();

    // stockRequest.input("PartID", sql.NVarChar, partId);
    // stockRequest.input("RejectedQty", sql.Int, ValidatedQty);
    
    // await stockRequest.query(`
    //     UPDATE Material_Stock
    //     SET
    //         StoreQty = StoreQty - @RejectedQty
    //     WHERE
    //         PartID = @PartID
    // `);

    const now = new Date();

    const minutes = now.getHours() * 60 + now.getMinutes();
    
    const prodShift =
        (minutes >= 420 && minutes < 950)
            ? "A"
            : "B";

    const auditRequest = new sql.Request();

    auditRequest.input("PartID", sql.NVarChar, partId);
    
    const auditResult = await auditRequest.query(`
        SELECT TOP 1
            QAM.AuditListID,
            QAM.AuditInstanceID
        FROM QA_AuditMonitoring QAM
        INNER JOIN Config_AuditList CAL
            ON QAM.AuditListID = CAL.AuditListID
        INNER JOIN Config_QADocumentList QDL
            ON CAL.DocumentID = QDL.DocumentID
        WHERE
            CAL.PartID = @PartID
            AND QDL.[Group] = 'IQC'
        ORDER BY QAM.UID DESC
    `);
    
    if (auditResult.recordset.length === 0) {
        throw new Error("IQC Audit not found");
    }
    
    const {
        AuditListID,
        AuditInstanceID
    } = auditResult.recordset[0];

    const rejectedRequest = new sql.Request();

    rejectedRequest.input("PartID", sql.NVarChar, partId);
    rejectedRequest.input("VendorID", sql.Int, VendorID);
    rejectedRequest.input("EDINumber", sql.NVarChar, ediNumber);
    rejectedRequest.input("AuditListID", sql.Int, AuditListID);
    rejectedRequest.input("AuditInstanceID", sql.Int, AuditInstanceID);
    rejectedRequest.input("BatchID", sql.NVarChar, BatchID);
    rejectedRequest.input("Quantity", sql.Int, ValidatedQty);
    rejectedRequest.input("ProdShift", sql.NVarChar, prodShift);
    
    await rejectedRequest.query(`
        INSERT INTO Material_Rejected
        (
            Timestamp,
            PartID,
            VendorID,
            RejectionSource,
            EDINumber,
            AuditListID,
            AuditInstanceID,
            ProdDate,
            ProdShift,
            BatchID,
            Quantity,
            Status
        )
        VALUES
        (
            GETDATE(),
            @PartID,
            @VendorID,
            1,
            @EDINumber,
            @AuditListID,
            @AuditInstanceID,
            CAST(GETDATE() AS DATE),
            @ProdShift,
            @BatchID,
            @Quantity,
            1
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
    confirmIQC,
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
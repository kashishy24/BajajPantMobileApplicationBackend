const { sql } = require("../config/db");

const checkpointMapping = {
    4: {
        configTable: "Config_IQC_MiliporeAuditPoint",
        executeTable: "QA_Execute_IQC_MiliporeAuditPoint",
        historyTable: "QA_Execute_IQC_MiliporeAuditPoint_History"
    },
    4 : {
        configTable: "Config_IQC_VisualInspectAuditPoint",
        executeTable: "QA_Execute_IQC_VisualInspectAuditPoint",
        historyTable: "QA_Execute_IQC_VisualInspectAuditPoint_History"
    }
};

const getEDIList = async () => {

    const result = await new sql.Request().query(`
        SELECT DISTINCT
            MR.EDINumber,
            V.VendorName
        FROM Material_Receiving MR
        INNER JOIN Config_Vendor V
            ON MR.VendorID = V.VendorID
        WHERE MR.Status = 2
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
            MR.ValidatedQty
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

const storeMaterial = async (
    ediNumber,
    partId,
    userId
) => {

    // ============================================================
    // STEP 1: Get Material Receiving Record
    // ============================================================

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

    const existing = await request.query(`
        SELECT
            UID,
            VendorID,
            Quantity,
            PartID,
            Status,
            ValidatedBy,
            ValidatedQty,
            OKQty,
            RejectedQty,
            HoldQty,
            BatchID,
            Remark,
            SampleQty,
            SampleLevel,
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

    const actualQty = material.Quantity;
    const receivedQty = material.ValidatedQty;


    // ============================================================
    // STEP 2: Check Part Inspection
    // ============================================================

    const inspectionRequest = new sql.Request();

    inspectionRequest.input(
        "PartID",
        sql.NVarChar,
        partId
    );

    const inspectionResult =
        await inspectionRequest.query(`
            SELECT PartInspection
            FROM Config_PartVariant
            WHERE PartID = @PartID
        `);

    if (inspectionResult.recordset.length === 0) {
        throw new Error("Part Variant not found");
    }

    const partInspection =
        inspectionResult.recordset[0].PartInspection;

    // console.log(
    //     "PartInspection:",
    //     inspectionResult.recordset[0].PartInspection
    // );

    // console.log(
    //     "Type:",
    //     typeof inspectionResult.recordset[0].PartInspection
    // );


    // ============================================================
    // STEP 3: Get UserID
    // ============================================================

    const userResult = await new sql.Request()
        .input(
            "UserName",
            sql.NVarChar,
            userId
        )
        .query(`
            SELECT UserID
            FROM Config_User
            WHERE UserName = @UserName
        `);

    if (userResult.recordset.length === 0) {
        throw new Error("User not found");
    }

    const validatedBy =
        userResult.recordset[0].UserID;


    // ============================================================
    // STEP 4:
    // PartInspection = 2
    // Direct Store Flow
    // ============================================================

    if (partInspection == 2) {

        // --------------------------------------------------------
        // Update Material Receiving
        // --------------------------------------------------------

        await new sql.Request()
            .input(
                "ReceivedQty",
                sql.Int,
                receivedQty
            )
            .input(
                "ValidatedBy",
                sql.NVarChar,
                validatedBy
            )
            .input(
                "Status",
                sql.Int,
                9
            )
            .input(
                "BatchID",
                sql.NVarChar,
                ediNumber
            )
            .input(
                "EDINumber",
                sql.NVarChar,
                ediNumber
            )
            .input(
                "PartID",
                sql.NVarChar,
                partId
            )
            .query(`
                UPDATE Material_Receiving
                SET
                    ValidatedQty = @ReceivedQty,
                    OKQty = @ReceivedQty,
                    ValidatedBy = @ValidatedBy,
                    Status = @Status,
                    BatchID = @BatchID,
                    TimeStamp = GETDATE()
                WHERE
                    EDINumber = @EDINumber
                    AND PartID = @PartID
            `);


        // --------------------------------------------------------
        // Get Batch Details
        // --------------------------------------------------------

        const batchResult = await new sql.Request()
            .input(
                "EDINumber",
                sql.NVarChar,
                ediNumber
            )
            .input(
                "PartID",
                sql.NVarChar,
                partId
            )
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

        if (batchResult.recordset.length === 0) {
            throw new Error(
                "Material Receiving record not found"
            );
        }

        const {
            VendorID,
            BatchID,
            ValidatedQty
        } = batchResult.recordset[0];


        // --------------------------------------------------------
        // Get Store Area
        // --------------------------------------------------------

        const areaResult =
            await new sql.Request().query(`
                SELECT AreaID
                FROM Config_StorageArea
                WHERE AreaName = 'Store'
            `);

        if (areaResult.recordset.length === 0) {
            throw new Error("Store Area not found");
        }

        const areaID =
            areaResult.recordset[0].AreaID;


        // --------------------------------------------------------
        // Get Next Priority
        // --------------------------------------------------------

        const priorityResult =
            await new sql.Request()
                .input(
                    "PartID",
                    sql.NVarChar,
                    partId
                )
                .query(`
                    SELECT
                        ISNULL(MAX(Priority), 0) + 1
                        AS NextPriority
                    FROM Material_BatchWiseQty
                    WHERE PartID = @PartID
                `);

        const priority =
            priorityResult.recordset[0].NextPriority;


        // --------------------------------------------------------
        // Insert Material Batch
        // --------------------------------------------------------

        await new sql.Request()
            .input(
                "PartID",
                sql.NVarChar,
                partId
            )
            .input(
                "VendorID",
                sql.Int,
                VendorID
            )
            .input(
                "AreaID",
                sql.Int,
                areaID
            )
            .input(
                "BatchID",
                sql.NVarChar,
                BatchID
            )
            .input(
                "Priority",
                sql.Int,
                priority
            )
            .input(
                "Quantity",
                sql.Int,
                ValidatedQty
            )
            .input(
                "Status",
                sql.Int,
                0
            )
            .query(`
                INSERT INTO Material_BatchWiseQty
                (
                    PartID,
                    VendorID,
                    AreaID,
                    BatchID,
                    Priority,
                    Quantity,
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
                    @Status
                )
            `);


        // --------------------------------------------------------
        // Update Material Stock
        // --------------------------------------------------------

        await new sql.Request()
            .input(
                "PartID",
                sql.NVarChar,
                partId
            )
            .input(
                "Qty",
                sql.Int,
                ValidatedQty
            )
            .query(`
                UPDATE Material_Stock
                SET
                    StoreQty =
                        ISNULL(StoreQty, 0) + @Qty
                WHERE PartID = @PartID
            `);


        // --------------------------------------------------------
        // Insert Geneology
        // --------------------------------------------------------

        await new sql.Request()
            .input(
                "EDINumber",
                sql.NVarChar,
                ediNumber
            )
            .input(
                "PartID",
                sql.NVarChar,
                partId
            )
            .input(
                "Status",
                sql.Int,
                9
            )
            .input(
                "LastUpdatedBy",
                sql.NVarChar,
                validatedBy
            )
            .query(`
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


        // --------------------------------------------------------
        // Insert Material Receiving History
        // --------------------------------------------------------

        await new sql.Request()
            .input(
                "EDINumber",
                sql.NVarChar,
                ediNumber
            )
            .input(
                "PartID",
                sql.NVarChar,
                partId
            )
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


        // --------------------------------------------------------
        // Delete Material Receiving
        // --------------------------------------------------------

        await new sql.Request()
            .input(
                "EDINumber",
                sql.NVarChar,
                ediNumber
            )
            .input(
                "PartID",
                sql.NVarChar,
                partId
            )
            .query(`
                DELETE FROM Material_Receiving
                WHERE
                    EDINumber = @EDINumber
                    AND PartID = @PartID
            `);


        return {
            EDINumber: ediNumber,
            PartID: partId,
            StoredQty: ValidatedQty,
            Status: 9
        };
    }


    // ============================================================
    // STEP 5:
    // PartInspection != 2
    // Existing IQC Flow
    // ============================================================

    else {

        // --------------------------------------------------------
        // Calculate Gap
        // --------------------------------------------------------

        const gap =
            actualQty - receivedQty;


        // --------------------------------------------------------
        // Calculate Current Shift
        // --------------------------------------------------------

        const hour =
            new Date().getHours();

        let currentShift;

        if (hour >= 6 && hour < 14) {

            currentShift = 1;

        } else if (hour >= 14 && hour < 22) {

            currentShift = 2;

        } else {

            currentShift = 3;
        }


        // --------------------------------------------------------
        // Check Same Part / Same Day / Same Shift
        // --------------------------------------------------------

        const checkRequest =
            new sql.Request();

        checkRequest.input(
            "PartID",
            sql.NVarChar,
            partId
        );

        checkRequest.input(
            "EDINumber",
            sql.NVarChar,
            ediNumber
        );

        const checkResult =
            await checkRequest.query(`
                SELECT TOP 1 UID
                FROM Material_Receiving
                WHERE
                    PartID = @PartID
                    AND EDINumber <> @EDINumber
                    AND Status IN (6,7,8,9,10,11)
                    AND CAST(TimeStamp AS DATE)
                        = CAST(GETDATE() AS DATE)
                    AND
                    (
                        (
                            ${currentShift} = 1
                            AND DATEPART(HOUR, TimeStamp)
                                BETWEEN 6 AND 13
                        )
                        OR
                        (
                            ${currentShift} = 2
                            AND DATEPART(HOUR, TimeStamp)
                                BETWEEN 14 AND 21
                        )
                        OR
                        (
                            ${currentShift} = 3
                            AND
                            (
                                DATEPART(HOUR, TimeStamp) >= 22
                                OR
                                DATEPART(HOUR, TimeStamp) < 6
                            )
                        )
                    )
            `);


        const status =
            checkResult.recordset.length > 0
                ? 4
                : 3;


        // --------------------------------------------------------
        // Update Material Receiving
        // --------------------------------------------------------

        const updateRequest =
            new sql.Request();

        updateRequest.input(
            "ReceivedQty",
            sql.Int,
            receivedQty
        );

        updateRequest.input(
            "ValidatedBy",
            sql.NVarChar,
            validatedBy
        );

        updateRequest.input(
            "Status",
            sql.Int,
            status
        );

        updateRequest.input(
            "EDINumber",
            sql.NVarChar,
            ediNumber
        );

        updateRequest.input(
            "PartID",
            sql.NVarChar,
            partId
        );

        updateRequest.input(
            "BatchID",
            sql.NVarChar,
            ediNumber
        );

        await updateRequest.query(`
            UPDATE Material_Receiving
            SET
                ValidatedQty = @ReceivedQty,
                ValidatedBy = @ValidatedBy,
                Status = @Status,
                BatchID = @BatchID,
                TimeStamp = GETDATE()
            WHERE
                EDINumber = @EDINumber
                AND PartID = @PartID
        `);


        // --------------------------------------------------------
        // Insert Geneology
        // --------------------------------------------------------

        await new sql.Request()
            .input(
                "EDINumber",
                sql.NVarChar,
                ediNumber
            )
            .input(
                "PartID",
                sql.NVarChar,
                partId
            )
            .input(
                "Status",
                sql.Int,
                status
            )
            .input(
                "LastUpdatedBy",
                sql.NVarChar,
                validatedBy
            )
            .query(`
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


        // --------------------------------------------------------
        // Get Batch Details
        // --------------------------------------------------------

        const batchRequest =
            new sql.Request();

        batchRequest.input(
            "EDINumber",
            sql.NVarChar,
            ediNumber
        );

        batchRequest.input(
            "PartID",
            sql.NVarChar,
            partId
        );

        const batchResult =
            await batchRequest.query(`
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
            throw new Error(
                "Material Receiving record not found"
            );
        }

        const {
            VendorID,
            BatchID,
            ValidatedQty
        } = batchResult.recordset[0];


        // ========================================================
        // STATUS = 3
        // ========================================================

        if (status === 3) {

            const stockRequest =
                new sql.Request();

            stockRequest.input(
                "PartID",
                sql.NVarChar,
                partId
            );

            stockRequest.input(
                "Qty",
                sql.Int,
                ValidatedQty
            );

            await stockRequest.query(`
                UPDATE Material_Stock
                SET
                    IncomingQty =
                        ISNULL(IncomingQty, 0) + @Qty
                WHERE PartID = @PartID
            `);


            return {
                EDINumber: ediNumber,
                PartID: partId,
                ReceivedQty: receivedQty,
                ExpectedQty: actualQty,
                Gap: gap,
                Status: 3,
                message: "Material moved to Incoming"
            };
        }


        // ========================================================
        // STATUS = 4
        // ========================================================

        else if (status === 4) {

            // ----------------------------------------------------
            // Get Store Area
            // ----------------------------------------------------

            const areaResult =
                await new sql.Request().query(`
                    SELECT AreaID
                    FROM Config_StorageArea
                    WHERE AreaName = 'Store'
                `);

            if (areaResult.recordset.length === 0) {
                throw new Error(
                    "Store Area not found"
                );
            }

            const areaID =
                areaResult.recordset[0].AreaID;


            // ----------------------------------------------------
            // Get Next Priority
            // ----------------------------------------------------

            const priorityResult =
                await new sql.Request()
                    .input(
                        "PartID",
                        sql.NVarChar,
                        partId
                    )
                    .query(`
                        SELECT
                            ISNULL(MAX(Priority), 0) + 1
                            AS NextPriority
                        FROM Material_BatchWiseQty
                        WHERE PartID = @PartID
                    `);

            const priority =
                priorityResult.recordset[0].NextPriority;


            // ----------------------------------------------------
            // Insert Material Batch
            // ----------------------------------------------------

            await new sql.Request()
                .input(
                    "PartID",
                    sql.NVarChar,
                    partId
                )
                .input(
                    "VendorID",
                    sql.Int,
                    VendorID
                )
                .input(
                    "AreaID",
                    sql.Int,
                    areaID
                )
                .input(
                    "BatchID",
                    sql.NVarChar,
                    BatchID
                )
                .input(
                    "Priority",
                    sql.Int,
                    priority
                )
                .input(
                    "Quantity",
                    sql.Int,
                    ValidatedQty
                )
                .input(
                    "Consumed",
                    sql.Int,
                    0
                )
                .input(
                    "Status",
                    sql.Int,
                    0
                )
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


            // ----------------------------------------------------
            // Check Incoming Quantity
            // ----------------------------------------------------

            const checkStock =
                await new sql.Request()
                    .input(
                        "PartID",
                        sql.NVarChar,
                        partId
                    )
                    .query(`
                        SELECT IncomingQty
                        FROM Material_Stock
                        WHERE PartID = @PartID
                    `);

            if (checkStock.recordset.length === 0) {
                throw new Error(
                    "Material Stock record not found"
                );
            }

            if (
                checkStock.recordset[0].IncomingQty
                < ValidatedQty
            ) {
                throw new Error(
                    "Incoming quantity is less than validated quantity."
                );
            }


            // ----------------------------------------------------
            // Move Incoming -> Store
            // ----------------------------------------------------

            const stockRequest =
                new sql.Request();

            stockRequest.input(
                "PartID",
                sql.NVarChar,
                partId
            );

            stockRequest.input(
                "Qty",
                sql.Int,
                ValidatedQty
            );

            await stockRequest.query(`
                UPDATE Material_Stock
                SET
                    StoreQty =
                        ISNULL(StoreQty, 0) + @Qty
                WHERE PartID = @PartID
            `);


            // ----------------------------------------------------
            // Insert History
            // ----------------------------------------------------

            await new sql.Request()
                .input(
                    "EDINumber",
                    sql.NVarChar,
                    ediNumber
                )
                .input(
                    "PartID",
                    sql.NVarChar,
                    partId
                )
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


            // ----------------------------------------------------
            // Delete Material Receiving
            // ----------------------------------------------------

            await new sql.Request()
                .input(
                    "EDINumber",
                    sql.NVarChar,
                    ediNumber
                )
                .input(
                    "PartID",
                    sql.NVarChar,
                    partId
                )
                .query(`
                    DELETE FROM Material_Receiving
                    WHERE
                        EDINumber = @EDINumber
                        AND PartID = @PartID
                `);


            return {
                EDINumber: ediNumber,
                PartID: partId,
                ReceivedQty: receivedQty,
                ExpectedQty: actualQty,
                Gap: gap,
                Status: 4,
                StoredQty: ValidatedQty
            };
        }
    }
};

const createExecuteIQC = async (
    ediNumber,
    partId
) => {

    // ============================================================
    // 1. Get Material Receiving Details
    // ============================================================

    const historyRequest = new sql.Request();

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
            EDINumber = @EDINumber
            AND PartID = @PartID
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


    // ============================================================
    // 2. Get IQC Documents
    // ============================================================

    const documentResult = await new sql.Request().query(`
        SELECT
            DocumentID,
            DocumentNo,
            DocumentName,
            [Group],
            Revision
        FROM Config_QADocumentList
        WHERE [Group] = 'IQC'
    `);


    // ============================================================
    // 3. Loop through IQC Documents
    // ============================================================

    for (const document of documentResult.recordset) {

        let auditInstanceID;


        // ========================================================
        // 4. Check whether Execute Document already exists
        // ========================================================

        const checkResult = await new sql.Request()
            .input(
                "DocumentID",
                sql.Int,
                document.DocumentID
            )
            .query(`
                SELECT TOP 1
                    UID,
                    AuditInstanceID
                FROM QA_Execute_DocumentList
                WHERE DocumentID = @DocumentID
                ORDER BY UID DESC
            `);


        // ========================================================
        // 5. Document already exists
        //    → DO NOT create duplicate document
        //    → Use existing AuditInstanceID
        // ========================================================

        if (checkResult.recordset.length > 0) {

            auditInstanceID =
                checkResult.recordset[0].AuditInstanceID;

        }

        // ========================================================
        // 6. Document does NOT exist
        //    → Create new Execute Document
        // ========================================================

        else {

            const instanceResult = await new sql.Request()
                .input(
                    "DocumentID",
                    sql.Int,
                    document.DocumentID
                )
                .query(`
                    SELECT
                        ISNULL(
                            MAX(AuditInstanceID),
                            0
                        ) + 1 AS AuditInstanceID
                    FROM QA_Execute_DocumentList_History
                    WHERE DocumentID = @DocumentID
                `);

            auditInstanceID =
                instanceResult.recordset[0].AuditInstanceID;


            // ----------------------------------------------------
            // Insert Execute Document
            // ----------------------------------------------------

            await new sql.Request()
                .input(
                    "DocumentID",
                    sql.Int,
                    document.DocumentID
                )
                .input(
                    "DocumentNo",
                    sql.Int,
                    document.DocumentNo
                )
                .input(
                    "DocumentName",
                    sql.NVarChar,
                    document.DocumentName
                )
                .input(
                    "Group",
                    sql.NVarChar,
                    document.Group
                )
                .input(
                    "Revision",
                    sql.Int,
                    document.Revision
                )
                .input(
                    "AuditInstanceID",
                    sql.Int,
                    auditInstanceID
                )
                .query(`
                    INSERT INTO QA_Execute_DocumentList
                    (
                        DocumentID,
                        DocumentNo,
                        DocumentName,
                        [Group],
                        Revision,
                        AuditInstanceID
                    )
                    VALUES
                    (
                        @DocumentID,
                        @DocumentNo,
                        @DocumentName,
                        @Group,
                        @Revision,
                        @AuditInstanceID
                    )
                `);
        }


        // ========================================================
        // 7. IMPORTANT:
        //    Always fetch Config_AuditList
        //    even when Execute Document already exists
        // ========================================================

        const auditListResult = await new sql.Request()
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
                    DocumentID = @DocumentID
                    AND PartID = @PartID
            `);


        // ========================================================
        // 8. Create Execute IQC Audit List
        // ========================================================

        for (const audit of auditListResult.recordset) {

            // ----------------------------------------------------
            // Prevent duplicate audit entry for same BatchID
            // ----------------------------------------------------

            const auditExistsResult = await new sql.Request()
                .input(
                    "AuditListID",
                    sql.Int,
                    audit.AuditListID
                )
                .input(
                    "BatchID",
                    sql.NVarChar,
                    BatchID
                )
                .query(`
                    SELECT TOP 1 UID
                    FROM QA_Execute_IQC_AuditList
                    WHERE
                        AuditListID = @AuditListID
                        AND BatchID = @BatchID
                `);


            if (auditExistsResult.recordset.length > 0) {
                continue;
            }


            // ----------------------------------------------------
            // Insert Execute IQC Audit
            // ----------------------------------------------------

            // ----------------------------------------------------
            // Get Production Shift from ApplicationsSetting
            // ----------------------------------------------------
            
            const shiftResult = await new sql.Request()
                .input(
                    "ParameterName",
                    sql.NVarChar,
                    "ProdShift"
                )
                .query(`
                    SELECT ParameterValue
                    FROM ApplicationsSetting
                    WHERE ParameterName = @ParameterName
                `);
            
            if (shiftResult.recordset.length === 0) {
                throw new Error(
                    "ProdShift not found in ApplicationsSetting"
                );
            }
            
            const prodShift =
                shiftResult.recordset[0].ParameterValue;

            await new sql.Request()
                .input(
                    "AuditListID",
                    sql.Int,
                    audit.AuditListID
                )
                .input(
                    "ModelFamilyID",
                    sql.Int,
                    audit.ModelFamilyID
                )
                .input(
                    "ModelID",
                    sql.Int,
                    audit.ModelID
                )
                .input(
                    "SKUID",
                    sql.Int,
                    audit.SKUID
                )
                .input(
                    "PartID",
                    sql.NVarChar,
                    audit.PartID
                )
                .input(
                    "VendorID",
                    sql.Int,
                    VendorID
                )
                .input(
                    "BatchID",
                    sql.NVarChar,
                    BatchID
                )
                .input(
                    "SampleLevel",
                    sql.Int,
                    1
                )
                .input(
                    "SampleSize",
                    sql.Int,
                    5
                )
                .input(
                    "NokSample",
                    sql.Int,
                    0
                )
                .input(
                    "Status",
                    sql.Int,
                    1
                )
                .input(
                    "ProdDate",
                    sql.Date,
                    new Date()
                )
                .input(
                    "ProdShift",
                    sql.NVarChar,
                    prodShift
                )
                .input(
                    "AuditInstanceID",
                    sql.Int,
                    auditInstanceID
                )
                .input(
                    "Revision",
                    sql.Int,
                    1
                )
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

const confirmIQC = async (
    ediNumber,
    partId
) => {
    await createExecuteIQC(
        ediNumber,
        partId
    );
    return {
        success: true,
        message: "IQC confirmed successfully."
    };
}

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

const getMaterialStatus = async (partID) => {

    const request = new sql.Request();

    request.input(
        "PartID",
        sql.NVarChar(20),
        partID
    );

    const result = await request.query(`
        SELECT
            MS.PartID,
            CP.PartDesc AS PartName,
            MS.IncomingQty,
            MS.StoreQty,
            MS.StoreHoldQty,
            MS.LineCKitRackQty,
            MS.LineCHoldKitRackQty,
            MS.LineCMaterialOnKit,
            MS.LineCHoldMaterialOnKit,
            MS.LineCQty,
            MS.LineCHoldQty,
            MS.LinesideCQty,
            MS.LinesideCHoldQty
        FROM Material_Stock MS
        INNER JOIN Config_PartVariant CP
            ON MS.PartID = CP.PartID
        WHERE MS.PartID = @PartID
    `);

    return result.recordset;
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

        await createExecuteIQC(
            ediNumber,
            partId
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

const getSqlType = (value) => {

    if (value === null || value === undefined) {
        return sql.NVarChar;
    }

    if (typeof value === "number") {
        return sql.Int;
    }

    if (value instanceof Date) {
        return sql.DateTime;
    }

    return sql.NVarChar;
};

const sampleCollection = async (
    batchId,
    partId,
    userId
) => {

    // ==================================================
    // 1. Find Material Receiving record
    // ==================================================

    const fetchRequest = new sql.Request();

    fetchRequest.input(
        "BatchID",
        sql.NVarChar,
        batchId
    );

    fetchRequest.input(
        "PartID",
        sql.NVarChar,
        partId
    );

    const existing = await fetchRequest.query(`
        SELECT
            UID,
            EDINumber,
            BatchID,
            PartID
        FROM Material_Receiving
        WHERE
            BatchID = @BatchID
            AND PartID = @PartID
    `);

    if (existing.recordset.length === 0) {
        throw new Error("Material receiving record not found");
    }

    const materialReceiving = existing.recordset[0];

    const materialReceivingUID = materialReceiving.UID;
    const ediNumber = materialReceiving.EDINumber;


    // ==================================================
    // 2. Get User
    // ==================================================

    const userResult = await new sql.Request()
        .input(
            "UserName",
            sql.NVarChar,
            userId
        )
        .query(`
            SELECT UserID
            FROM Config_User
            WHERE UserName = @UserName
        `);

    if (userResult.recordset.length === 0) {
        throw new Error("User not found");
    }

    const validatedBy = userResult.recordset[0].UserID;


    // ==================================================
    // 3. Update Material Receiving
    // ==================================================

    const request = new sql.Request();

    request.input(
        "BatchID",
        sql.NVarChar,
        batchId
    );

    request.input(
        "PartID",
        sql.NVarChar,
        partId
    );

    request.input(
        "ValidatedBy",
        sql.NVarChar,
        validatedBy
    );

    const result = await request.query(`
        UPDATE Material_Receiving
        SET
            Status = 6,
            ValidatedBy = @ValidatedBy,
            SampleQty = 5,
            SampleLevel = 1,
            TimeStamp = GETDATE()
        WHERE
            BatchID = @BatchID
            AND PartID = @PartID
    `);


    // ==================================================
    // 4. Insert into Geneology
    // ==================================================

    const genealogyRequest = new sql.Request();

    genealogyRequest.input(
        "EDINumber",
        sql.NVarChar,
        ediNumber
    );

    genealogyRequest.input(
        "PartID",
        sql.NVarChar,
        partId
    );

    genealogyRequest.input(
        "Status",
        sql.Int,
        6
    );

    genealogyRequest.input(
        "LastUpdatedBy",
        sql.NVarChar,
        validatedBy
    );

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


    // ==================================================
    // 5. Get Execute IQC Audit Lists
    // ==================================================

    const executeAuditRequest = new sql.Request();

    executeAuditRequest.input(
        "BatchID",
        sql.NVarChar,
        batchId
    );

    executeAuditRequest.input(
        "PartID",
        sql.NVarChar,
        partId
    );

    const executeAuditResult =
    await executeAuditRequest.query(`
        SELECT
            E.UID,
            E.AuditListID,
            E.PartID,
            E.BatchID,
            E.AuditInstanceID,
            E.Status,
            A.DocumentID
        FROM QA_Execute_IQC_AuditList E
        INNER JOIN Config_AuditList A
            ON E.AuditListID = A.AuditListID
        WHERE
            E.PartID = @PartID
            AND E.BatchID = @BatchID
    `);

    // ==================================================
    // 5.1 Update QA Execute IQC Audit List
    // ==================================================
    
    const updateAuditRequest = new sql.Request();
    
    updateAuditRequest.input(
        "BatchID",
        sql.NVarChar,
        batchId
    );
    
    updateAuditRequest.input(
        "PartID",
        sql.NVarChar,
        partId
    );
    
    updateAuditRequest.input(
        "ExecutedBy",
        sql.NVarChar,
        validatedBy
    );
    
    await updateAuditRequest.query(`
        UPDATE QA_Execute_IQC_AuditList
        SET
            ExecutedStartTime = GETDATE(),
            ExecutedBy = @ExecutedBy,
            Status = 2
        WHERE
            PartID = @PartID
            AND BatchID = @BatchID
    `);


    // ==================================================
    // 6. Process Each Audit List
    // ==================================================

    for (const executeAudit of executeAuditResult.recordset) {

        const documentID = executeAudit.DocumentID;
        const auditListID = executeAudit.AuditListID;
        const auditInstanceID = executeAudit.AuditInstanceID;
        // ----------------------------------------------
        // Get mapping
        // ----------------------------------------------

        const mapping = checkpointMapping[documentID];

        if (!mapping) {
            throw new Error(
                `Checkpoint mapping not found for DocumentID ${documentID}`
            );
        }

        const configTable = mapping.configTable;
        const executeTable = mapping.executeTable;


        // ----------------------------------------------
        // Get checkpoints
        // ----------------------------------------------

        const checkpointRequest = new sql.Request();

        checkpointRequest.input(
            "AuditListID",
            sql.Int,
            auditListID
        );

        const checkpointResult =
            await checkpointRequest.query(`
                SELECT *
                FROM ${configTable}
                WHERE AuditListID = @AuditListID
            `);

        // console.log(
        //     `AuditListID ${auditListID} checkpoints:`,
        //     checkpointResult.recordset
        // );
         const checkpoints = checkpointResult.recordset;

    if (checkpoints.length === 0) {
        continue;
    }
    // --------------------------------------------------
    // 2. Get columns of EXECUTE table
    // --------------------------------------------------
    
    const columnResult = await new sql.Request()
        .input(
            "TableName",
            sql.NVarChar,
            executeTable
        )
        .query(`
            SELECT
                c.COLUMN_NAME,
                COLUMNPROPERTY(
                    OBJECT_ID(
                        c.TABLE_SCHEMA + '.' + c.TABLE_NAME
                    ),
                    c.COLUMN_NAME,
                    'IsIdentity'
                ) AS IsIdentity
            FROM INFORMATION_SCHEMA.COLUMNS c
            WHERE
                c.TABLE_NAME = @TableName
            ORDER BY
                c.ORDINAL_POSITION
        `);
    
    // --------------------------------------------------
    // 3. Find common columns - CASE INSENSITIVE
    // --------------------------------------------------
    
    // Config table columns
    const configColumns = Object.keys(checkpoints[0]);
    
    // Create lowercase lookup for execute table columns
    const executeColumnMap = {};
    
    columnResult.recordset
        .filter(column => column.IsIdentity !== 1)
        .forEach(column => {
    
            executeColumnMap[
                column.COLUMN_NAME.toLowerCase()
            ] = column.COLUMN_NAME;
    
        });


    // --------------------------------------------------
    // Find common columns
    // --------------------------------------------------

    const commonColumns = [];

    for (const configColumn of configColumns) {
    
        const executeColumn =
            executeColumnMap[configColumn.toLowerCase()];
    
        if (executeColumn) {
    
            // Do NOT map Config AuditPointId
            // to Execute AuditPointID.
            //
            // Execute AuditPointID should receive
            // Config UID because of the FK.
    
            if (
                configColumn.toLowerCase() === "auditpointid" &&
                executeColumn.toLowerCase() === "auditpointid"
            ) {
                continue;
            }

            // AuditInstanceID must come from
            // QA_Execute_IQC_AuditList
            if (
                configColumn.toLowerCase() === "auditinstanceid"
            ) {
                continue;
            }
    
            commonColumns.push({
                configColumn: configColumn,
                executeColumn: executeColumn
            });
        }
    }
    
    
    // ----------------------------------------------
    // Special FK mapping
    // Config UID → Execute AuditPointID
    // ----------------------------------------------
    
    if (executeColumnMap["auditpointid"]) {
    
        commonColumns.push({
            configColumn: "UID",
            executeColumn: executeColumnMap["auditpointid"]
        });
    
    }
    
    // --------------------------------------------------
    // Add SampleLevel and SampleNo
    // --------------------------------------------------
    
    const sampleLevelColumn =
        executeColumnMap["samplelevel"];
    
    const sampleNoColumn =
        executeColumnMap["sampleno"];

    const auditInstanceIDColumn =
    executeColumnMap["auditinstanceid"];
    
    if (!sampleLevelColumn) {
        throw new Error(
            `SampleLevel column not found in execute table ${executeTable}`
        );
    }
    
    if (!sampleNoColumn) {
        throw new Error(
            `SampleNo column not found in execute table ${executeTable}`
        );
    }
    

    if (!auditInstanceIDColumn) {
        throw new Error(
            `AuditInstanceID column not found in execute table ${executeTable}`
        );
    }
    
    // --------------------------------------------------
    // Remove columns that should NOT come from config
    // --------------------------------------------------
    
    // These will be handled separately
    const specialColumns = [
        "samplelevel",
        "sampleno",
        "auditinstanceid"
    ];
    
    const insertColumns = commonColumns.filter(
        column =>
            !specialColumns.includes(
                column.executeColumn.toLowerCase()
            )
    );
    
    
    // --------------------------------------------------
    // Debug
    // --------------------------------------------------
    
    console.log(
        `Common columns ${configTable} → ${executeTable}:`,
        insertColumns
            .map(column => ({
                config: column.configColumn,
                execute: column.executeColumn
            }))
    );
    
    
    // --------------------------------------------------
    // 4. Insert each checkpoint 5 times
    // --------------------------------------------------
    
    for (const checkpoint of checkpoints) {
    
        // ----------------------------------------------
        // Sample No 1 → 5
        // ----------------------------------------------
    
        for (let sampleNo = 1; sampleNo <= 5; sampleNo++) {
    
            const request = new sql.Request();
    
    
            // ------------------------------------------
            // Columns
            // ------------------------------------------
    
            const columnNames = [];
    
            const parameterNames = [];
    
            let parameterIndex = 0;
    
    
            // ------------------------------------------
            // Common columns
            // ------------------------------------------
    
            for (const column of insertColumns) {
    
                columnNames.push(
                    `[${column.executeColumn}]`
                );
    
                parameterNames.push(
                    `@value${parameterIndex}`
                );
    
    
                let value;
    
    
                // --------------------------------------
                // Values from QA_Execute_IQC_AuditList
                // --------------------------------------
    
                if (
                    column.configColumn.toLowerCase() ===
                        "auditlistid" ||
                    column.configColumn.toLowerCase() ===
                        "partid" ||
                    column.configColumn.toLowerCase() ===
                        "batchid"
                ) {
    
                    value = executeAudit[
                        column.configColumn
                    ];
    
                }
    
                // --------------------------------------
                // Values from CONFIG checkpoint table
                // --------------------------------------
    
                else {
    
                    value = checkpoint[
                        column.configColumn
                    ];
    
                }
    
    
                // --------------------------------------
                // SQL Type
                // --------------------------------------
    
                let sqlType;
    
                if (typeof value === "number") {
    
                    sqlType = Number.isInteger(value)
                        ? sql.Int
                        : sql.Decimal(18, 4);
    
                }
                else if (typeof value === "boolean") {
    
                    sqlType = sql.Bit;
    
                }
                else {
    
                    sqlType = sql.NVarChar(sql.MAX);
    
                }
    
    
                request.input(
                    `value${parameterIndex}`,
                    sqlType,
                    value
                );
    
                parameterIndex++;
            }

            // ==================================================
            // AuditInstanceID
            // ==================================================

            columnNames.push(
                `[${auditInstanceIDColumn}]`
            );

            parameterNames.push(
                `@AuditInstanceID`
            );

            request.input(
                "AuditInstanceID",
                sql.Int,
                auditInstanceID
            );
    
    
            // ------------------------------------------
            // SampleLevel
            // ------------------------------------------
    
            columnNames.push(
                `[${sampleLevelColumn}]`
            );
    
            parameterNames.push(
                `@SampleLevel`
            );
    
            request.input(
                "SampleLevel",
                sql.Int,
                1
            );
    
    
            // ------------------------------------------
            // SampleNo
            // ------------------------------------------
    
            columnNames.push(
                `[${sampleNoColumn}]`
            );
    
            parameterNames.push(
                `@SampleNo`
            );
    
            request.input(
                "SampleNo",
                sql.Int,
                sampleNo
            );
    
    
            // ------------------------------------------
            // INSERT
            // ------------------------------------------
    
            const insertQuery = `
                INSERT INTO ${executeTable}
                (
                    ${columnNames.join(", ")}
                )
                VALUES
                (
                    ${parameterNames.join(", ")}
                )
            `;
    
    
            // console.log(
            //     `DocumentID: ${documentID}, ` +
            //     `AuditListID: ${auditListID}, ` +
            //     `AuditInstanceID: ${auditInstanceID}, ` +
            //     `Checkpoint: ${checkpoint.Aspect}, ` +
            //     `SampleNo: ${sampleNo}`
            // );
    
    
            await request.query(insertQuery);
        }
    }
    }


    // ==================================================
    // 5. Response
    // ==================================================

    return {
        rowsAffected: result.rowsAffected[0],
        batchId,
        partId,
        ediNumber
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
                MR.OKQty,
                MR.RejectedQty,
                MR.HoldQty,
                MR.Status
            FROM Material_Receiving MR
            INNER JOIN Config_PartVariant CP
                ON MR.PartID = CP.PartID
            INNER JOIN Config_Vendor V
                ON MR.VendorID = V.VendorID
            WHERE MR.Status in (3 , 6 , 7 , 8)
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

const getHoldMaterialList = async () => {

    const result = await new sql.Request().query(`
        SELECT
            MR.UID,
            MR.EDINumber,
            V.VendorName,
            CP.PartDesc AS PartName,
            MR.ValidatedQty,
            MR.Timestamp,
            MR.OKQty,
            MR.RejectedQty,
            MR.HoldQty,
            MR.ValidatedBy,
            MR.SampleQty,
            MR.SampleLevel,
            MR.Status,
            MR.BatchID,
            MR.Remark
        FROM Material_Receiving MR
        INNER JOIN Config_PartVariant CP
            ON MR.PartID = CP.PartID
        INNER JOIN Config_Vendor V
            ON MR.VendorID = V.VendorID
        WHERE ISNULL(MR.HoldQty, 0) > 0
        ORDER BY MR.Timestamp DESC
    `);

     console.log("HOLD MATERIAL RESULT:");
    console.log(result.recordset);
    return result.recordset;
};

const confirmHoldMaterial = async ({
    EDINumber,
    PartID,
    HoldOk,
    HoldRejected,
    LastUpdatedBy
}) => {

    const pool = await sql.connect();

    const transaction = new sql.Transaction(pool);

    try {

        await transaction.begin();

        /*
         * 1. Get existing Material_Receiving record
         */
        const request = new sql.Request(transaction);

        request.input("EDINumber", sql.NVarChar(50), EDINumber);
        request.input("PartID", sql.NVarChar(50), PartID);

        const existingResult = await request.query(`
            SELECT
                UID,
                EDINumber,
                PartID,
                ValidatedQty,
                HoldQty,
                OKQty,
                RejectedQty,
                Status
            FROM Material_Receiving
            WHERE EDINumber = @EDINumber
              AND PartID = @PartID
        `);

        if (existingResult.recordset.length === 0) {
            throw new Error(
                "Material receiving record not found"
            );
        }

        const existing = existingResult.recordset[0];

        const currentHoldQty = Number(existing.HoldQty || 0);
        const currentOKQty = Number(existing.OKQty || 0);
        const currentRejectedQty = Number(existing.RejectedQty || 0);

        const holdOkQty = Number(HoldOk);
        const holdRejectedQty = Number(HoldRejected);

        /*
         * Validate quantities
         */
        if (
            !Number.isInteger(holdOkQty) ||
            !Number.isInteger(holdRejectedQty)
        ) {
            throw new Error(
                "HoldOk and HoldRejected must be valid integer quantities"
            );
        }

        if (holdOkQty < 0 || holdRejectedQty < 0) {
            throw new Error(
                "HoldOk and HoldRejected cannot be negative"
            );
        }

        const totalConfirmedQty =
            holdOkQty + holdRejectedQty;

        if (totalConfirmedQty > currentHoldQty) {
            throw new Error(
                `Confirmed quantity (${totalConfirmedQty}) cannot be greater than HoldQty (${currentHoldQty})`
            );
        }

        /*
         * Calculate new quantities
         */
        const newOKQty =
            currentOKQty + holdOkQty;

        const newRejectedQty =
            currentRejectedQty + holdRejectedQty;

        const newHoldQty =
            currentHoldQty - totalConfirmedQty;

        /*
         * Decide status
         *
         * If hold quantity still remains:
         *     keep current status
         *
         * If all hold quantity is cleared:
         *     status = 4
         *
         * Change this status if your project uses
         * another status for "Hold Confirmed".
         */
        const newStatus =
            newHoldQty === 0
                ? 4
                : existing.Status;

        /*
         * 2. Update Material_Receiving
         */
        const updateRequest = new sql.Request(transaction);

        updateRequest.input(
            "UID",
            sql.Int,
            existing.UID
        );

        updateRequest.input(
            "OKQty",
            sql.Int,
            newOKQty
        );

        updateRequest.input(
            "RejectedQty",
            sql.Int,
            newRejectedQty
        );

        updateRequest.input(
            "HoldQty",
            sql.Int,
            newHoldQty
        );

        updateRequest.input(
            "Status",
            sql.Int,
            newStatus
        );

        await updateRequest.query(`
            UPDATE Material_Receiving
            SET
                OKQty = @OKQty,
                RejectedQty = @RejectedQty,
                HoldQty = @HoldQty,
                Status = @Status,
                Timestamp = GETDATE()
            WHERE UID = @UID
        `);

        /*
         * 3. Insert genealogy
         */
        const genealogyRequest =
            new sql.Request(transaction);

        genealogyRequest.input(
            "UID",
            sql.Int,
            existing.UID
        );

        genealogyRequest.input(
            "EDINumber",
            sql.NVarChar(50),
            EDINumber
        );

        genealogyRequest.input(
            "PartID",
            sql.NVarChar(50),
            PartID
        );

        genealogyRequest.input(
            "Status",
            sql.Int,
            newStatus
        );

        genealogyRequest.input(
            "LastUpdatedBy",
            sql.NVarChar(50),
            LastUpdatedBy
        );

        genealogyRequest.input(
            "ValidatedQty",
            sql.Int,
            existing.ValidatedQty || 0
        );

        genealogyRequest.input(
            "HoldQty",
            sql.Int,
            newHoldQty
        );

        genealogyRequest.input(
            "OKQty",
            sql.Int,
            newOKQty
        );

        genealogyRequest.input(
            "RejectedQty",
            sql.Int,
            newRejectedQty
        );

        await genealogyRequest.query(`
            INSERT INTO Material_Receiving_Geneology
            (
                UID,
                EDINumber,
                PartID,
                Status,
                LastUpdatedBy,
                LastUpdatedTime,
                ValidatedQty,
                HoldQty,
                OKQty,
                RejectedQty
            )
            VALUES
            (
                @UID,
                @EDINumber,
                @PartID,
                @Status,
                @LastUpdatedBy,
                GETDATE(),
                @ValidatedQty,
                @HoldQty,
                @OKQty,
                @RejectedQty
            )
        `);

        await transaction.commit();

        return {
            UID: existing.UID,
            EDINumber,
            PartID,
            ValidatedQty: existing.ValidatedQty,
            HoldQty: newHoldQty,
            OKQty: newOKQty,
            RejectedQty: newRejectedQty,
            Status: newStatus
        };

    } catch (error) {

        await transaction.rollback();

        throw error;
    }
};

const confirmAuditList = async (
    auditListID,
    auditInstanceID,
    batchId,
    userId,
    remark,
    holdQty,
    rejectedQty,
    okQty,
    sampleLevel,
    sampleSize,
    NokSample
) => {

    const transaction = new sql.Transaction();

    try {

        await transaction.begin();


        // ==================================================
        // 1. Get User
        // ==================================================

        const userRequest = new sql.Request(transaction);

        userRequest.input(
            "UserName",
            sql.NVarChar,
            userId
        );

        const userResult = await userRequest.query(`
            SELECT UserID
            FROM Config_User
            WHERE UserName = @UserName
        `);

        if (userResult.recordset.length === 0) {
            throw new Error("User not found");
        }

        const executedBy = userResult.recordset[0].UserID;


        // ==================================================
        // 2. Get Execute Audit List
        // ==================================================

        const auditRequest = new sql.Request(transaction);

        auditRequest.input(
            "AuditListID",
            sql.Int,
            auditListID
        );

        auditRequest.input(
            "AuditInstanceID",
            sql.Int,
            auditInstanceID
        );

        auditRequest.input(
            "BatchID",
            sql.NVarChar,
            batchId
        );

        const auditResult = await auditRequest.query(`
            SELECT
                UID,
                AuditListID,
                PartID,
                BatchID,
                AuditInstanceID,
                Status,
                SampleLevel,
                SampleSize,
                NokSample
            FROM QA_Execute_IQC_AuditList
            WHERE
                AuditListID = @AuditListID
                AND AuditInstanceID = @AuditInstanceID
                AND BatchID = @BatchID
        `);

        if (auditResult.recordset.length === 0) {
            throw new Error(
                "IQC Audit List not found"
            );
        }

        const audit = auditResult.recordset[0];

        const partId = audit.PartID;


        // ==================================================
        // 3. Calculate Material Receiving Status
        // ==================================================

        let materialStatus;


        if (
            rejectedQty === 0 &&
            holdQty === 0
        ) {

            materialStatus = 9;

        }
        else if (
            rejectedQty > 0 &&
            holdQty > 0
        ) {

            materialStatus = 7;

        }
        else if (
            rejectedQty > 0 &&
            holdQty === 0
        ) {

            materialStatus = 7;

        }
        else if (
            okQty === 0 &&
            rejectedQty === 0
        ) {

            materialStatus = 8;

        }
        else if (
            holdQty === 0 &&
            okQty === 0
        ) {

            materialStatus = 11;

        }
        else {

            throw new Error(
                "Invalid quantity/status combination"
            );
        }


        // ==================================================
        // 4. Get Material Receiving
        // ==================================================

        const receivingRequest =
            new sql.Request(transaction);

        receivingRequest.input(
            "BatchID",
            sql.NVarChar,
            batchId
        );

        receivingRequest.input(
            "PartID",
            sql.NVarChar,
            partId
        );

        const receivingResult =
            await receivingRequest.query(`
                SELECT
                    UID,
                    EDINumber,
                    PartID,
                    BatchID,
                    VendorID,
                    IncomingQty,
                    ValidatedQty
                FROM Material_Receiving
                WHERE
                    BatchID = @BatchID
                    AND PartID = @PartID
            `);

        if (receivingResult.recordset.length === 0) {
            throw new Error(
                "Material Receiving record not found"
            );
        }

        const receiving =
            receivingResult.recordset[0];

        const ediNumber =
            receiving.EDINumber;

        const vendorId =
            receiving.VendorID;


        // ==================================================
        // 5. Update Material Receiving
        // ==================================================

        const updateReceiving =
            new sql.Request(transaction);

        updateReceiving.input(
            "BatchID",
            sql.NVarChar,
            batchId
        );

        updateReceiving.input(
            "PartID",
            sql.NVarChar,
            partId
        );

        updateReceiving.input(
            "OKQty",
            sql.Int,
            okQty
        );

        updateReceiving.input(
            "HoldQty",
            sql.Int,
            holdQty
        );

        updateReceiving.input(
            "RejectedQty",
            sql.Int,
            rejectedQty
        );

        updateReceiving.input(
            "SampleLevel",
            sql.Int,
            sampleLevel
        );

        updateReceiving.input(
            "SampleSize",
            sql.Int,
            sampleSize
        );

        updateReceiving.input(
            "Status",
            sql.Int,
            materialStatus
        );

        updateReceiving.input(
            "ValidatedBy",
            sql.NVarChar,
            executedBy
        );

        await updateReceiving.query(`
            UPDATE Material_Receiving
            SET
                OKQty = @OKQty,
                HoldQty = @HoldQty,
                RejectedQty = @RejectedQty,
                SampleLevel = @SampleLevel,
                SampleSize = @SampleSize,
                Status = @Status,
                ValidatedBy = @ValidatedBy,
                TimeStamp = GETDATE()
            WHERE
                BatchID = @BatchID
                AND PartID = @PartID
        `);


        // ==================================================
        // 6. Insert Geneology
        // ==================================================

        const genealogyRequest =
            new sql.Request(transaction);

        genealogyRequest.input(
            "EDINumber",
            sql.NVarChar,
            ediNumber
        );

        genealogyRequest.input(
            "PartID",
            sql.NVarChar,
            partId
        );

        genealogyRequest.input(
            "Status",
            sql.Int,
            materialStatus
        );

        genealogyRequest.input(
            "LastUpdatedBy",
            sql.NVarChar,
            executedBy
        );

        genealogyRequest.input(
            "ValidatedQty",
            sql.Int,
            receiving.ValidatedQty
        );
        
        genealogyRequest.input(
            "HoldQty",
            sql.Int,
            holdQty
        );
        
        genealogyRequest.input(
            "OKQty",
            sql.Int,
            okQty
        );
        
        genealogyRequest.input(
            "RejectedQty",
            sql.Int,
            rejectedQty
        );

        await genealogyRequest.query(`
            INSERT INTO Material_Receiving_Geneology
            (
                EDINumber,
                PartID,
                ValidatedQty,
                HoldQty,
                OKQty,
                RejectedQty,
                Status,
                LastUpdatedBy,
                LastUpdatedTime
            )
            VALUES
            (
                @EDINumber,
                @PartID,
                @ValidatedQty,
                @HoldQty,
                @OKQty,
                @RejectedQty,
                @Status,
                @LastUpdatedBy,
                GETDATE()
            )
        `);

        // ==================================================
        // 7. Get DocumentID
        // ==================================================

        const documentRequest =
            new sql.Request(transaction);

        documentRequest.input(
            "AuditListID",
            sql.Int,
            auditListID
        );

        const documentResult =
            await documentRequest.query(`
                SELECT DocumentID
                FROM Config_AuditList
                WHERE AuditListID = @AuditListID
            `);

        if (documentResult.recordset.length === 0) {
            throw new Error(
                `DocumentID not found for AuditListID ${auditListID}`
            );
        }

        const documentID =
            documentResult.recordset[0].DocumentID;


        // ==================================================
        // 8. Get Table Mapping
        // ==================================================

        const mapping =
            checkpointMapping[documentID];

        if (!mapping) {
            throw new Error(
                `Checkpoint mapping not found for DocumentID ${documentID}`
            );
        }

        const executeTable =
            mapping.executeTable;

        const historyTable =
            mapping.historyTable;

        // ==================================================
        // 9. Move Execute Checkpoints to History
        // ==================================================

        if (historyTable) {

            const historyRequest =
                new sql.Request(transaction);

            historyRequest.input(
                "AuditListID",
                sql.Int,
                auditListID
            );

            historyRequest.input(
                "AuditInstanceID",
                sql.Int,
                auditInstanceID
            );

            await historyRequest.query(`
                INSERT INTO ${historyTable}
                SELECT *
                FROM ${executeTable}
                WHERE
                    AuditListID = @AuditListID
                    AND AuditInstanceID = @AuditInstanceID
            `);


            const deleteRequest =
                new sql.Request(transaction);

            deleteRequest.input(
                "AuditListID",
                sql.Int,
                auditListID
            );

            deleteRequest.input(
                "AuditInstanceID",
                sql.Int,
                auditInstanceID
            );

            await deleteRequest.query(`
                DELETE FROM ${executeTable}
                WHERE
                    AuditListID = @AuditListID
                    AND AuditInstanceID = @AuditInstanceID
            `);
        }

        // ==================================================
        // 10. Update Execute IQC Audit List
        // ==================================================

        const auditStatus =
            rejectedQty > 0
                ? 3
                : 4;

        const updateAuditRequest =
            new sql.Request(transaction);

        updateAuditRequest.input(
            "AuditListID",
            sql.Int,
            auditListID
        );

        updateAuditRequest.input(
            "AuditInstanceID",
            sql.Int,
            auditInstanceID
        );

        updateAuditRequest.input(
            "BatchID",
            sql.NVarChar,
            batchId
        );

        updateAuditRequest.input(
            "ExecutedBy",
            sql.NVarChar,
            executedBy
        );

        updateAuditRequest.input(
            "ExecutedByRemark",
            sql.NVarChar,
            remark || null
        );

        updateAuditRequest.input(
            "Status",
            sql.Int,
            auditStatus
        );

        updateAuditRequest.input(
            "NokSample",
            sql.Int,
            NokSample
        );

        updateAuditRequest.input(
            "SampleLevel",
            sql.Int,
            sampleLevel
        );

        updateAuditRequest.input(
            "SampleSize",
            sql.Int,
            sampleSize
        );

        await updateAuditRequest.query(`
            UPDATE QA_Execute_IQC_AuditList
            SET
                ExecutionEndTime = GETDATE(),
                ExecutedBy = @ExecutedBy,
                ExecutedByRemark = @ExecutedByRemark,
                Status = @Status,
                NokSample = @NokSample,
                SampleLevel = @SampleLevel,
                SampleSize = @SampleSize
            WHERE
                AuditListID = @AuditListID
                AND AuditInstanceID = @AuditInstanceID
                AND BatchID = @BatchID
        `);

        // ==================================================
        // 11. Move Audit List to History
        // ==================================================

        const auditHistoryRequest =
            new sql.Request(transaction);

        auditHistoryRequest.input(
            "AuditListID",
            sql.Int,
            auditListID
        );

        auditHistoryRequest.input(
            "AuditInstanceID",
            sql.Int,
            auditInstanceID
        );

        auditHistoryRequest.input(
            "BatchID",
            sql.NVarChar,
            batchId
        );

        await auditHistoryRequest.query(`
            INSERT INTO QA_Execute_IQC_AuditList_History
            SELECT *
            FROM QA_Execute_IQC_AuditList
            WHERE
                AuditListID = @AuditListID
                AND AuditInstanceID = @AuditInstanceID
                AND BatchID = @BatchID
        `);


        // Delete active audit list

        const deleteAuditRequest =
            new sql.Request(transaction);

        deleteAuditRequest.input(
            "AuditListID",
            sql.Int,
            auditListID
        );

        deleteAuditRequest.input(
            "AuditInstanceID",
            sql.Int,
            auditInstanceID
        );

        deleteAuditRequest.input(
            "BatchID",
            sql.NVarChar,
            batchId
        );

        await deleteAuditRequest.query(`
            DELETE FROM QA_Execute_IQC_AuditList
            WHERE
                AuditListID = @AuditListID
                AND AuditInstanceID = @AuditInstanceID
                AND BatchID = @BatchID
        `);

        // ==================================================
        // 12. Update Material Stock
        // ==================================================

        const stockRequest =
            new sql.Request(transaction);

        stockRequest.input(
            "PartID",
            sql.NVarChar,
            partId
        );

        stockRequest.input(
            "OKQty",
            sql.Int,
            okQty
        );

        await stockRequest.query(`
            UPDATE Material_Stock
            SET
                IncomingQty =
                    ISNULL(IncomingQty, 0) - @OKQty,

                StoreQty =
                    ISNULL(StoreQty, 0) + @OKQty
            WHERE
                PartID = @PartID
        `);

        // ==================================================
        // 13. Insert Material Batch Wise Qty
        // ==================================================

        // ==================================================
        // Get EnginePartID from Config_PartVariant
        // ==================================================
        
        const variantRequest =
            new sql.Request(transaction);
        
        variantRequest.input(
            "PartID",
            sql.NVarChar,
            partId
        );
        
        const variantResult =
            await variantRequest.query(`
                SELECT EnginePartID
                FROM Config_PartVariant
                WHERE PartID = @PartID
            `);
        
        if (variantResult.recordset.length === 0) {
            throw new Error(
                `Part Variant not found for PartID ${partId}`
            );
        }
        
        const enginePartID =
            variantResult.recordset[0].EnginePartID;

        const priorityRequest =
            new sql.Request(transaction);

        priorityRequest.input(
            "PartID",
            sql.NVarChar,
            partId
        );

        const priorityResult =
            await priorityRequest.query(`
                SELECT
                    ISNULL(MAX(Priority), 0) + 1
                    AS NextPriority
                FROM Material_BatchWiseQty
                WHERE PartID = @PartID
            `);

        const priority =
            priorityResult.recordset[0].NextPriority;


        const areaRequest =
            new sql.Request(transaction);

        const areaResult =
            await areaRequest.query(`
                SELECT AreaID
                FROM Config_StorageArea
                WHERE AreaName = 'Store'
            `);

        if (areaResult.recordset.length === 0) {
            throw new Error(
                "Store Area not found"
            );
        }

        const areaID =
            areaResult.recordset[0].AreaID;


        const batchRequest =
            new sql.Request(transaction);

        batchRequest.input(
            "PartID",
            sql.NVarChar,
            partId
        );

        batchRequest.input(
            "VendorID",
            sql.Int,
            vendorId
        );

        batchRequest.input(
            "AreaID",
            sql.Int,
            areaID
        );

        batchRequest.input(
            "BatchID",
            sql.NVarChar,
            batchId
        );

        batchRequest.input(
            "Priority",
            sql.Int,
            priority
        );

        batchRequest.input(
            "Quantity",
            sql.Int,
            okQty
        );

        batchRequest.input(
            "Used",
            sql.Int,
            0
        );

        batchRequest.input(
            "Moved",
            sql.Int,
            0
        );

        batchRequest.input(
            "Rejected",
            sql.Int,
            rejectedQty
        );

        batchRequest.input(
            "Status",
            sql.Int,
            0
        );

        batchRequest.input(
            "EnginePartID",
            sql.Int,
            enginePartID
        );

        await batchRequest.query(`
            INSERT INTO Material_BatchWiseQty
            (
                PartID,
                EnginePartID,
                VendorID,
                AreaID,
                BatchID,
                Priority,
                OpenQty,
                Used,
                Moved,
                Rejected,
                Status
            )
            VALUES
            (
                @PartID,
                @EnginePartID,
                @VendorID,
                @AreaID,
                @BatchID,
                @Priority,
                @Quantity,
                @Used,
                @Moved,
                @Rejected,
                @Status
            )
        `);

                await transaction.commit();

        return {
            success: true,
            message: "IQC confirmed successfully",
            auditListID,
            auditInstanceID,
            batchId,
            partId,
            okQty,
            holdQty,
            rejectedQty,
            status: materialStatus
        };

            } catch (error) {

        try {
            await transaction.rollback();
        } catch (rollbackError) {
            console.error(
                "Transaction rollback failed:",
                rollbackError
            );
        }

        throw error;
    }
};
    
module.exports = {
    getEDIList,
    getEDIDetails,
    getPartDetails,
    storeMaterial,
    confirmIQC,
    validateQuantity,
    getMaterialStatus,
    getValidatedMaterials,
    bypassMaterial,
    sampleCollection,
    getIQCHoldList,
    iqcCleared,
    getIQCClearedList,
    getGapMaterials,
    iqcFailed,
    getHoldMaterialList,
    confirmHoldMaterial,
    confirmAuditList
}
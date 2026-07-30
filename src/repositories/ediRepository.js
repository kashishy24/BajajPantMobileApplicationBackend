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

    // if (status === 3) {

    // //Insert Into Material_Batch_Wise_Qty

    // const batchRequest = new sql.Request();

    // batchRequest.input("EDINumber", sql.NVarChar, ediNumber);
    // batchRequest.input("PartID", sql.NVarChar, partId);
    
    // const batchResult = await batchRequest.query(`
    //     SELECT
    //         VendorID,
    //         BatchID,
    //         ValidatedQty
    //     FROM Material_Receiving
    //     WHERE
    //         EDINumber = @EDINumber
    //         AND PartID = @PartID
    // `);
    
    // if (batchResult.recordset.length === 0) {
    //     throw new Error("Material Receiving record not found");
    // }
    
    // const {
    //     VendorID,
    //     BatchID,
    //     ValidatedQty
    // } = batchResult.recordset[0];

    // const insertBatchRequest = new sql.Request();

    // insertBatchRequest.input("PartID", sql.NVarChar, partId);
    // insertBatchRequest.input("VendorID", sql.Int, VendorID);

    // const areaRequest = new sql.Request();

    // const areaResult = await areaRequest.query(`
    //     SELECT AreaID
    //     FROM Config_StorageArea
    //     WHERE AreaName = 'Store'
    // `);
    
    // if (areaResult.recordset.length === 0) {
    //     throw new Error("Store Area not found");
    // }
    
    // const areaID = areaResult.recordset[0].AreaID;

    // const priorityRequest = new sql.Request();

    // priorityRequest.input("PartID", sql.NVarChar, partId);
    
    // const priorityResult = await priorityRequest.query(`
    //     SELECT ISNULL(MAX(Priority), 0) + 1 AS NextPriority
    //     FROM Material_BatchWiseQty
    //     WHERE PartID = @PartID
    // `);
    
    // const priority = priorityResult.recordset[0].NextPriority;
    
    // insertBatchRequest.input("AreaID", sql.Int, areaID);
    
    // insertBatchRequest.input("BatchID", sql.NVarChar, BatchID);
    
    // // Highest priority for new batch
    // insertBatchRequest.input("Priority", sql.Int, priority);
    
    // insertBatchRequest.input("Quantity", sql.Int, ValidatedQty);
    // insertBatchRequest.input("Consumed", sql.Int, 0);
    
    // // Completed
    // insertBatchRequest.input("Status", sql.Int, 0);
    
    // await insertBatchRequest.query(`
    //     INSERT INTO Material_BatchWiseQty
    //     (
    //         PartID,
    //         VendorID,
    //         AreaID,
    //         BatchID,
    //         Priority,
    //         Quantity,
    //         Consumed,
    //         Status
    //     )
    //     VALUES
    //     (
    //         @PartID,
    //         @VendorID,
    //         @AreaID,
    //         @BatchID,
    //         @Priority,
    //         @Quantity,
    //         @Consumed,
    //         @Status
    //     )
    // `);

    // const checkStock = await new sql.Request()
    // .input("PartID", sql.NVarChar, partId)
    // .query(`
    //     SELECT IncomingQty
    //     FROM Material_Stock
    //     WHERE PartID = @PartID
    // `);

    // if (checkStock.recordset.length === 0) {
    //     throw new Error("Material Stock record not found");
    // }
    
    // if (checkStock.recordset[0].IncomingQty < ValidatedQty) {
    //     throw new Error("Incoming quantity is less than validated quantity.");
    // }

    // const stockRequest = new sql.Request();

    // stockRequest.input("PartID", sql.NVarChar, partId);
    // stockRequest.input("Qty", sql.Int, ValidatedQty);
    
    // await stockRequest.query(`
    //     UPDATE Material_Stock
    //     SET
    //         IncomingQty = ISNULL(IncomingQty,0) - @Qty,
    //         StoreQty    = ISNULL(StoreQty,0) + @Qty
    //     WHERE
    //         PartID = @PartID
    // `);}

    // if (status === 4) {

    // //Insert Into Material_Batch_Wise_Qty

    // const batchRequest = new sql.Request();

    // batchRequest.input("EDINumber", sql.NVarChar, ediNumber);
    // batchRequest.input("PartID", sql.NVarChar, partId);
    
    // const batchResult = await batchRequest.query(`
    //     SELECT
    //         VendorID,
    //         BatchID,
    //         ValidatedQty
    //     FROM Material_Receiving
    //     WHERE
    //         EDINumber = @EDINumber
    //         AND PartID = @PartID
    // `);
    
    // if (batchResult.recordset.length === 0) {
    //     throw new Error("Material Receiving record not found");
    // }
    
    // const {
    //     VendorID,
    //     BatchID,
    //     ValidatedQty
    // } = batchResult.recordset[0];

    // const insertBatchRequest = new sql.Request();

    // insertBatchRequest.input("PartID", sql.NVarChar, partId);
    // insertBatchRequest.input("VendorID", sql.Int, VendorID);

    // const areaRequest = new sql.Request();

    // const areaResult = await areaRequest.query(`
    //     SELECT AreaID
    //     FROM Config_StorageArea
    //     WHERE AreaName = 'Store'
    // `);
    
    // if (areaResult.recordset.length === 0) {
    //     throw new Error("Store Area not found");
    // }
    
    // const areaID = areaResult.recordset[0].AreaID;

    // const priorityRequest = new sql.Request();

    // priorityRequest.input("PartID", sql.NVarChar, partId);
    
    // const priorityResult = await priorityRequest.query(`
    //     SELECT ISNULL(MAX(Priority), 0) + 1 AS NextPriority
    //     FROM Material_BatchWiseQty
    //     WHERE PartID = @PartID
    // `);
    
    // const priority = priorityResult.recordset[0].NextPriority;
    
    // insertBatchRequest.input("AreaID", sql.Int, areaID);
    
    // insertBatchRequest.input("BatchID", sql.NVarChar, BatchID);
    
    // // Highest priority for new batch
    // insertBatchRequest.input("Priority", sql.Int, priority);
    
    // insertBatchRequest.input("Quantity", sql.Int, ValidatedQty);
    // insertBatchRequest.input("Consumed", sql.Int, 0);
    
    // // Completed
    // insertBatchRequest.input("Status", sql.Int, 0);
    
    // await insertBatchRequest.query(`
    //     INSERT INTO Material_BatchWiseQty
    //     (
    //         PartID,
    //         VendorID,
    //         AreaID,
    //         BatchID,
    //         Priority,
    //         Quantity,
    //         Consumed,
    //         Status
    //     )
    //     VALUES
    //     (
    //         @PartID,
    //         @VendorID,
    //         @AreaID,
    //         @BatchID,
    //         @Priority,
    //         @Quantity,
    //         @Consumed,
    //         @Status
    //     )
    // `);

    // const checkStock = await new sql.Request()
    // .input("PartID", sql.NVarChar, partId)
    // .query(`
    //     SELECT IncomingQty
    //     FROM Material_Stock
    //     WHERE PartID = @PartID
    // `);

    // if (checkStock.recordset.length === 0) {
    //     throw new Error("Material Stock record not found");
    // }
    
    // if (checkStock.recordset[0].IncomingQty < ValidatedQty) {
    //     throw new Error("Incoming quantity is less than validated quantity.");
    // }

    // const stockRequest = new sql.Request();

    // stockRequest.input("PartID", sql.NVarChar, partId);
    // stockRequest.input("Qty", sql.Int, ValidatedQty);
    
    // await stockRequest.query(`
    //     UPDATE Material_Stock
    //     SET
    //         IncomingQty = ISNULL(IncomingQty,0) - @Qty,
    //         StoreQty    = ISNULL(StoreQty,0) + @Qty
    //     WHERE
    //         PartID = @PartID
    // `);}

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
    };
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
            Status = 5,
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
            INNER JOIN Config_Part CP
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
const { sql } = require("../config/db");

const getMaterialStoreList = async () => {

    const result = await new sql.Request().query(`
        SELECT
            MBQ.PartID,
            CP.PartName,
            MBQ.BatchID,
            (MBQ.Quantity - MBQ.Consumed) AS ValidatedQty,
            MBQ.Priority
        FROM Material_BatchWiseQty MBQ
        INNER JOIN Config_Part CP
            ON MBQ.PartID = CP.PartID
        WHERE
            MBQ.Status = 0
            AND (MBQ.Quantity - MBQ.Consumed) > 0
        ORDER BY
            MBQ.Priority,
            CP.PartName,
            MBQ.BatchID
    `);

    return result.recordset;
};

const getDeliveryPlans = async () => {

    // Get current production information
    const shiftResult = await new sql.Request().query(`
        SELECT
            MAX(CASE WHEN ParameterName = 'LineID' THEN ParameterValue END) AS LineID,
            MAX(CASE WHEN ParameterName = 'ProdDate' THEN ParameterValue END) AS ProdDate,
            MAX(CASE WHEN ParameterName = 'ProdShift' THEN ParameterValue END) AS ProdShift
        FROM Prod_ShiftInformation
    `);

    const {
        LineID,
        ProdDate,
        ProdShift
    } = shiftResult.recordset[0];

    const request = new sql.Request();

    request.input("LineID", sql.Int, LineID);
    request.input("ProdDate", sql.Date, ProdDate);
    request.input("ProdShift", sql.NVarChar, ProdShift);

    const result = await request.query(`
        SELECT
            PP.PlanID,
            PP.SKUID,
            CS.SKUName,
            PP.Priority,
            PP.PlanQty,
            PP.Status
        FROM Prod_Plan PP
        INNER JOIN Config_SKU CS
            ON PP.SKUID = CS.SKUID
        WHERE
            PP.LineID = @LineID
            AND PP.ProdDate = @ProdDate
            AND PP.ProdShift = @ProdShift
        ORDER BY
            PP.Priority,
            PP.PlanID
    `);

    return result.recordset;
};

const getKittingDetails = async (
    planId,
    skuId
) => {

    const request = new sql.Request();

    request.input("PlanID", sql.Int, planId);
    request.input("SKUID", sql.Int, skuId);

    const result = await request.query(`
            SELECT
        CP.PartID,
        CP.PartName,
        KB.PartQuantity * PP.PlanQty AS PlannedQty,
        CASE
            WHEN PP.LineID = 1 THEN ISNULL(MS.LinesideCQty,0)
            WHEN PP.LineID = 2 THEN ISNULL(MS.LinesideDQty,0)
        END AS LineSideQty,
        MB.BatchID,
        MB.Priority,
        (MB.Quantity - MB.Consumed) AS AvailableQty
    FROM Prod_Plan PP
    
    INNER JOIN Config_KITBOM KB
        ON PP.SKUID = KB.SKUID
    
    INNER JOIN Config_Part CP
        ON KB.PartID = CP.PartID
    
    INNER JOIN Material_BatchWiseQty MB
        ON MB.PartID = KB.PartID
    
    LEFT JOIN Material_Stock MS
        ON MS.PartID = KB.PartID
    
    WHERE
        PP.PlanID = @PlanID
        AND PP.SKUID = @SKUID
        AND MB.Status = 0
        AND (MB.Quantity - MB.Consumed) > 0
    
    ORDER BY
        CP.PartName,
        MB.Priority;
    `);

    return result.recordset;

};

const getSubAssemblyLines = async () => {

    const result = await new sql.Request().query(`
        SELECT
            SubAsslyLineID,
            SubAsslyLineName
        FROM Config_SubAssemblyLine
        ORDER BY SubAsslyLineName
    `);

    return result.recordset;

};

const getSubAssemblyDetails = async (
    planId,
    skuId,
    subAssemblyId
) => {

    const request = new sql.Request();

    request.input("PlanID", sql.Int, planId);
    request.input("SKUID", sql.Int, skuId);
    request.input("SubAssemblyID", sql.Int, subAssemblyId);

    const result = await request.query(`
    SELECT
        CP.PartID,
        CP.PartName,
        ST.StationName,
        BOM.PartQuantity * PP.PlanQty AS PlannedQty,
        CASE
            WHEN PP.LineID = 1 THEN ISNULL(MS.LinesideCQty,0)
            WHEN PP.LineID = 2 THEN ISNULL(MS.LinesideDQty,0)
        END AS LineSideQty,
        MB.BatchID,
        MB.Priority,
        (MB.Quantity - MB.Consumed) AS AvailableQty
    FROM Prod_Plan PP
    
    INNER JOIN Config_BOM BOM
        ON PP.SKUID = BOM.SKUID
    
    INNER JOIN Config_Station ST
        ON BOM.StationID = ST.StationID
    
    INNER JOIN Config_Part CP
        ON BOM.PartID = CP.PartID
    
    INNER JOIN Material_BatchWiseQty MB
        ON BOM.PartID = MB.PartID
    
    LEFT JOIN Material_Stock MS
        ON BOM.PartID = MS.PartID
    
    WHERE
        PP.PlanID = @PlanID
        AND PP.SKUID = @SKUID
        AND ST.SubAsslyLineID = @SubAssemblyID
        AND MB.Status = 0
        AND (MB.Quantity - MB.Consumed) > 0
    
    ORDER BY
        ST.StageNo,
        CP.PartName,
        MB.Priority;
    `);

    return result.recordset;

};

const getLineSideMaterial = async () => {

    const request = new sql.Request();

    const result = await request.query(`
        SELECT
            CP.PartID,
            CP.PartName,
            CASE
                WHEN PSI.LineID = '1' THEN ISNULL(MS.LinesideCQty,0)
                WHEN PSI.LineID = '2' THEN ISNULL(MS.LinesideDQty,0)
            END AS Qty
        FROM Material_Stock MS
        
        INNER JOIN Config_Part CP
            ON MS.PartID = CP.PartID
        
        CROSS JOIN
        (
            SELECT
                MAX(CASE WHEN ParameterName = 'LineID'
                         THEN ParameterValue END) AS LineID
            FROM Prod_ShiftInformation
        ) PSI
        
        WHERE
        (
            CASE
                WHEN PSI.LineID = '1' THEN ISNULL(MS.LinesideCQty,0)
                WHEN PSI.LineID = '2' THEN ISNULL(MS.LinesideDQty,0)
            END
        ) > 0
        
        ORDER BY CP.PartName
    `);

    return result.recordset;

};

const moveMaterialToStore = async (
    partId,
    qty
) => {

    // Step 1 : Get Current Line
    const shiftResult = await new sql.Request().query(`
        SELECT
            MAX(CASE WHEN ParameterName = 'LineID'
                THEN ParameterValue END) AS LineID
        FROM Prod_ShiftInformation
    `);

    const lineId = parseInt(
        shiftResult.recordset[0].LineID
    );

    if (!lineId) {
        throw new Error("Current Line not found.");
    }

    // Step 2 : Get Stock
    const stockRequest = new sql.Request();

    stockRequest.input(
        "PartID",
        sql.NVarChar,
        partId
    );

    const stockResult = await stockRequest.query(`
        SELECT
            StoreQty,
            LinesideCQty,
            LinesideDQty
        FROM Material_Stock
        WHERE PartID = @PartID
    `);

    if (stockResult.recordset.length === 0) {
        throw new Error("Material not found.");
    }

    const stock = stockResult.recordset[0];

    if (
        lineId === 1 &&
        stock.LinesideCQty < qty
    ) {
        throw new Error(
            "Insufficient Line Side Quantity."
        );
    }

    if (
        lineId === 2 &&
        stock.LinesideDQty < qty
    ) {
        throw new Error(
            "Insufficient Line Side Quantity."
        );
    }

    // Step 3 : Update Stock

    const updateRequest = new sql.Request();

    updateRequest.input(
        "PartID",
        sql.NVarChar,
        partId
    );

    updateRequest.input(
        "Qty",
        sql.Int,
        qty
    );

    updateRequest.input(
        "LineID",
        sql.Int,
        lineId
    );

    await updateRequest.query(`
        UPDATE Material_Stock
        SET

            StoreQty = ISNULL(StoreQty,0) + @Qty,

            LinesideCQty =
                CASE
                    WHEN @LineID = 1
                    THEN ISNULL(LinesideCQty,0) - @Qty
                    ELSE LinesideCQty
                END,

            LinesideDQty =
                CASE
                    WHEN @LineID = 2
                    THEN ISNULL(LinesideDQty,0) - @Qty
                    ELSE LinesideDQty
                END

        WHERE
            PartID = @PartID
    `);

    return {
        partId,
        qty,
        lineId
    };

};

const getMaterialRejectedList = async () => {

    const result = await new sql.Request().query(`
        SELECT
            MR.partID AS PartID,
            CP.PartName,
            CV.VendorName,
            MR.ProdDate,
            MR.ProdShift,
            MR.BatchID,
            MR.Quantity,
            MR.Timestamp,
            MR.RejectionSource,
            MR.Status
        FROM Material_Rejected MR

        INNER JOIN Config_PartVariant CP
            ON MR.partID = CP.PartID

        INNER JOIN Config_Vendor CV
            ON MR.VendorID = CV.VendorID

        ORDER BY
            MR.Timestamp DESC
    `);

    return result.recordset;
};

const getRunningProductionPlans = async () => {

    const result = await new sql.Request().query(`
        SELECT
            MRP.PlanID,
            MRP.PartID,
            CP.PartName,
            MRP.TotalRequiredQty,
            MRP.DeliveredQty,
            MRP.ConsumedQty
        FROM Material_Running_Plan MRP

        INNER JOIN Config_PartVariant CP
            ON MRP.PartID = CP.PartID

        WHERE
            MRP.MesControlled = 1

        ORDER BY
            MRP.PlanID,
            CP.PartName
    `);

    return result.recordset;
};

const getMaterialRequestList = async () => {

    const result = await new sql.Request().query(`
        SELECT
            MRP.PlanID,
            MRP.PartID,
            CP.PartName,
            MRP.TotalRequiredQty as RequiredQty
        FROM Material_Running_Plan MRP

        INNER JOIN Config_PartVariant CP
            ON MRP.PartID = CP.PartID

        WHERE
            MRP.Status = 1
            AND MRP.MesControlled = 2

        ORDER BY
            MRP.PlanID,
            CP.PartName
    `);

    return result.recordset;
};

const getMaterialAlertList = async () => {
    const result = await new sql.Request().query(`
        SELECT
            MRP.PlanID,
            MRP.PartID,
            CP.PartName,
            MRP.ToBeIssuedQty as RequiredQty
        FROM Material_Running_Plan MRP
        INNER JOIN Config_PartVariant CP
            ON MRP.PartID = CP.PartID
        WHERE
            MRP.Status = 1
            AND MRP.MesControlled = 1
            AND MRP.ToBeIssuedQty > 0
        ORDER BY
            MRP.PlanID,
            CP.PartName
    `);

    return result.recordset;
};

const issueMaterial = async (planId, partId, requiredQty) => {
    const request = new sql.Request();

    request.input("PlanID", sql.Int, planId);
    request.input("PartID", sql.NVarChar(20), partId);
    request.input("RequiredQty", sql.Int, requiredQty);

    const result = await request.query(`
        UPDATE Material_Running_Plan
        SET Status = 2
        WHERE
            PlanID = @PlanID
            AND PartID = @PartID
            AND RequiredQty = @RequiredQty
            AND Status = 1
    `);

    if (result.rowsAffected[0] === 0) {
        throw new Error(
            "Material request not found or material is already issued."
        );
    }

    return {
        PlanID: planId,
        PartID: partId,
        RequiredQty: requiredQty,
        Status: 2
    };
};

// const getMaterialDeliverList = async () => {
//     const result = await new sql.Request().query(`
//         SELECT
//             MRP.PlanID,
//             MRP.PartID,
//             CP.PartName,
//             MRP.MesControlled,
//             CASE
//                 WHEN MRP.MesControlled = 1
//                     THEN MRP.ToBeIssuedQty
//                 WHEN MRP.MesControlled = 2
//                     THEN MRP.TotalRequiredQty
//             END AS DeliverQty
//         FROM Material_Running_Plan MRP
//         INNER JOIN Config_PartVariant CP
//             ON MRP.PartID = CP.PartID
//         WHERE
//             MRP.Status = 2
//         ORDER BY
//             MRP.PlanID,
//             CP.PartName
//     `);

//     return result.recordset;
// };

const getMaterialDeliverList = async () => {
    const result = await new sql.Request().query(`
        SELECT
            MRP.PlanID,
            MRP.PartID,
            CP.PartName,
            MRP.MesControlled,

            CASE
                WHEN MRP.MesControlled = 1
                    THEN MRP.ToBeIssuedQty
                WHEN MRP.MesControlled = 2
                    THEN MRP.TotalRequiredQty
            END AS DeliverQty,

            CB.MaterialMoveType

        FROM Material_Running_Plan MRP

        INNER JOIN Prod_Plan PP
            ON MRP.PlanID = PP.PlanID

        INNER JOIN Config_BOM CB
            ON PP.SKUID = CB.SKUID
            AND MRP.PartID = CB.PartID

        INNER JOIN Config_PartVariant CP
            ON MRP.PartID = CP.PartID

        WHERE
            MRP.Status = 2

        ORDER BY
            MRP.PlanID,
            CP.PartName
    `);

    return result.recordset;
};

const deliverMaterial = async (
    planId,
    partId,
    deliveredQty,
    materialMoveType
) => {

    const transaction = new sql.Transaction();

    try {

        if (deliveredQty <= 0) {
            throw new Error("Delivered quantity must be greater than 0.");
        }

        await transaction.begin();

        // ----------------------------------------------------
        // Step 1: Get Running Plan
        // ----------------------------------------------------

        const planRequest = new sql.Request(transaction);

        planRequest.input("PlanID", sql.Int, planId);
        planRequest.input("PartID", sql.NVarChar(20), partId);

        const planResult = await planRequest.query(`
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
            WHERE
                PlanID = @PlanID
                AND PartID = @PartID
                AND Status = 2
        `);

        if (planResult.recordset.length === 0) {
            throw new Error(
                "Material issue record not found or material is not in Issue status."
            );
        }

        const plan = planResult.recordset[0];

        // ----------------------------------------------------
        // Step 2: Validate Delivered Quantity
        // ----------------------------------------------------

        let maxDeliverQty;

        if (plan.MesControlled === 1) {
            maxDeliverQty = plan.ToBeIssuedQty;
        } else {
            maxDeliverQty = plan.TotalRequiredQty - plan.DeliveredQty;
        }

        if (deliveredQty > maxDeliverQty) {
            throw new Error(
                `Delivered quantity cannot be greater than pending quantity (${maxDeliverQty}).`
            );
        }

        // ----------------------------------------------------
        // Step 3: Get Batch-wise Material
        // ----------------------------------------------------

        const batchRequest = new sql.Request(transaction);

        batchRequest.input("PartID", sql.NVarChar(20), partId);

        const batchResult = await batchRequest.query(`
            SELECT
                UID,
                PartID,
                BatchID,
                Priority,
                OpenQty,
                Used,
                Moved,
                Rejected,
                Status
            FROM Material_BatchWiseQty
            WHERE
                PartID = @PartID
                AND OpenQty > 0
                AND Status = 0
            ORDER BY
                Priority,
                UID
        `);

        const batches = batchResult.recordset;

        if (batches.length === 0) {
            throw new Error(
                "No available batch quantity found for this material."
            );
        }

        // ----------------------------------------------------
        // Step 4: Check Total Available Quantity
        // ----------------------------------------------------

        const totalAvailableQty = batches.reduce(
            (total, batch) => total + batch.OpenQty,
            0
        );

        if (totalAvailableQty < deliveredQty) {
            throw new Error(
                `Insufficient material quantity. Available quantity: ${totalAvailableQty}.`
            );
        }

        // ----------------------------------------------------
        // Step 5: Update Batch-wise Quantity
        // ----------------------------------------------------

        let remainingQty = deliveredQty;

        for (const batch of batches) {

            if (remainingQty <= 0) {
                break;
            }

            const moveQty = Math.min(
                remainingQty,
                batch.OpenQty
            );

            const batchUpdateRequest = new sql.Request(transaction);

            batchUpdateRequest.input(
                "UID",
                sql.Int,
                batch.UID
            );

            batchUpdateRequest.input(
                "MoveQty",
                sql.Int,
                moveQty
            );

            await batchUpdateRequest.query(`
                UPDATE Material_BatchWiseQty
                SET
                    OpenQty = OpenQty - @MoveQty,
                    Moved = ISNULL(Moved, 0) + @MoveQty,

                    Status =
                        CASE
                            WHEN OpenQty - @MoveQty = 0
                            THEN 1
                            ELSE Status
                        END
                WHERE
                    UID = @UID
            `);

            remainingQty -= moveQty;
        }

        // ----------------------------------------------------
        // Step 6: Update Material Stock
        // ----------------------------------------------------

        const stockRequest = new sql.Request(transaction);

        stockRequest.input(
            "PartID",
            sql.NVarChar(20),
            partId
        );

        stockRequest.input(
            "DeliveredQty",
            sql.Int,
            deliveredQty
        );

        stockRequest.input(
            "MaterialMoveType",
            sql.Int,
            materialMoveType
        );

        // MaterialMoveType 7 = Store To KittingRack
        if (materialMoveType === 7) {

            const stockResult = await stockRequest.query(`
                UPDATE Material_Stock
                SET
                    StoreQty = ISNULL(StoreQty, 0) - @DeliveredQty,
                    LineCKitRackQty =
                        ISNULL(LineCKitRackQty, 0) + @DeliveredQty
                WHERE
                    PartID = @PartID
                    AND ISNULL(StoreQty, 0) >= @DeliveredQty
            `);

            if (stockResult.rowsAffected[0] === 0) {
                throw new Error(
                    "Insufficient Store Quantity."
                );
            }

        } else {

            const stockResult = await stockRequest.query(`
                UPDATE Material_Stock
                SET
                    StoreQty = ISNULL(StoreQty, 0) - @DeliveredQty,
                    LineCQty =
                        ISNULL(LineCQty, 0) + @DeliveredQty
                WHERE
                    PartID = @PartID
                    AND ISNULL(StoreQty, 0) >= @DeliveredQty
            `);

            if (stockResult.rowsAffected[0] === 0) {
                throw new Error(
                    "Insufficient Store Quantity."
                );
            }
        }

        // ----------------------------------------------------
        // Step 7: Update Material Running Plan
        // ----------------------------------------------------

        let deliveredIncrement = deliveredQty;

        let newRequiredQty = plan.RequiredQty;
        let newToBeIssuedQty = plan.ToBeIssuedQty;
        let newDeliveredQty =
            plan.DeliveredQty + deliveredIncrement;

        if (plan.MesControlled === 1) {

            newToBeIssuedQty =
                Math.max(
                    0,
                    plan.ToBeIssuedQty - deliveredQty
                );

            newRequiredQty =
                Math.max(
                    0,
                    plan.RequiredQty - deliveredQty
                );

        }

        // Status 3 = Delivered
        const runningPlanRequest = new sql.Request(transaction);

        runningPlanRequest.input(
            "UID",
            sql.Int,
            plan.UID
        );

        runningPlanRequest.input(
            "RequiredQty",
            sql.Int,
            newRequiredQty
        );

        runningPlanRequest.input(
            "ToBeIssuedQty",
            sql.Int,
            newToBeIssuedQty
        );

        runningPlanRequest.input(
            "DeliveredQty",
            sql.Int,
            newDeliveredQty
        );

        await runningPlanRequest.query(`
            UPDATE Material_Running_Plan
            SET
                Status = 3,
                RequiredQty = @RequiredQty,
                ToBeIssuedQty = @ToBeIssuedQty,
                DeliveredQty = @DeliveredQty
            WHERE
                UID = @UID
        `);

        // ----------------------------------------------------
        // Step 8: Insert into History
        // ----------------------------------------------------

        /*
            Move to history only when complete delivery is done.
        */

        const isCompleted =
            newDeliveredQty >= plan.TotalRequiredQty;

        if (isCompleted) {

            const historyRequest =
                new sql.Request(transaction);

            historyRequest.input(
                "PlanID",
                sql.Int,
                plan.PlanID
            );

            historyRequest.input(
                "PartID",
                sql.NVarChar(20),
                plan.PartID
            );

            historyRequest.input(
                "TotalRequiredQty",
                sql.Int,
                plan.TotalRequiredQty
            );

            historyRequest.input(
                "RequiredQty",
                sql.Int,
                newRequiredQty
            );

            historyRequest.input(
                "ToBeIssuedQty",
                sql.Int,
                newToBeIssuedQty
            );

            historyRequest.input(
                "DeliveredQty",
                sql.Int,
                newDeliveredQty
            );

            historyRequest.input(
                "ConsumedQty",
                sql.Int,
                plan.ConsumedQty
            );

            historyRequest.input(
                "MesControlled",
                sql.Int,
                plan.MesControlled
            );

            historyRequest.input(
                "Status",
                sql.Int,
                3
            );

            await historyRequest.query(`
                INSERT INTO Material_Running_Plan_History
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
                    @TotalRequiredQty,
                    @RequiredQty,
                    @ToBeIssuedQty,
                    @DeliveredQty,
                    @ConsumedQty,
                    @MesControlled,
                    @Status
                )
            `);

            // ------------------------------------------------
            // Delete completed running plan
            // ------------------------------------------------

            const deleteRequest =
                new sql.Request(transaction);

            deleteRequest.input(
                "UID",
                sql.Int,
                plan.UID
            );

            await deleteRequest.query(`
                DELETE FROM Material_Running_Plan
                WHERE UID = @UID
            `);
        }

        await transaction.commit();

        return {
            PlanID: plan.PlanID,
            PartID: plan.PartID,
            DeliveredQty: deliveredQty,
            MaterialMoveType: materialMoveType,
            MesControlled: plan.MesControlled,
            Status: isCompleted ? 3 : 3,
            // HistoryMoved: isCompleted
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
    getMaterialStoreList,
    getDeliveryPlans,
    getKittingDetails,
    getSubAssemblyLines,
    getSubAssemblyDetails,
    getLineSideMaterial,
    moveMaterialToStore,
    getMaterialRejectedList,
    getRunningProductionPlans,
    getMaterialRequestList,
    getMaterialAlertList,
    issueMaterial,
    getMaterialDeliverList,
    deliverMaterial
};

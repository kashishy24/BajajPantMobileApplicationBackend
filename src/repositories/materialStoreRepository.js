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

module.exports = {
    getMaterialStoreList,
    getDeliveryPlans,
    getKittingDetails,
    getSubAssemblyLines,
    getSubAssemblyDetails,
    getLineSideMaterial,
    moveMaterialToStore,
    getMaterialRejectedList,
    getRunningProductionPlans
};

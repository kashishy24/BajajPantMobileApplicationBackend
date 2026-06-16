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

    const request = new sql.Request();

    request.input("EDINumber", sql.NVarChar, ediNumber);
    request.input("PartID", sql.NVarChar, partId);

    const existing = await request.query(`
        SELECT Quantity
        FROM Material_Receiving
        WHERE
            EDINumber = @EDINumber
            AND PartID = @PartID
    `);

    if (existing.recordset.length === 0) {
        throw new Error("Record not found");
    }

    const actualQty =
        existing.recordset[0].Quantity;

    const gap =
        actualQty - receivedQty;

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
        userId
    );

    updateRequest.input(
        "Remark",
        sql.NVarChar,
        remark
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

    await updateRequest.query(`
        UPDATE Material_Receiving
        SET
            ValidatedQuantity = @ReceivedQty,
            QuantityValidatedBy = @ValidatedBy,
            Remark = @Remark,
            Status = 2
        WHERE
            EDINumber = @EDINumber
            AND PartID = @PartID
    `);

    return {
        expectedQty: actualQty,
        receivedQty,
        gap
    };
};

module.exports = {
    getEDIList,
    getEDIDetails,
    getPartDetails,
    validateQuantity
}
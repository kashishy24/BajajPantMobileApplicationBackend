const { sql } =
    require("../config/db");

const getScheduledDocuments =
    async () => {

        const result =
            await new sql.Request().query(`
                SELECT
                    DocumentID,
                    DocumentNo,
                    DocumentName,
                    AuditInstanceID
                FROM QA_Execute_DocumentList
                WHERE AuditGroup = 'IPQC'
                ORDER BY DocumentName
            `);

        return result.recordset;

    };

const getAuditList = async (documentId) => {

    const request = new sql.Request();

    request.input(
        "DocumentID",
        sql.Int,
        documentId
    );

    const result =
        await request.query(`
            SELECT
                AL.AuditListID,
                AL.AuditListName,

                MF.ModelFamilyName,
                M.ModelName,
                S.SKUName,

                SCH.AuditInstanceID,

                CONCAT(
                    SCH.FrequencyValue,
                    ' ',
                    CASE SCH.FrequencyType
                        WHEN 1 THEN 'Day'
                        WHEN 2 THEN 'Count'
                        WHEN 3 THEN 'Hourly'
                    END
                ) AS Frequency,

                SCH.Status,

                SCH.StartDateTime AS ScheduledDate

            FROM Config_AuditList AL

            LEFT JOIN Config_ModelFamily MF
                ON AL.ModelFamilyID = MF.ModelFamilyID

            LEFT JOIN Config_Model M
                ON AL.ModelID = M.ModelID

            LEFT JOIN Config_SKU S
                ON AL.SKUID = S.SKUID

            LEFT JOIN Config_AuditSchedule SCH
                ON AL.DocumentID = SCH.DocumentID

            WHERE AL.DocumentID = @DocumentID
        `);

    return result.recordset;
};

module.exports = {
    getScheduledDocuments,
    getAuditList 
};
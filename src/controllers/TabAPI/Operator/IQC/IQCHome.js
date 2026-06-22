const { sql } = require("../../../../config/db");
const {
  successResponse,
  errorResponse,
} = require("../../../../middlewares/responseHandler");


//IQC Home Screen
const getAuditListByGroup = async (req, res) => {
  try {
    const { group } = req.query;

    if (!group) {
      return errorResponse(res, "Group is required", 400);
    }

    const request = new sql.Request();

    const result = await request
      .input("Group", sql.VarChar, group)
      .query(`
        SELECT
          DocumentID,
          DocumentName
        FROM Config_QADocumentList
        WHERE [Group] = @Group
        ORDER BY DocumentName
      `);

    return successResponse(
      res,
      result.recordset,
      "Audit List fetched successfully"
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getAuditListByGroup,
};
const { sql } = require("../../../../config/db");
const {
  successResponse,
  errorResponse,
} = require("../../../../middlewares/responseHandler");

//Operator Login

//Monitoring Screen open direct after group selection
//get auditList acc to doc

const getScheduleAuditList = async (req, res) => {
  try {
    const { group } = req.query;

    if (!group) {
      return errorResponse(res, "Group is required", 400);
    }

    const request = new sql.Request();

    const result = await request
      .input("Group", sql.NVarChar(100), group)
      .execute("Tab_Q_IPQC_GetScheduledAuditList");

    return successResponse(
      res,
      result.recordset,
      "Audit schedule fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching audit schedule:", error);

    return errorResponse(res, error.message, 500);
  }
};

//Inspect btn api to insert data from config table to execution tables and change status in schedule and monitoring table
const executeIPQCAudit = async (req, res) => {
  try {
    const {
      DocumentID,
      AuditListID,
      ExecutedBy
    } = req.body;

    // Validation
    if (!DocumentID || !AuditListID || !ExecutedBy) {
      return errorResponse(
        res,
        "DocumentID, AuditListID and ExecutedBy are required",
        400
      );
    }

    const request = new sql.Request();

    const result = await request
      .input(
        "DocumentID",
        sql.Int,
        parseInt(DocumentID)
      )
      .input(
        "AuditListID",
        sql.Int,
        parseInt(AuditListID)
      )
      .input(
        "ExecutedBy",
        sql.NVarChar(100),
        ExecutedBy
      )
      .execute("Tab_Q_IPQC_MonitoringScreenInspectBtn");

    return successResponse(
      res,
      result.recordset,
      "FQC audit executed successfully"
    );

  } catch (error) {
    console.error("Error executing FQC audit:", error);

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};

// Checkpoint Execution Screen 

const getIPQCAuditPointsForExecute = async (req, res) => {
  try {
    const {
      AuditListID,
      AuditInstanceID
    } = req.query;

    // Validation
    if (AuditListID === undefined || AuditInstanceID === undefined) {
      return errorResponse(
        res,
        "AuditListID and AuditInstanceID are required",
        400
      );
    }

    const request = new sql.Request();

    const result = await request
      .input(
        "AuditListID",
        sql.Int,
        parseInt(AuditListID)
      )
      .input(
        "AuditInstanceID",
        sql.Int,
        parseInt(AuditInstanceID)
      )
      .execute("Tab_Q_IPQC_AuditPoints_ForExecute");

    return successResponse(
      res,
      result.recordset,
      "IPQC executed audit points fetched successfully"
    );

  } catch (error) {
    console.error(
      "Error fetching IPQC executed audit points:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};
module.exports = {
  getScheduleAuditList,
  executeIPQCAudit,
  getIPQCAuditPointsForExecute
};    
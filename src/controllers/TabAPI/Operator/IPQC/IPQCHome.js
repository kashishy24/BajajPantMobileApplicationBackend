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

// Checkpoint Execution Screen get checkpoint for execution

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

//update result 

const updateIPQCCheckpointResult = async (req, res) => {
  try {
    const {
      UID,
      Result,
      Remark,
      ObservationValue
    } = req.body;

    // Validation
    if (UID === undefined || UID === null) {
      return errorResponse(
        res,
        "UID is required",
        400
      );
    }

    if (Result === undefined || Result === null) {
      return errorResponse(
        res,
        "Result is required",
        400
      );
    }

    const request = new sql.Request();

    const result = await request
      .input(
        "UID",
        sql.Int,
        parseInt(UID)
      )
      .input(
        "Result",
        sql.Int,
        parseInt(Result)
      )
      .input(
        "Remark",
        sql.NVarChar(500),
        Remark ?? null
      )
      .input(
        "ObservationValue",
        sql.NVarChar(500),
        ObservationValue ?? null
      )
      .execute("Tab_Q_IPQC_UpdateCheckpointResult");

    return successResponse(
      res,
      result.recordset,
      "IPQC checkpoint result updated successfully"
    );

  } catch (error) {
    console.error(
      "Error updating IPQC checkpoint result:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};

//submit btn api
const submitIPQCAuditPoint = async (req, res) => {
  try {
    const {
      AuditListID,
      AuditInstanceID,
      ExecutedByRemark
    } = req.body;

    // Validation
    if (AuditListID === undefined || AuditListID === null) {
      return errorResponse(
        res,
        "AuditListID is required",
        400
      );
    }

    if (AuditInstanceID === undefined || AuditInstanceID === null) {
      return errorResponse(
        res,
        "AuditInstanceID is required",
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
        sql.BigInt,
        parseInt(AuditInstanceID)
      )
      .input(
        "ExecutedByRemark",
        sql.NVarChar(sql.MAX),
        ExecutedByRemark ?? null
      )
      .execute("Tab_Q_IPQC_AuditPoint_Submit");

    return successResponse(
      res,
      result.recordset,
      "IPQC Audit submitted successfully"
    );

  } catch (error) {
    console.error(
      "Error submitting IPQC audit:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};

//Waiting for Approval AuditList

const getWaitingForApprovalIPQCAuditList = async (req, res) => {
  try {

    const request = new sql.Request();

    const result = await request
      .execute(
        "Tab_Q_IPQC_GetWaitingForApprovalIPQCAuditList"
      );

    return successResponse(
      res,
      result.recordset,
      "IPQC waiting for approval audit list fetched successfully"
    );

  } catch (error) {
    console.error(
      "Error fetching IPQC waiting for approval audit list:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};

//Waiting for Approval AuditPoint

const getExecutedIPQCCheckpointDetails = async (req, res) => {
  try {
    const {
      AuditListID,
      AuditInstanceID
    } = req.query;

    // Validation
    if (AuditListID === undefined || AuditListID === null) {
      return errorResponse(
        res,
        "AuditListID is required",
        400
      );
    }

    if (AuditInstanceID === undefined || AuditInstanceID === null) {
      return errorResponse(
        res,
        "AuditInstanceID is required",
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
        sql.BigInt,
        parseInt(AuditInstanceID)
      )
      .execute(
        "Tab_Q_IPQC_GetExecuted_CheckpointDetails"
      );

    return successResponse(
      res,
      result.recordset,
      "IPQC executed checkpoint details fetched successfully"
    );

  } catch (error) {
    console.error(
      "Error fetching IPQC executed checkpoint details:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};


//supervisor Login
//Approved btn api

const approveIPQCAudit = async (req, res) => {
  try {
    const {
      AuditListID,
      AuditInstanceID,
      ApprovedBy,
      ApprovedByRemark
    } = req.body;

    // Validation
    if (AuditListID === undefined || AuditListID === null) {
      return errorResponse(
        res,
        "AuditListID is required",
        400
      );
    }

    if (AuditInstanceID === undefined || AuditInstanceID === null) {
      return errorResponse(
        res,
        "AuditInstanceID is required",
        400
      );
    }

    if (ApprovedBy === undefined || ApprovedBy === null) {
      return errorResponse(
        res,
        "ApprovedBy is required",
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
        sql.BigInt,
        parseInt(AuditInstanceID)
      )
      .input(
        "ApprovedBy",
        sql.NVarChar(100),
        ApprovedBy
      )
      .input(
        "ApprovedByRemark",
        sql.NVarChar(500),
        ApprovedByRemark ?? null
      )
      .execute(
        "Tab_Q_ApproveIPQCAudit"
      );

    return successResponse(
      res,
      result.recordset,
      "IPQC Audit approved successfully"
    );

  } catch (error) {
    console.error(
      "Error approving IPQC Audit:",
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
  getIPQCAuditPointsForExecute,
  updateIPQCCheckpointResult,
  submitIPQCAuditPoint,
  getWaitingForApprovalIPQCAuditList,
  getExecutedIPQCCheckpointDetails,
  approveIPQCAudit
};    
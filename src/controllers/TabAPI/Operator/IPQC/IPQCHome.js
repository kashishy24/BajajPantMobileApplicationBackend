const { sql } = require("../../../../config/db");
const {
  successResponse,
  errorResponse,
} = require("../../../../middlewares/responseHandler");

//Operator Login
// for show doc by using group
const getDocListByGroup = async (req, res) => {
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
//Monitoring Screen
//get auditList acc to doc

const getScheduleAuditList = async (req, res) => {
  try {
    const { documentId } = req.query;

    if (!documentId) {
      return errorResponse(res, "DocumentID is required", 400);
    }

    const request = new sql.Request();

    const result = await request
      .input("DocumentID", sql.Int, documentId)
      .execute("Tab_Q_IPQCGetScheduledAuditList");

    return successResponse(
      res,
      result.recordset,
      "Audit schedule fetched successfully"
    );
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(res, error.message, 500);
  }
};

// functionality on execute button from config table insert data in execution tables 
const executeIPQCAudit = async (req, res) => {
  try {
    const { DocumentID, AuditListID, ExecutedBy } = req.body;

    if (!DocumentID || !AuditListID || !ExecutedBy) {
      return errorResponse(
        res,
        "DocumentID, AuditListID and ExecutedBy are required",
        400
      );
    }

    const request = new sql.Request();

    const result = await request
      .input("DocumentID", sql.Int, DocumentID)
      .input("AuditListID", sql.Int, AuditListID)
      .input("ExecutedBy", sql.NVarChar(100), ExecutedBy)
      .execute("Tab_Q_IPQCMonitor_ExecuteBtn1");

    const response = result.recordset[0];

    if (response.Success === 1) {
      return successResponse(
        res,
        response,
        response.Message
      );
    }

    return errorResponse(
      res,
      response.Message,
      400
    );
  } catch (error) {
    console.error("Execute IPQC Audit Error:", error);
    return errorResponse(res, error.message, 500);
  }
};


//Checkpoint Screen

//get checkpoint details for mark
const getIPQCExecutionDetails = async (req, res) => {
  try {
    const { DocumentID, AuditListID, AuditInstanceID } = req.query;

    if (!DocumentID || !AuditListID || !AuditInstanceID) {
      return errorResponse(
        res,
        "DocumentID, AuditListID and AuditInstanceID are required",
        400
      );
    }

    const request = new sql.Request();

    const result = await request
      .input("DocumentID", sql.Int, DocumentID)
      .input("AuditListID", sql.Int, AuditListID)
      .input("AuditInstanceID", sql.BigInt, AuditInstanceID)
      .execute("Tab_Q_GetIPQCCheckpointDetails");

    return successResponse(
      res,
      result.recordset,
      "IPQC checkpoint details fetched successfully"
    );
  } catch (error) {
    console.error("Get IPQC Execution Details Error:", error);
    return errorResponse(res, error.message, 500);
  }
};

// api to mark the result as 1-ok ,2-nok and write remark
const saveIPQCCheckpointResult = async (req, res) => {
  try {
    const {
      DocumentID,
      AuditListID,
      UID,
      AuditInstanceID,
      Result,
      Remark,
    } = req.body;

  if (
  DocumentID == null ||
  AuditListID == null ||
  UID == null ||
  AuditInstanceID == null ||
  Result == null
) {
      return errorResponse(
        res,
        "DocumentID, AuditListID, UID, AuditInstanceID and Result are required",
        400
      );
    }

    const request = new sql.Request();

    const dbResult = await request
      .input("DocumentID", sql.Int, DocumentID)
      .input("AuditListID", sql.Int, AuditListID)
      .input("UID", sql.Int, UID)
      .input("AuditInstanceID", sql.BigInt, AuditInstanceID)
      .input("Result", sql.Int, Result)
      .input("Remark", sql.NVarChar(500), Remark || null)
      .execute("Tab_Q_SaveIPQCCheckpointResult");

    const response = dbResult.recordset[0];

    if (response.Success === 1) {
      return successResponse(
        res,
        response,
        response.Message
      );
    }

    return errorResponse(
      res,
      response.Message,
      400
    );

  } catch (error) {
    console.error("Save IPQC Checkpoint Result Error:", error);
    return errorResponse(res, error.message, 500);
  }
};


// to api to integrate on submit button and move data from exe to hsitory table and status change in schedule and monitor table
const submitIPQCAudit = async (req, res) => {
  try {
    const {
      AuditListID,
      AuditInstanceID,
      ExecutedByRemark,
    } = req.body;

   if (
    AuditListID == null ||
    AuditInstanceID == null
) {
      return errorResponse(
        res,
        "AuditListID and AuditInstanceID are required",
        400
      );
    }

    const request = new sql.Request();

    const result = await request
      .input("AuditListID", sql.Int, AuditListID)
      .input("AuditInstanceID", sql.BigInt, AuditInstanceID)
      .input(
        "ExecutedByRemark",
        sql.NVarChar(sql.MAX),
        ExecutedByRemark || null
      )
      .execute("Tab_Q_IPQCAuditPoint_Submit");

    const response = result.recordset[0];

    if (response.Success === 1) {
      return successResponse(
        res,
        response,
        response.Message
      );
    }

    return errorResponse(
      res,
      response.Message,
      400
    );

  } catch (error) {
    console.error("Submit IPQC Audit Error:", error);
    return errorResponse(res, error.message, 500);
  }
};

//-------------Executed AuditList History Screen----------------
const getExecutedIPQCAuditList = async (req, res) => {
  try {
    const { DocumentID } = req.query;

    if (!DocumentID) {
      return errorResponse(res, "DocumentID is required", 400);
    }

    const request = new sql.Request();

    const result = await request
      .input("DocumentID", sql.Int, DocumentID)
      .execute("Tab_Q_GetExecutedIPQCAuditList");

    return successResponse(
      res,
      result.recordset,
      "Executed IPQC audit list fetched successfully"
    );
  } catch (error) {
    console.error("Get Executed IPQC Audit List Error:", error);
    return errorResponse(res, error.message, 500);
  }
};

//-----------Executed AuditCheckpoint History Screen-----------------
const getExecutedIPQCAuditPoints = async (req, res) => {
  try {
    const { DocumentID, AuditListID, AuditInstanceID } = req.query;

    if (!DocumentID || !AuditListID || !AuditInstanceID) {
      return errorResponse(
        res,
        "DocumentID, AuditListID and AuditInstanceID are required",
        400
      );
    }

    const request = new sql.Request();

    const result = await request
      .input("DocumentID", sql.Int, DocumentID)
      .input("AuditListID", sql.Int, AuditListID)
      .input("AuditInstanceID", sql.BigInt, AuditInstanceID)
      .execute("Tab_Q_GetExecutedIPQCAuditPoints");

    return successResponse(
      res,
      result.recordset,
      "Executed audit points fetched successfully"
    );
  } catch (error) {
    console.error("Get Executed IPQC Audit Points Error:", error);
    return errorResponse(res, error.message, 500);
  }
};

// ----------------------Supervisor Screen-----------------------------
// to get the list for approval
//Approval Checklist screen
const getPendingIPQCAuditApproval = async (req, res) => {
  try {
    const { DocumentID } = req.body;

    if (!DocumentID) {
      return errorResponse(
        res,
        "DocumentID is required",
        400
      );
    }

    const request = new sql.Request();

    request.input(
      "DocumentID",
      sql.Int,
      DocumentID
    );

    const result = await request.execute(
      "Tab_Q_GetPendingIPQCAuditApproval"
    );

    return successResponse(
      res,
      result.recordset,
      "Pending IPQC audit list fetched successfully"
    );

  } catch (error) {
    console.error(
      "Get Pending IPQC Audit Approval Error:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};
// to approve the auditlist 
const approveIPQCAudit = async (req, res) => {
  try {
    const {
      AuditListID,
      AuditInstanceID,
      ApprovedBy,
      ApprovedByRemark,
    } = req.body;

   if (
  AuditListID === undefined ||
  AuditListID === null ||
  AuditInstanceID === undefined ||
  AuditInstanceID === null ||
  !ApprovedBy?.trim()
) {
  return errorResponse(
    res,
    "AuditListID, AuditInstanceID and ApprovedBy are required",
    400
  );
}

    const request = new sql.Request();

    request.input(
      "AuditListID",
      sql.Int,
      AuditListID
    );

    request.input(
      "AuditInstanceID",
      sql.BigInt,
      AuditInstanceID
    );

    request.input(
      "ApprovedBy",
      sql.NVarChar(100),
      ApprovedBy
    );

    request.input(
      "ApprovedByRemark",
      sql.NVarChar(500),
      ApprovedByRemark || null
    );

    const result = await request.execute(
      "Tab_Q_ApproveIPQCAudit"
    );

    return successResponse(
      res,
      result.recordset,
      result.recordset[0].Message
    );

  } catch (error) {

    console.error(
      "Approve IPQC Audit Error:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};
// API to update IPQC History Checkpoint Result (1 = OK, 2 = NOK)
const updateIPQCHistoryCheckpointResult = async (req, res) => {
  try {
    const {
      DocumentID,
      AuditListID,
      UID,
      AuditInstanceID,
      Result,
      Remark,
    } = req.body;

    if (
      DocumentID == null ||
      AuditListID == null ||
      UID == null ||
      AuditInstanceID == null ||
      Result == null
    ) {
      return errorResponse(
        res,
        "DocumentID, AuditListID, UID, AuditInstanceID and Result are required",
        400
      );
    }

    const request = new sql.Request();

    const dbResult = await request
      .input("DocumentID", sql.Int, DocumentID)
      .input("AuditListID", sql.Int, AuditListID)
      .input("UID", sql.Int, UID)
      .input("AuditInstanceID", sql.BigInt, AuditInstanceID)
      .input("Result", sql.Int, Result)
      .input("Remark", sql.NVarChar(500), Remark || null)
      .execute("Tab_Q_UpdateIPQCHistoryCheckpointResult");

    const response = dbResult.recordset[0];

    if (response.Success === 1) {
      return successResponse(
        res,
        response,
        response.Message
      );
    }

    return errorResponse(
      res,
      response.Message,
      400
    );

  } catch (error) {
    console.error("Update IPQC History Checkpoint Result Error:", error);
    return errorResponse(res, error.message, 500);
  }
};
module.exports = {
    getDocListByGroup,
    getScheduleAuditList,
    executeIPQCAudit,
    getIPQCExecutionDetails,
    saveIPQCCheckpointResult,
    submitIPQCAudit,
    getExecutedIPQCAuditList,
    getExecutedIPQCAuditPoints,
    getPendingIPQCAuditApproval,
    approveIPQCAudit,
    updateIPQCHistoryCheckpointResult
};    
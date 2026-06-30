const { sql } = require("../../../../config/db");
const {
  successResponse,
  errorResponse,
} = require("../../../../middlewares/responseHandler");


//IQC Home Screen to get the Document List based on the Group
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

//---------------------Monitoring Screen-------------------------

// Get Audit List and Parts by DocumentID
const getAuditListAndParts = async (req, res) => {
  try {
    const { documentId } = req.query;

    if (!documentId) {
      return errorResponse(res, "DocumentID is required", 400);
    }

    const request = new sql.Request();

    const result = await request
      .input("DocumentID", sql.Int, documentId)
      .execute("Tab_Q_GetAuditListAndParts");

    return successResponse(
      res,
      result.recordset,
      "Audit list and parts fetched successfully"
    );
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(res, error.message, 500);
  }
};

// Get Active Audit List IDs
const getActiveAuditListIds = async (req, res) => {
  try {
    const { group } = req.query;

    const request = new sql.Request();

    let query = `
      SELECT
        M.UID,
        M.AuditListID,
        A.DocumentID,
        D.DocumentName,
        A.AuditListName,
        M.AuditInstanceID,
        M.LineID,
        M.StartDateTime,
        M.EndDateTime,
        M.Status
      FROM QA_AuditMonitoring M
      INNER JOIN Config_AuditList A
        ON M.AuditListID = A.AuditListID
      INNER JOIN Config_QADocumentList D
        ON A.DocumentID = D.DocumentID
      WHERE M.Status = 1
    `;

    if (group) {
      query += ` AND D.[Group] = @Group`;
      request.input("Group", sql.VarChar, group);
    }

    query += ` ORDER BY M.StartDateTime DESC`;

    const result = await request.query(query);

    return successResponse(
      res,
      result.recordset,
      "Active Audit List fetched successfully"
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message, 500);
  }
};

// for Execute button to insert data in execution tables from config tables
const executeIQCAudit = async (req, res) => {
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

    request.input("DocumentID", sql.Int, DocumentID);
    request.input("AuditListID", sql.Int, AuditListID);
    request.input("ExecutedBy", sql.Int, ExecutedBy);

    const result = await request.execute("Tab_Q_IQCMonitor_ExecuteBtn");

    return successResponse(
      res,
      result.recordset[0],
      "Audit executed successfully"
    );
  } catch (error) {
    console.error("Execute Audit Error:", error);
    return errorResponse(res, error.message, 500);
  }
};

//----------------------------Checkpoint Screen---------------------
// for showing the checkpoint in the table according to doc ,audit,sample no
const getIQCExecutionCheckpoints = async (req, res) => {
  try {
    const {
      DocumentID,
      AuditListID,
      AuditInstanceID,
      SampleNo,
    } = req.body;

    const request = new sql.Request();

    request.input("DocumentID", sql.Int, DocumentID);
    request.input("AuditListID", sql.Int, AuditListID);
    request.input("AuditInstanceID", sql.BigInt, AuditInstanceID);
    request.input("SampleNo", sql.Int, SampleNo);

    const result = await request.execute(
      "Tab_Q_GetIQCExecutionCheckpointsTable"
    );

    return successResponse(
      res,
      result.recordset,
      "Checkpoints fetched successfully"
    );
  } catch (error) {
    console.log(error);
    return errorResponse(res, error.message, 500);
  }
};

// to save the Marked sample checkpoint data in the execution table by using ok,nok button
const saveIQCCheckpointResult = async (req, res) => {
  try {
    const {
      DocumentID,
      UID,
      AuditInstanceID,
      SampleNo,
      Result,
      Remark,
    } = req.body;

    if (
      !DocumentID ||
      !UID ||
      !AuditInstanceID ||
      !SampleNo ||
      !Result
    ) {
      return errorResponse(
        res,
        "DocumentID, UID, AuditInstanceID, SampleNo and Result are required",
        400
      );
    }

    const request = new sql.Request();

    request.input("DocumentID", sql.Int, DocumentID);
    request.input("UID", sql.BigInt, UID);
    request.input("AuditInstanceID", sql.BigInt, AuditInstanceID);
    request.input("SampleNo", sql.Int, SampleNo);
    request.input("Result", sql.Int, Result);
    request.input("Remark", sql.NVarChar(500), Remark || "");

    const result = await request.execute(
      "Tab_Q_SaveIQCCheckpointResult"
    );

    return successResponse(
      res,
      result.recordset[0],
      "Checkpoint updated successfully"
    );
  } catch (error) {
    console.error("Save IQC Checkpoint Error:", error);
    return errorResponse(res, error.message, 500);
  }
};

// Submit IQC Audit checkpoint sheet after completiing all the checkpoint for all sample
const submitIQCAudit = async (req, res) => {
  try {
    const {
      AuditListID,
      AuditInstanceID
    } = req.body;

    if (!AuditListID || !AuditInstanceID) {
      return errorResponse(
        res,
        "AuditListID and AuditInstanceID are required",
        400
      );
    }

    const request = new sql.Request();

    request.input("AuditListID", sql.Int, AuditListID);
    request.input("AuditInstanceID", sql.BigInt, AuditInstanceID);

    const result = await request.execute(
      "Tab_Q_SubmitBtnIQCAuditCheckpoint"
    );

    return successResponse(
      res,
      result.recordset[0],
      result.recordset[0]?.Message || "Audit submitted successfully"
    );

  } catch (error) {
    console.error("Submit IQC Audit Error:", error);

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};


//----------------------------Executed AudlitList Screen----------------------
const getExecutedIQCAuditList = async (req, res) => {
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
      "Tab_Q_GetExecutedIQCAuditList"
    );

    return successResponse(
      res,
      result.recordset,
      "Executed audit list fetched successfully"
    );

  } catch (error) {
    console.error(error);

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};


//----------------------------Executed AuditCheckpoint Screen----------------------
const getExecutedIQCCheckpointDetails = async (req, res) => {
  try {
    const {
      DocumentID,
      AuditListID,
      SampleNo,
    } = req.body;

    if (
      !DocumentID ||
      !AuditListID ||
      !SampleNo
    ) {
      return errorResponse(
        res,
        "DocumentID, AuditListID and SampleNo are required",
        400
      );
    }

    const request = new sql.Request();

    request.input(
      "DocumentID",
      sql.Int,
      DocumentID
    );

    request.input(
      "AuditListID",
      sql.Int,
      AuditListID
    );

    request.input(
      "SampleNo",
      sql.Int,
      SampleNo
    );

    const result = await request.execute(
      "Tab_Q_GetExecutedIQCCheckpointDetails"
    );

    return successResponse(
      res,
      result.recordset,
      "Executed checkpoint details fetched successfully"
    );

  } catch (error) {
    console.error(
      "Get Executed Checkpoint Error:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};

//Approval Checklist screen
const getPendingIQCAuditApproval = async (req, res) => {
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
      "Tab_Q_GetPendingIQCAuditApproval"
    );

    return successResponse(
      res,
      result.recordset,
      "Pending IQC audit list fetched successfully"
    );

  } catch (error) {
    console.error(
      "Get Pending IQC Audit Approval Error:",
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
const approveIQCAudit = async (req, res) => {
  try {
    const {
      AuditListID,
      AuditInstanceID,
      ApprovedBy,
      ApprovedByRemark,
    } = req.body;

    if (
      !AuditListID ||
      !AuditInstanceID ||
      !ApprovedBy
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
      "Tab_Q_ApproveIQCAudit"
    );

    return successResponse(
      res,
      result.recordset,
      result.recordset[0].Message
    );

  } catch (error) {

    console.error(
      "Approve IQC Audit Error:",
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
  getAuditListByGroup,
  getAuditListAndParts,
  getActiveAuditListIds,
  executeIQCAudit,
  getIQCExecutionCheckpoints,
  saveIQCCheckpointResult,
  submitIQCAudit,
  getExecutedIQCAuditList,
  getExecutedIQCCheckpointDetails,
getPendingIQCAuditApproval,
  approveIQCAudit,
};
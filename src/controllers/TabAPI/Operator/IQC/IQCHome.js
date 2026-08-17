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
const getPlannedIQCAuditList = async (req, res) => {
  try {
    const { documentId } = req.query;

    if (!documentId) {
      return errorResponse(res, "DocumentID is required", 400);
    }

    const request = new sql.Request();

    const result = await request
      .input("DocumentID", sql.Int, documentId)
      .execute("Tab_Q_IQC_GetPlannedIQCAuditList");

    return successResponse(
      res,
      result.recordset,
      "Planned IQC audit list fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching planned IQC audit list:", error);

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};

// Get Waiting for Approval IQC Audit History acc to AuditListID, AuditInstanceID, PartID
const getWaitingForApprovalIQCAuditHistory = async (req, res) => {
  try {
    const { documentId } = req.query;

    // Validate DocumentID
    if (!documentId) {
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
      parseInt(documentId)
    );

    const result = await request.execute(
      "Tab_Q_IQC_GetWaitingForApprovalAuditHistory"
    );

    return successResponse(
      res,
      result.recordset,
      "Waiting for approval IQC audit history fetched successfully"
    );

  } catch (error) {
    console.error(
      "Error fetching waiting for approval IQC audit history:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};

// Get Executed IQC Checkpoint Details acc to DocumentID, AuditListID, PartID, AuditInstanceID, SampleLevel, SampleNo
const getExecutedIQCCheckpoint = async (req, res) => {
  try {
    const {
      documentId,
      auditListId,
      partId,
      auditInstanceId,
      sampleLevel,
      sampleNo
    } = req.query;

    // Validation
    if (!documentId) {
      return errorResponse(res, "DocumentID is required", 400);
    }

    if (!auditListId) {
      return errorResponse(res, "AuditListID is required", 400);
    }

    if (!partId) {
      return errorResponse(res, "PartID is required", 400);
    }

    if (!auditInstanceId) {
      return errorResponse(res, "AuditInstanceID is required", 400);
    }

    if (!sampleLevel) {
      return errorResponse(res, "SampleLevel is required", 400);
    }

    if (!sampleNo) {
      return errorResponse(res, "SampleNo is required", 400);
    }

    const documentID = parseInt(documentId);
    const auditListID = parseInt(auditListId);
    const partID = parseInt(partId);
    const auditInstanceID = parseInt(auditInstanceId);
    const sampleLevelValue = parseInt(sampleLevel);
    const sampleNoValue = parseInt(sampleNo);

    if (![1, 2].includes(documentID)) {
      return errorResponse(
        res,
        "Invalid DocumentID. DocumentID must be 1 or 2.",
        400
      );
    }

    const request = new sql.Request();

    request.input(
      "DocumentID",
      sql.Int,
      documentID
    );

    request.input(
      "AuditListID",
      sql.Int,
      auditListID
    );

    request.input(
      "PartID",
      sql.NVarChar(50),
      partID
    );

    request.input(
      "AuditInstanceID",
      sql.BigInt,
      auditInstanceID
    );

    request.input(
      "SampleLevel",
      sql.Int,
      sampleLevelValue
    );

    request.input(
      "SampleNo",
      sql.Int,
      sampleNoValue
    );

    const result = await request.execute(
      "Tab_Q_IQC_GetExecutedCheckpointDetails"
    );

    return successResponse(
      res,
      result.recordset,
      "IQC checkpoint details fetched successfully"
    );

  } catch (error) {
    console.error(
      "Error fetching IQC checkpoint details:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};

// Get Approved IQC Audit History acc to AuditListID, AuditInstanceID, PartID
// Get Approved IQC Audit History according to DocumentID
const getApprovedIQCAuditHistory = async (req, res) => {
  try {
    const { documentId } = req.query;

    // Validate DocumentID
    if (!documentId) {
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
      parseInt(documentId)
    );

    const result = await request.execute(
      "Tab_Q_IQC_GetApprovedIQCAuditHistory"
    );

    return successResponse(
      res,
      result.recordset,
      "Approved IQC audit history fetched successfully"
    );

  } catch (error) {
    console.error(
      "Error fetching approved IQC audit history:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};

// Get IQC Checkpoint Details acc to DocumentID, AuditListID, PartID, SampleLevel, SampleNo
const getIQCCheckpointDetails = async (req, res) => {
  try {
    const {
      DocumentID,
      AuditListID,
      PartID,
      SampleLevel,
      SampleNo
    } = req.query;

    const request = new sql.Request();

    request.input(
      "DocumentID",
      sql.Int,
      DocumentID ? parseInt(DocumentID) : null
    );

    request.input(
      "AuditListID",
      sql.Int,
      AuditListID ? parseInt(AuditListID) : null
    );

    request.input(
      "PartID",
      sql.VarChar(50),
      PartID ? PartID : null
    );

    request.input(
      "SampleLevel",
      sql.Int,
      SampleLevel ? parseInt(SampleLevel) : null
    );

    request.input(
      "SampleNo",
      sql.Int,
      SampleNo ? parseInt(SampleNo) : null
    );

    const result = await request.execute(
      "Tab_Q_IQC_GetCheckpointDetailsForExecute"
    );

    return successResponse(
      res,
      result.recordset,
      "IQC checkpoint details fetched successfully"
    );

  } catch (error) {
    console.error(
      "Error fetching IQC checkpoint details:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};

// Update IQC Checkpoint Result
const updateIQCCheckpointResult = async (req, res) => {
  try {
    const {
      DocumentID,
      AuditListID,
      AuditPointID,
      SampleLevel,
      SampleNo,
      AuditInstanceID,
      Result,
      Remark,
      ObservationValue
    } = req.body;

    const request = new sql.Request();

    request.input(
      "DocumentID",
      sql.Int,
      DocumentID !== undefined && DocumentID !== null
        ? parseInt(DocumentID)
        : null
    );

    request.input(
      "AuditListID",
      sql.Int,
      AuditListID !== undefined && AuditListID !== null
        ? parseInt(AuditListID)
        : null
    );

    request.input(
      "AuditPointID",
      sql.Int,
      AuditPointID !== undefined && AuditPointID !== null
        ? parseInt(AuditPointID)
        : null
    );

    request.input(
      "SampleLevel",
      sql.Int,
      SampleLevel !== undefined && SampleLevel !== null
        ? parseInt(SampleLevel)
        : null
    );

    request.input(
      "SampleNo",
      sql.Int,
      SampleNo !== undefined && SampleNo !== null
        ? parseInt(SampleNo)
        : null
    );

    request.input(
      "AuditInstanceID",
      sql.BigInt,
      AuditInstanceID !== undefined && AuditInstanceID !== null
        ? parseInt(AuditInstanceID)
        : null
    );

    request.input(
      "Result",
      sql.Int,
      Result !== undefined && Result !== null
        ? parseInt(Result)
        : null
    );

    request.input(
      "Remark",
      sql.NVarChar(500),
      Remark || null
    );

    request.input(
      "ObservationValue",
      sql.NVarChar(500),
      ObservationValue || null
    );

    const result = await request.execute(
      "Tab_Q_IQC_UpdateIQCCheckpointResult"
    );

    return successResponse(
      res,
      result.recordset,
      "IQC checkpoint result updated successfully"
    );

  } catch (error) {
    console.error(
      "Error updating IQC checkpoint result:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};


//Move Next Level API

// Move IQC Audit to Next Sample Level
const moveToNextSampleLevel = async (req, res) => {
  try {
    const {
      DocumentID,
      AuditListID,
      AuditInstanceID,
      PartID,
      VendorID,
      ValidatedBy
    } = req.body;

    // -----------------------------------------
    // Validation
    // -----------------------------------------

    if (
      DocumentID === undefined ||
      DocumentID === null ||
      DocumentID === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "DocumentID is required"
      });
    }

    if (
      AuditListID === undefined ||
      AuditListID === null ||
      AuditListID === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "AuditListID is required"
      });
    }

    if (
      AuditInstanceID === undefined ||
      AuditInstanceID === null ||
      AuditInstanceID === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "AuditInstanceID is required"
      });
    }

    const documentID = parseInt(DocumentID);
    const auditListID = parseInt(AuditListID);
    const auditInstanceID = parseInt(AuditInstanceID);

    if (![1, 2].includes(documentID)) {
      return res.status(400).json({
        success: false,
        message: "DocumentID must be 1 or 2"
      });
    }

    if (isNaN(auditListID)) {
      return res.status(400).json({
        success: false,
        message: "AuditListID must be a valid integer"
      });
    }

    if (isNaN(auditInstanceID)) {
      return res.status(400).json({
        success: false,
        message: "AuditInstanceID must be a valid number"
      });
    }

    // PartID is required for Milipore
    if (
      documentID === 2 &&
      (PartID === undefined ||
        PartID === null ||
        PartID === "")
    ) {
      return res.status(400).json({
        success: false,
        message: "PartID is required for DocumentID 2"
      });
    }

    // -----------------------------------------
    // SQL Request
    // -----------------------------------------

    const request = new sql.Request();

    request.input(
      "DocumentID",
      sql.Int,
      documentID
    );

    request.input(
      "AuditListID",
      sql.Int,
      auditListID
    );

    request.input(
      "AuditInstanceID",
      sql.BigInt,
      auditInstanceID
    );

    request.input(
      "PartID",
      sql.NVarChar(50),
      PartID !== undefined &&
      PartID !== null &&
      PartID !== ""
        ? String(PartID)
        : null
    );

    request.input(
      "VendorID",
      sql.Int,
      VendorID !== undefined &&
      VendorID !== null &&
      VendorID !== ""
        ? parseInt(VendorID)
        : null
    );

    request.input(
      "ValidatedBy",
      sql.NVarChar(50),
      ValidatedBy !== undefined &&
      ValidatedBy !== null &&
      ValidatedBy !== ""
        ? String(ValidatedBy)
        : null
    );

    // -----------------------------------------
    // Execute Stored Procedure
    // -----------------------------------------

    const result = await request.execute(
      "Tab_Q_IQC_MoveToNextSampleLevel"
    );

    const data = result.recordset || [];

    // -----------------------------------------
    // No response from SP
    // -----------------------------------------

    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No response received from stored procedure"
      });
    }

    // -----------------------------------------
    // SP Error
    // -----------------------------------------

    if (data[0].ErrorNumber) {
      return res.status(400).json({
        success: false,
        message: data[0].ErrorMessage,
        errorNumber: data[0].ErrorNumber,
        errorLine: data[0].ErrorLine
      });
    }

    // -----------------------------------------
    // Success
    // -----------------------------------------

    return res.status(200).json({
      success: true,
      message: data[0].Message,
      data: {
        DocumentID: data[0].DocumentID,
        AuditListID: data[0].AuditListID,
        AuditInstanceID: data[0].AuditInstanceID,
        PreviousLevel: data[0].PreviousLevel,
        NextLevel: data[0].NextLevel,
        SampleQty: data[0].SampleQty,
        StartSampleNo: data[0].StartSampleNo,
        EndSampleNo: data[0].EndSampleNo
      }
    });

  } catch (error) {
    console.error(
      "Error in moveToNextSampleLevel API:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};


//-----------------------Supervisor Login------------------------
//Approve IQC AuditLIST
// Approve IQC Audit
const approveIQCAudit = async (req, res) => {
  try {
    const {
      AuditListID,
      AuditInstanceID,
      ApprovedBy,
      ApprovedByRemark
    } = req.body;

    const request = new sql.Request();

    request.input(
      "AuditListID",
      sql.Int,
      AuditListID !== undefined && AuditListID !== null
        ? parseInt(AuditListID)
        : null
    );

    request.input(
      "AuditInstanceID",
      sql.BigInt,
      AuditInstanceID !== undefined && AuditInstanceID !== null
        ? parseInt(AuditInstanceID)
        : null
    );

    request.input(
      "ApprovedBy",
      sql.NVarChar(100),
      ApprovedBy || null
    );

    request.input(
      "ApprovedByRemark",
      sql.NVarChar(500),
      ApprovedByRemark || null
    );

    const result = await request.execute(
      "Tab_Q_IQC_ApproveIQCAudit"
    );

    return successResponse(
      res,
      result.recordset,
      "IQC audit approved successfully"
    );

  } catch (error) {
    console.error(
      "Error approving IQC audit:",
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
  getPlannedIQCAuditList,
  getWaitingForApprovalIQCAuditHistory,
  getApprovedIQCAuditHistory,
  getExecutedIQCCheckpoint,
  getIQCCheckpointDetails,
  updateIQCCheckpointResult,
  moveToNextSampleLevel,
  approveIQCAudit
};
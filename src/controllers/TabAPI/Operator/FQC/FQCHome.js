const { sql } = require("../../../../config/db");
const {
  successResponse,
  errorResponse,
} = require("../../../../middlewares/responseHandler");


//FQC Home Screen to get the Document List based on the Group
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
      .execute("Tab_Q_FQC_GetScheduledAuditList");

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
const executeFQCAudit = async (req, res) => {
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
      .execute("Tab_Q_FQC_MonitoringScreenInspectBtn");

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

//-------------Waiting for Approval AuditList History Screen ----------------
const getWaitingForApprovalFQCAuditList = async (req, res) => {
  try {
    const request = new sql.Request();

    const result = await request.execute(
      "Tab_Q_FQC_GetWaitingForApprovalFQCAuditList"
    );

    return successResponse(
      res,
      result.recordset,
      "Waiting for Approval FQC audit list fetched successfully"
    );
  } catch (error) {
    console.error("Get Waiting for Approval FQC Audit List Error:", error);

    return errorResponse(res, error.message, 500);
  }
};

//------- Waiting for Approval Checkpoint History Screen (Common)
const getWaitingForApprovalFQCAuditPoints = async (req, res) => {
  try {
    const {
      DocumentID,
      AuditListID,
      AuditInstanceID,
      SampleLevel,
      SampleNo
    } = req.query;

    // Validation
    if (
      !DocumentID ||
      !AuditListID ||
      !AuditInstanceID ||
      !SampleLevel ||
      !SampleNo
    ) {
      return res.status(400).json({
        success: false,
        message:
          "DocumentID, AuditListID, AuditInstanceID, SampleLevel and SampleNo are required"
      });
    }

    const request = new sql.Request();

    request.input(
      "DocumentID",
      sql.Int,
      parseInt(DocumentID)
    );

    request.input(
      "AuditListID",
      sql.Int,
      parseInt(AuditListID)
    );

    request.input(
      "AuditInstanceID",
      sql.BigInt,
      BigInt(AuditInstanceID)
    );

    request.input(
      "SampleLevel",
      sql.Int,
      parseInt(SampleLevel)
    );

    request.input(
      "SampleNo",
      sql.Int,
      parseInt(SampleNo)
    );

    const result = await request.execute(
      "Tab_Q_FQC_GetWaitingForApprovalFQCAuditPoints"
    );

    return res.status(200).json({
      success: true,
      message: "Executed FQC audit points fetched successfully",
      data: result.recordset
    });

  } catch (error) {
    console.error(
      "Error fetching executed FQC audit points:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Error fetching executed FQC audit points",
      error: error.message
    });
  }
};

//------------- Approved AuditList History Screen----------------
const getApprovedFQCAuditList = async (req, res) => {
  try {
    const request = new sql.Request();

    const result = await request.execute(
      "Tab_Q_FQC_GetApprovedFQCAuditList"
    );

    return successResponse(
      res,
      result.recordset,
      "Approved FQC audit list fetched successfully"
    );

  } catch (error) {
    console.error("Get Approved FQC Audit List Error:", error);

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};

//---------Mark checkpoint screen-----------------------

//-------Get checkpoint details acc to sample level and no from EngInbuild table in this we have data of doc-10,12,13
const getFQCEngInbuiltCheckpointDetails = async (req, res) => {
  try {
    const {
      AuditListID,
      SampleLevel,
      SampleNo,
      AuditInstanceID
    } = req.query;

    if (!AuditListID) {
      return errorResponse(res, "AuditListID is required", 400);
    }

    const request = new sql.Request();

    const result = await request
      .input(
        "AuditListID",
        sql.Int,
        parseInt(AuditListID)
      )
      .input(
        "SampleLevel",
        sql.Int,
        SampleLevel ? parseInt(SampleLevel) : null
      )
      .input(
        "SampleNo",
        sql.Int,
        SampleNo ? parseInt(SampleNo) : null
      )
      .input(
        "AuditInstanceID",
        sql.BigInt,
        AuditInstanceID ? parseInt(AuditInstanceID) : null
      )
      .execute("Tab_Q_FQC_GetEngInbuiltCheckpointDetails_ForExecute");

    return successResponse(
      res,
      result.recordset,
      "FQC Engine Inbuilt checkpoint details fetched successfully"
    );

  } catch (error) {
    console.error(
      "Error fetching FQC Engine Inbuilt checkpoint details:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};

// -------ok/nok btn
const updateFQCEngInbuiltCheckpointResult = async (req, res) => {
  try {
    const {
      UID,
      SampleLevel,
      SampleNo,
      Result,
      Remark,
      ObservationValue
    } = req.body;

    // Validate required fields
    if (
      UID === undefined ||
      SampleLevel === undefined ||
      SampleNo === undefined ||
      Result === undefined
    ) {
      return errorResponse(
        res,
        "UID, SampleLevel, SampleNo and Result are required",
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
        "SampleLevel",
        sql.Int,
        parseInt(SampleLevel)
      )
      .input(
        "SampleNo",
        sql.Int,
        parseInt(SampleNo)
      )
      .input(
        "Result",
        sql.Int,
        parseInt(Result)
      )
      .input(
        "Remark",
        sql.NVarChar(500),
        Remark || null
      )
      .input(
        "ObservationValue",
        sql.NVarChar(500),
        ObservationValue || null
      )
      .execute(
        "Tab_Q_FQC_UpdateEngInbuiltCheckpointResult"
      );

    return successResponse(
      res,
      result.recordset,
      "FQC Engine Inbuilt checkpoint result updated successfully"
    );

  } catch (error) {
    console.error(
      "Error updating FQC Engine Inbuilt checkpoint result:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};
//--------update engineno on very sample
const updateFQCEngInbuiltEngineNo = async (req, res) => {
  try {
    const {
      AuditListID,
      SampleLevel,
      SampleNo,
      EngineNo
    } = req.body;

    if (
      AuditListID === undefined ||
      SampleLevel === undefined ||
      SampleNo === undefined ||
      EngineNo === undefined ||
      EngineNo === null ||
      String(EngineNo).trim() === ""
    ) {
      return errorResponse(
        res,
        "AuditListID, SampleLevel, SampleNo and EngineNo are required",
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
        "SampleLevel",
        sql.Int,
        parseInt(SampleLevel)
      )
      .input(
        "SampleNo",
        sql.Int,
        parseInt(SampleNo)
      )
      .input(
        "EngineNo",
        sql.NVarChar(100),
        String(EngineNo).trim()
      )
      .execute("Tab_Q_FQC_UpdateEngInbuilt_EngineNo");

    return successResponse(
      res,
      result.recordset,
      "Engine No updated successfully for all checkpoints of the sample"
    );

  } catch (error) {
    console.error(
      "Error updating FQC Engine Inbuilt EngineNo:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};
//-----move to next sample

const moveToNextFQCSampleLevelEngInbuilt = async (req, res) => {
  try {
    const {
      AuditListID,
      AuditInstanceID
    } = req.body;

    if (
      AuditListID === undefined ||
      AuditInstanceID === undefined
    ) {
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
        sql.BigInt,
        BigInt(AuditInstanceID)
      )
      .execute("Tab_Q_FQC_MoveToNextSampleLevel_EngInbuilt");

    return successResponse(
      res,
      result.recordset,
      "FQC Engine Inbuilt sample level moved successfully"
    );

  } catch (error) {
    console.error(
      "Error moving FQC Engine Inbuilt sample level:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};

//------------Final Submit btn move checkpoint data to history and change status in schedule and monitoring table
const submitFQCEngInbuiltAudit = async (req, res) => {
  try {
    const {
      AuditListID,
      AuditInstanceID,
      ExecutedByRemark
    } = req.body;

    if (
      AuditListID === undefined ||
      AuditInstanceID === undefined
    ) {
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
        sql.BigInt,
        BigInt(AuditInstanceID)
      )
      .input(
        "ExecutedByRemark",
        sql.NVarChar(sql.MAX),
        ExecutedByRemark || null
      )
      .execute(
        "Tab_Q_FQC_EngInbuiltAuditPoint_Submit"
      );

    const responseData = result.recordset || [];

    if (
      responseData.length > 0 &&
      responseData[0].Success === 0
    ) {
      return errorResponse(
        res,
        responseData[0].Message,
        400
      );
    }

    return successResponse(
      res,
      responseData,
      "FQC Engine Inbuilt Audit submitted successfully"
    );

  } catch (error) {
    console.error(
      "Error submitting FQC Engine Inbuilt audit:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};

//-------------------Perf screen-------
//---Get checkpoint details acc to sample level and no from EngPerfom table in this we have data of doc-11
const getFQCEngPerformanceCheckpointDetails = async (req, res) => {
  try {
    const {
      AuditListID,
      SampleLevel,
      SampleNo,
      AuditInstanceID
    } = req.query;

    if (!AuditListID) {
      return errorResponse(
        res,
        "AuditListID is required",
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
        "SampleLevel",
        sql.Int,
        SampleLevel !== undefined && SampleLevel !== ""
          ? parseInt(SampleLevel)
          : null
      )
      .input(
        "SampleNo",
        sql.Int,
        SampleNo !== undefined && SampleNo !== ""
          ? parseInt(SampleNo)
          : null
      )
      .input(
        "AuditInstanceID",
        sql.BigInt,
        AuditInstanceID !== undefined && AuditInstanceID !== ""
          ? parseInt(AuditInstanceID)
          : null
      )
      .execute(
        "Tab_Q_FQC_GetEngPerformanceCheckpointDetails_ForExecute"
      );

    return successResponse(
      res,
      result.recordset,
      "FQC Engine Performance checkpoint details fetched successfully"
    );

  } catch (error) {
    console.error(
      "Error fetching FQC Engine Performance checkpoint details:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};
//------Update ok/nok value
const updateFQCEngPerformanceCheckpointResult = async (req, res) => {
  try {
    const {
      UID,
      SampleLevel,
      SampleNo,

      ObservationPowerValue,
      ObservationPowerValueResult,
      ObservationPowerValueRemark,

      ObservationPowerRPMValue,
      ObservationPowerRPMResult,
      ObservationPowerRPMRemark,

      ObservationTorqueValue,
      ObservationTorqueValueResult,
      ObservationTorqueValueRemark,

      ObservationTorqueRPMValue,
      ObservationTorqueRPMResult,
      ObservationTorqueRPMRemark
    } = req.body;

    // Required fields
    if (
      UID === undefined ||
      SampleLevel === undefined ||
      SampleNo === undefined
    ) {
      return errorResponse(
        res,
        "UID, SampleLevel and SampleNo are required",
        400
      );
    }

    const request = new sql.Request();

    const result = await request
      .input("UID", sql.Int, parseInt(UID))
      .input("SampleLevel", sql.Int, parseInt(SampleLevel))
      .input("SampleNo", sql.Int, parseInt(SampleNo))

      .input(
        "ObservationPowerValue",
        sql.NVarChar(500),
        ObservationPowerValue || null
      )
      .input(
        "ObservationPowerValueResult",
        sql.Int,
        ObservationPowerValueResult !== undefined &&
        ObservationPowerValueResult !== null
          ? parseInt(ObservationPowerValueResult)
          : null
      )
      .input(
        "ObservationPowerValueRemark",
        sql.NVarChar(500),
        ObservationPowerValueRemark || null
      )

      .input(
        "ObservationPowerRPMValue",
        sql.NVarChar(500),
        ObservationPowerRPMValue || null
      )
      .input(
        "ObservationPowerRPMResult",
        sql.Int,
        ObservationPowerRPMResult !== undefined &&
        ObservationPowerRPMResult !== null
          ? parseInt(ObservationPowerRPMResult)
          : null
      )
      .input(
        "ObservationPowerRPMRemark",
        sql.NVarChar(500),
        ObservationPowerRPMRemark || null
      )

      .input(
        "ObservationTorqueValue",
        sql.NVarChar(500),
        ObservationTorqueValue || null
      )
      .input(
        "ObservationTorqueValueResult",
        sql.Int,
        ObservationTorqueValueResult !== undefined &&
        ObservationTorqueValueResult !== null
          ? parseInt(ObservationTorqueValueResult)
          : null
      )
      .input(
        "ObservationTorqueValueRemark",
        sql.NVarChar(500),
        ObservationTorqueValueRemark || null
      )

      .input(
        "ObservationTorqueRPMValue",
        sql.NVarChar(500),
        ObservationTorqueRPMValue || null
      )
      .input(
        "ObservationTorqueRPMResult",
        sql.Int,
        ObservationTorqueRPMResult !== undefined &&
        ObservationTorqueRPMResult !== null
          ? parseInt(ObservationTorqueRPMResult)
          : null
      )
      .input(
        "ObservationTorqueRPMRemark",
        sql.NVarChar(500),
        ObservationTorqueRPMRemark || null
      )

      .execute("Tab_Q_FQC_UpdateEngPerformanceCheckpointResult");

    return successResponse(
      res,
      result.recordset,
      "FQC Engine Performance checkpoint result updated successfully"
    );

  } catch (error) {
    console.error(
      "Error updating FQC Engine Performance checkpoint result:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};
//---------update engine no on every sample
const updateFQCEngPerformanceEngineNo = async (req, res) => {
  try {
    const {
      AuditListID,
      SampleLevel,
      SampleNo,
      EngineNo
    } = req.body;

    if (
      AuditListID === undefined ||
      SampleLevel === undefined ||
      SampleNo === undefined ||
      EngineNo === undefined ||
      EngineNo === null ||
      String(EngineNo).trim() === ""
    ) {
      return errorResponse(
        res,
        "AuditListID, SampleLevel, SampleNo and EngineNo are required",
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
        "SampleLevel",
        sql.Int,
        parseInt(SampleLevel)
      )
      .input(
        "SampleNo",
        sql.Int,
        parseInt(SampleNo)
      )
      .input(
        "EngineNo",
        sql.NVarChar(100),
        String(EngineNo).trim()
      )
      .execute("Tab_Q_FQC_UpdateEngPerformance_EngineNo");

    return successResponse(
      res,
      result.recordset,
      "Engine No updated successfully for all checkpoints of the sample"
    );

  } catch (error) {
    console.error(
      "Error updating FQC Engine Performance EngineNo:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};

//----------Move to Next Sample Level for EngPerformance-----------

const moveToNextFQCSampleLevelEngPerformance = async (req, res) => {
  try {
    const {
      AuditListID,
      AuditInstanceID
    } = req.body;

    if (
      AuditListID === undefined ||
      AuditInstanceID === undefined
    ) {
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
        sql.BigInt,
        BigInt(AuditInstanceID)
      )
      .execute(
        "Tab_Q_FQC_MoveToNextSampleLevel_EngPerformance"
      );

    return successResponse(
      res,
      result.recordset,
      "FQC Engine Performance sample level moved successfully"
    );

  } catch (error) {
    console.error(
      "Error moving FQC Engine Performance sample level:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};

//---Final Submit btn move checkpoint data to history and change status in schedule and monitoring table
const submitFQCEngPerformanceAudit = async (req, res) => {
  try {
    const {
      AuditListID,
      AuditInstanceID,
      ExecutedByRemark
    } = req.body;

    if (
      AuditListID === undefined ||
      AuditInstanceID === undefined
    ) {
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
        sql.BigInt,
        BigInt(AuditInstanceID)
      )
      .input(
        "ExecutedByRemark",
        sql.NVarChar(sql.MAX),
        ExecutedByRemark || null
      )
      .execute(
        "Tab_Q_FQC_EngPerformanceAuditPoint_Submit"
      );

    const responseData = result.recordset || [];

    if (
      responseData.length > 0 &&
      responseData[0].Success === 0
    ) {
      return errorResponse(
        res,
        responseData[0].Message,
        400
      );
    }

    return successResponse(
      res,
      responseData,
      "FQC Engine Performance Audit submitted successfully"
    );

  } catch (error) {
    console.error(
      "Error submitting FQC Engine Performance audit:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};


//----------------------------Checkpoint Detaisl Screen----------

//Inbuild
const getExecutedFQCEngInbuiltCheckpointDetails = async (req, res) => {
  try {
    const {
      AuditListID,
      AuditInstanceID,
      SampleLevel,
      SampleNo
    } = req.query;

    if (
      AuditListID === undefined ||
      AuditInstanceID === undefined ||
      SampleLevel === undefined ||
      SampleNo === undefined
    ) {
      return errorResponse(
        res,
        "AuditListID, AuditInstanceID, SampleLevel and SampleNo are required",
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
        BigInt(AuditInstanceID)
      )
      .input(
        "SampleLevel",
        sql.Int,
        parseInt(SampleLevel)
      )
      .input(
        "SampleNo",
        sql.Int,
        parseInt(SampleNo)
      )
      .execute(
        "Tab_Q_FQC_GetExecuted_EngInbuilt_CheckpointDetails"
      );

    return successResponse(
      res,
      result.recordset,
      "FQC Engine Inbuilt executed checkpoint details fetched successfully"
    );

  } catch (error) {
    console.error(
      "Error fetching FQC Engine Inbuilt executed checkpoint details:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};


//Performance
const getExecutedFQCEngPerformanceCheckpointDetails = async (req, res) => {
  try {
    const {
      AuditListID,
      AuditInstanceID,
      SampleLevel,
      SampleNo
    } = req.query;

    if (
      AuditListID === undefined ||
      AuditInstanceID === undefined ||
      SampleLevel === undefined ||
      SampleNo === undefined
    ) {
      return errorResponse(
        res,
        "AuditListID, AuditInstanceID, SampleLevel and SampleNo are required",
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
        BigInt(AuditInstanceID)
      )
      .input(
        "SampleLevel",
        sql.Int,
        parseInt(SampleLevel)
      )
      .input(
        "SampleNo",
        sql.Int,
        parseInt(SampleNo)
      )
      .execute(
        "Tab_Q_FQC_GetExecutedEngPerformanceCheckpointDetails"
      );

    return successResponse(
      res,
      result.recordset,
      "FQC Engine Performance executed checkpoint details fetched successfully"
    );

  } catch (error) {
    console.error(
      "Error fetching FQC Engine Performance executed checkpoint details:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};


//----------------Supervisor Login----

//For Approve btn
const approveFQCAudit = async (req, res) => {
  try {
    const {
      AuditListID,
      AuditInstanceID,
      ApprovedBy,
      ApprovedByRemark
    } = req.body;

    // Validation
    if (
      AuditListID === undefined ||
      AuditInstanceID === undefined ||
      ApprovedBy === undefined ||
      ApprovedBy === null ||
      String(ApprovedBy).trim() === ""
    ) {
      return errorResponse(
        res,
        "AuditListID, AuditInstanceID and ApprovedBy are required",
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
        BigInt(AuditInstanceID)
      )
      .input(
        "ApprovedBy",
        sql.NVarChar(100),
        String(ApprovedBy).trim()
      )
      .input(
        "ApprovedByRemark",
        sql.NVarChar(500),
        ApprovedByRemark || null
      )
      .execute("Tab_Q_FQC_Approve_AuditList");

    const responseData = result.recordset || [];

    // SP returned failure
    if (
      responseData.length > 0 &&
      responseData[0].Success === 0
    ) {
      return errorResponse(
        res,
        responseData[0].Message,
        400
      );
    }

    return successResponse(
      res,
      responseData,
      "FQC Audit Approved Successfully"
    );

  } catch (error) {
    console.error("Error approving FQC Audit:", error);

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};

module.exports = {
  getAuditListByGroup,
  getScheduleAuditList,
  executeFQCAudit,

  getWaitingForApprovalFQCAuditList,
  getWaitingForApprovalFQCAuditPoints,

  getApprovedFQCAuditList,

  getFQCEngInbuiltCheckpointDetails,
  updateFQCEngInbuiltEngineNo,
  updateFQCEngInbuiltCheckpointResult,
  moveToNextFQCSampleLevelEngInbuilt,
  submitFQCEngInbuiltAudit,
  getFQCEngPerformanceCheckpointDetails,
  updateFQCEngPerformanceCheckpointResult,
  updateFQCEngPerformanceEngineNo,
  moveToNextFQCSampleLevelEngPerformance,
  submitFQCEngPerformanceAudit,

  getExecutedFQCEngInbuiltCheckpointDetails,
  getExecutedFQCEngPerformanceCheckpointDetails,

  approveFQCAudit

};
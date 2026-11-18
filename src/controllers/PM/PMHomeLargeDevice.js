const { sql } = require("../../config/db");
const {
  successResponse,
  errorResponse,
} = require("../../middlewares/responseHandler");

//---------Monitoring screen
//CheckListDetail screen to get the List for Schedule it

const getExecutionChecklist = async (req, res) => {
  try {
    const request = new sql.Request();

    const result = await request.query(`
      SELECT
        M.UID,
        M.CheckListID,
        M.EquipmentID,
        E.EquipmentName,
        M.CheckListInstanceID,
        M.CheckListName,
        M.CheckListDesc,
        M.PMStatus,
        M.PMExecutionStatus,
        M.ExecutedStartTime,
        M.ExecutedBy,
        M.ExecutedEndTime,
        M.ExecutedByRemark

      FROM Maint_Execute_PMChecklist M

      LEFT JOIN Config_Equipment E
        ON M.EquipmentID = E.EquipmentID

      ORDER BY M.UID DESC
    `);

    return successResponse(
      res,
      result.recordset,
      "Execution checklists fetched successfully"
    );

  } catch (error) {
    console.error(
      "Error fetching execution checklists:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};

//On Inspect btn move Checkpoints to execution table and change status in Monitoring and execute Checklist table

const startPMChecklistExecution = async (req, res) => {
  try {
    const {
      CheckListID,
      EquipmentID,
      CheckListInstanceID,
      UserID
    } = req.body;

    // Validate input
    if (
      CheckListID == null ||
      EquipmentID == null ||
      CheckListInstanceID == null ||
      UserID == null
    ) {
      return errorResponse(
        res,
        "CheckListID, EquipmentID, CheckListInstanceID and UserID are required",
        400
      );
    }

    const request = new sql.Request();

    request.input('CheckListID', sql.Int, CheckListID);
    request.input('EquipmentID', sql.Int, EquipmentID);
    request.input('CheckListInstanceID', sql.Int, CheckListInstanceID);
    request.input('UserID', sql.Int, UserID);

    const result = await request.execute(
      'Tab_PM_StartChecklistExecution'
    );

    return successResponse(
      res,
      result.recordset,
      "PM checklist execution started successfully"
    );

  } catch (error) {
    console.error(
      "Error starting PM checklist execution:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};

//--------------Checkpoint screen-------------



//get all the checkpoint acc to checklist for execute
const getPMExecutionCheckPoints = async (req, res) => {
    try {
        const { CheckListID } = req.params;

        if (CheckListID == null || CheckListID === '') {
            return errorResponse(res, "CheckListID is required", 400);
        }

        const request = new sql.Request();

        request.input("CheckListID", sql.Int, CheckListID);

        const result = await request.query(`
            SELECT
                E.CheckPointId,
                E.CheckListId,
                E.CheckPointName,
                C.CheckPointType,
                C.UpperLimit,
                C.LowerLimit,
                E.Remark,
                E.Observation,
                E.Status,
                E.[TimeStamp],
                E.UserID
            FROM dbo.Maint_Execute_PMCheckPoints E
            LEFT JOIN dbo.Config_PMCheckPoints C
                ON E.CheckListId = C.CheckListId
                AND E.CheckPointName = C.CheckPointName
            WHERE E.CheckListId = @CheckListID
            ORDER BY E.CheckPointId ASC;
        `);

        return successResponse(
            res,
            result.recordset,
            "PM execution checkpoints fetched successfully"
        );

    } catch (error) {
        console.error("getPMExecutionCheckPoints Error:", error);
        return errorResponse(res, error.message, 500);
    }
};
//update the remark observation and status

const updatePMExecutionCheckPoint = async (req, res) => {
    try {
        const {
            CheckPointId,
            Remark,
            Observation,
            Status
        } = req.body;

        if (CheckPointId == null) {
            return errorResponse(res, "CheckPointId is required", 400);
        }

        // Check which fields were supplied in the request
        const updateRemark = Object.prototype.hasOwnProperty.call(req.body, "Remark");
        const updateObservation = Object.prototype.hasOwnProperty.call(req.body, "Observation");
        const updateStatus = Object.prototype.hasOwnProperty.call(req.body, "Status");

        if (!updateRemark && !updateObservation && !updateStatus) {
            return errorResponse(
                res,
                "Please provide Remark, Observation or Status to update",
                400
            );
        }

        // Validate Status
        if (updateStatus && ![1, 2].includes(Number(Status))) {
            return errorResponse(res, "Status must be either 1 or 2", 400);
        }

        // Validate Observation
        if (
            updateObservation &&
            Observation !== null &&
            (Observation === "" || !Number.isFinite(Number(Observation)))
        ) {
            return errorResponse(res, "Observation must be a valid number or null", 400);
        }

        const request = new sql.Request();

        request.input("CheckPointId", sql.Int, CheckPointId);

        request.input(
            "Remark",
            sql.NVarChar(sql.MAX),
            updateRemark ? Remark : null
        );

        request.input(
            "Observation",
            sql.Decimal(5, 2),
            updateObservation && Observation !== null
                ? Number(Observation)
                : null
        );

        request.input(
            "Status",
            sql.Int,
            updateStatus ? Number(Status) : null
        );

        request.input("UpdateRemark", sql.Bit, updateRemark ? 1 : 0);
        request.input("UpdateObservation", sql.Bit, updateObservation ? 1 : 0);
        request.input("UpdateStatus", sql.Bit, updateStatus ? 1 : 0);

        const result = await request.execute(
            "Tab_PM_UpdateExecutionCheckPoint"
        );

        return successResponse(
            res,
            result.recordset,
            "Checkpoint updated successfully"
        );

    } catch (error) {
        console.error("updatePMExecutionCheckPoint Error:", error);
        return errorResponse(res, error.message, 500);
    }
};
//submit checkpoints

const submitPMChecklistForApproval = async (req, res) => {
    try {
        const {
            CheckListID,
            EquipmentID,
            CheckListInstanceID,
            ExecutedBy,
            ExecutedByRemark
        } = req.body;

        if (
            CheckListID == null ||
            EquipmentID == null ||
            CheckListInstanceID == null ||
            ExecutedBy == null ||
            ExecutedBy === ""
        ) {
            return errorResponse(
                res,
                "CheckListID, EquipmentID, CheckListInstanceID and ExecutedBy are required",
                400
            );
        }

        const request = new sql.Request();

        request.input("CheckListID", sql.Int, CheckListID);
        request.input("EquipmentID", sql.Int, EquipmentID);
        request.input("CheckListInstanceID", sql.Int, CheckListInstanceID);

        request.input(
            "ExecutedBy",
            sql.NVarChar(50),
            ExecutedBy
        );

        request.input(
            "ExecutedByRemark",
            sql.NVarChar(sql.MAX),
            ExecutedByRemark ?? null
        );

        const result = await request.execute(
            "Tab_PM_SubmitChecklistForApproval"
        );

        return successResponse(
            res,
            result.recordset,
            "PM checklist submitted successfully for approval"
        );

    } catch (error) {
        console.error("submitPMChecklistForApproval Error:", error);

        return errorResponse(res, error.message, 500);
    }
};

//----------------Approval Checklist screen---------
const getPMChecklistHistory = async (req, res) => {
    try {
        const request = new sql.Request();

        const result = await request.query(`
            SELECT
                H.UID,
                H.CheckListID,
                H.EquipmentID,
                E.EquipmentName,
                H.CheckListInstanceID,
                H.CheckListName,
                H.CheckListDesc,
                H.PMStatus,
                H.PMExecutionStatus,
                H.ExecutedStartTime,
                H.ExecutedBy,
                H.ExecutedEndTime,
                H.ExecutedByRemark,
                H.ApprovedBy,
                H.ApprovedTime,
                H.ApprovedByRemark
            FROM dbo.Maint_Execute_PMChecklist_History H
            LEFT JOIN dbo.Config_Equipment E
                ON H.EquipmentID = E.EquipmentID
            ORDER BY H.UID DESC;
        `);

        return successResponse(
            res,
            result.recordset,
            "PM checklist history fetched successfully"
        );

    } catch (error) {
        console.error("getPMChecklistHistory Error:", error);
        return errorResponse(res, error.message, 500);
    }
};
//approve btn api

const approvePMChecklist = async (req, res) => {
    try {
        const {
            CheckListID,
            EquipmentID,
            CheckListInstanceID,
            ApprovedBy,
            ApprovedByRemark
        } = req.body;

        if (
            CheckListID == null ||
            EquipmentID == null ||
            CheckListInstanceID == null ||
            ApprovedBy == null ||
            ApprovedBy === ""
        ) {
            return errorResponse(
                res,
                "CheckListID, EquipmentID, CheckListInstanceID and ApprovedBy are required",
                400
            );
        }

        const request = new sql.Request();

        request.input("CheckListID", sql.Int, CheckListID);
        request.input("EquipmentID", sql.Int, EquipmentID);
        request.input(
            "CheckListInstanceID",
            sql.Int,
            CheckListInstanceID
        );

        request.input(
            "ApprovedBy",
            sql.NVarChar(50),
            ApprovedBy
        );

        request.input(
            "ApprovedByRemark",
            sql.NVarChar(sql.MAX),
            ApprovedByRemark ?? null
        );

        const result = await request.execute(
            "Tab_PM_ApproveChecklist"
        );

        return successResponse(
            res,
            result.recordset,
            "PM checklist approved successfully"
        );

    } catch (error) {
        console.error("approvePMChecklist Error:", error);

        return errorResponse(res, error.message, 500);
    }
};
//---------------------Approval Checkpoint Screen-----

const getPMExecutionCheckPointHistory = async (req, res) => {
    try {
        const request = new sql.Request();

        const result = await request.query(`
            SELECT
                CheckPointId,
                CheckListId,
                CheckPointName,
                Remark,
                Observation,
                Status,
                [TimeStamp],
                UserID
            FROM dbo.Maint_Execute_PMCheckPoint_History
            ORDER BY CheckPointId DESC;
        `);

        return successResponse(
            res,
            result.recordset,
            "PM checkpoint history fetched successfully"
        );

    } catch (error) {
        console.error("getPMExecutionCheckPointHistory Error:", error);

        return errorResponse(res, error.message, 500);
    }
};

// update remark,status,value

const updatePMExecutionCheckPointHistory = async (req, res) => {
    try {
        const {
            CheckPointId,
            Remark,
            Observation,
            Status
        } = req.body;

        if (CheckPointId == null) {
            return errorResponse(res, "CheckPointId is required", 400);
        }

        // Identify which fields are supplied
        const updateRemark = Object.prototype.hasOwnProperty.call(req.body, "Remark");
        const updateObservation = Object.prototype.hasOwnProperty.call(req.body, "Observation");
        const updateStatus = Object.prototype.hasOwnProperty.call(req.body, "Status");

        if (!updateRemark && !updateObservation && !updateStatus) {
            return errorResponse(
                res,
                "Please provide Remark, Observation or Status to update",
                400
            );
        }

        // Validate Status
        if (updateStatus && ![1, 2].includes(Number(Status))) {
            return errorResponse(res, "Status must be either 1 or 2", 400);
        }

        // Validate Observation
        if (
            updateObservation &&
            Observation !== null &&
            (Observation === "" || !Number.isFinite(Number(Observation)))
        ) {
            return errorResponse(
                res,
                "Observation must be a valid number or null",
                400
            );
        }

        const request = new sql.Request();

        request.input("CheckPointId", sql.Int, CheckPointId);

        request.input(
            "Remark",
            sql.NVarChar(sql.MAX),
            updateRemark ? Remark : null
        );

        request.input(
            "Observation",
            sql.Decimal(5, 2),
            updateObservation && Observation !== null
                ? Number(Observation)
                : null
        );

        request.input(
            "Status",
            sql.Int,
            updateStatus ? Number(Status) : null
        );

        request.input("UpdateRemark", sql.Bit, updateRemark ? 1 : 0);
        request.input("UpdateObservation", sql.Bit, updateObservation ? 1 : 0);
        request.input("UpdateStatus", sql.Bit, updateStatus ? 1 : 0);

        const result = await request.execute(
            "Tab_PM_UpdateExecutionCheckPointHistory"
        );

        return successResponse(
            res,
            result.recordset,
            "Checkpoint history updated successfully"
        );

    } catch (error) {
        console.error("updatePMExecutionCheckPointHistory Error:", error);
        return errorResponse(res, error.message, 500);
    }
};


module.exports = {
  getExecutionChecklist,
  startPMChecklistExecution,
  getPMExecutionCheckPoints,
  updatePMExecutionCheckPoint,
  submitPMChecklistForApproval,
  getPMChecklistHistory,
  approvePMChecklist,
  getPMExecutionCheckPointHistory,
  updatePMExecutionCheckPointHistory

};
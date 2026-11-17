const { sql } = require("../../config/db");
const {
  successResponse,
  errorResponse,
} = require("../../middlewares/responseHandler");

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



module.exports = {
  getExecutionChecklist,
  startPMChecklistExecution

};
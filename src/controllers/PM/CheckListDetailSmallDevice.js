const { sql } = require("../../config/db");
const {
  successResponse,
  errorResponse,
} = require("../../middlewares/responseHandler");

//CheckListDetail screen to get the List for Schedule it

const getAllPMChecklists = async (req, res) => {
  try {
    const request = new sql.Request();

    const result = await request.query(`
      SELECT
        M.UID,
        M.EquipmentID,
        E.EquipmentName,
        M.CheckListId,
        C.CheckListName,
        M.CheckListInstanceID,
        M.FrequencyType,
        M.LastPMDate,
        M.LastPMCount,
        M.NextPMDate,
        M.NextPMCount,
        M.DaysToNextPM,
        M.CountToNextPM,
        M.PMStatus,
        M.PMExecutionStatus,
        M.AlertLimit,
        M.WarningLimit,
        M.AlarmLimit

      FROM Maint_PM_Monitoring M

      INNER JOIN Config_Equipment E
        ON M.EquipmentID = E.EquipmentID

      INNER JOIN Config_PMCheckList C
        ON M.CheckListId = C.CheckListId

      ORDER BY M.UID DESC
    `);

    return successResponse(
      res,
      result.recordset,
      "PM checklists fetched successfully"
    );

  } catch (error) {
    console.error(
      "Error fetching PM checklists:",
      error
    );

    return errorResponse(
      res,
      error.message,
      500
    );
  }
};


//Value that Machine with Checklist and if it is validated so move the checklist to execution

const moveChecklistToExecution = async (req, res) => {
  try {

    const { EquipmentID, CheckListID } = req.body;

    if (!EquipmentID || !CheckListID) {
      return errorResponse(
        res,
        "EquipmentID and CheckListID are required",
        400
      );
    }

    const request = new sql.Request();

    request.input(
      'EquipmentID',
      sql.Int,
      EquipmentID
    );

    request.input(
      'CheckListID',
      sql.Int,
      CheckListID
    );

    const result = await request.execute(
      'Tab_PM_MoveChecklistToExecution'
    );

    const response = result.recordset[0];

    if (response.StatusCode === 0) {
      return errorResponse(
        res,
        response.Message,
        400
      );
    }

    return successResponse(
      res,
      result.recordset,
      response.Message
    );

  } catch (error) {

    console.error(
      "Error moving PM checklist to execution:",
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
  getAllPMChecklists,
  moveChecklistToExecution
}
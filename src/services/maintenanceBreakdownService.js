const repository = require(
  "../repositories/maintenanceBreakdownRepository"
);

const getAssignedBreakdowns = async (userId) => {
  if (!userId) {
    throw new Error("UserID is required.");
  }

  const result = await repository.getAssignedBreakdowns(userId);
  return result.recordset;
};

const assignBreakdown = async (payload) => {
  const { breakdownId, lossCode, subLossCode, prodRemark, userId } =
    payload;

  if (!breakdownId || lossCode == null || !userId) {
    throw new Error(
      "BreakdownID, LossCode and UserID are required."
    );
  }

  return repository.assignBreakdown({
    breakdownId,
    lossCode,
    subLossCode,
    prodRemark,
    userId
  });
};

const closeBreakdown = async (payload) => {
  const {
    breakdownId,
    actionType,
    actionTakenRemark,
    permanentResolution,
    targetDate,
    userId,
    lineId,
    role
  } = payload;

  if (!breakdownId || !actionType || !userId || lineId == null || !role) {
    throw new Error(
      "BreakdownID, ActionType, UserID, LineID and Role are required."
    );
  }

  if (!["permanent", "temp"].includes(actionType.toLowerCase())) {
    throw new Error("ActionType must be Permanent or Temp.");
  }

  if (
    actionType.toLowerCase() === "permanent" &&
    !permanentResolution
  ) {
    throw new Error("PermanentResolution is required for permanent closure.");
  }

  return repository.closeBreakdown(payload);
};

const createBreakdown = async (payload) => {
  const {
    bdType,
    lineId,
    stationId,
    equipmentId,
    userId,
    role
  } = payload;

  if (
    bdType == null ||
    lineId == null ||
    stationId == null ||
    equipmentId == null ||
    !userId ||
    !role
  ) {
    throw new Error(
      "BDType, LineID, StationID, EquipmentID, UserID and Role are required."
    );
  }

  return repository.createBreakdown(payload);
};

module.exports = {
  getAssignedBreakdowns,
  assignBreakdown,
  closeBreakdown,
  createBreakdown
};
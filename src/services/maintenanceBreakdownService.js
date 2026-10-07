const repository = require("../repositories/maintenanceBreakdownRepository");

const getAssignedBreakdowns = async (userId) => {
  if (!userId) {
    throw new Error("UserID is required.");
  }

  const result = await repository.getAssignedBreakdowns(userId);
  return result;
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
  const { breakdownId, resolutionType, actionTakenRemark, permanentResolution, userId } = payload;

  if (!breakdownId || !userId || !actionTakenRemark) {
    throw new Error("BreakdownID, UserID and ActionTakenRemark are required.");
  }

  if (![1, 2].includes(resolutionType)) {
    throw new Error("ResolutionType must be 1 (Permanent) or 2 (Temporary).");
  }

  if (resolutionType === 1 && !permanentResolution) {
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
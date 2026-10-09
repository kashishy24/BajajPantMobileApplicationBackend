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
  }[]

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
    bdType, lineId, stationId, equipmentId,
    lossCode, subLossCode, remark, assignEngineer,
    userId, raiseToDepartment, raiseToRole
  } = payload;

  // required
  if (
    bdType == null || lineId == null || stationId == null ||
    equipmentId == null || !userId || !raiseToDepartment || !raiseToRole
  ) {
    throw new Error(
      "BDType, LineID, StationID, EquipmentID, UserID, RaiseToDepartment and RaiseToRole are required."
    );
  }

  if (![2, 3].includes(bdType)) {
    throw new Error("BDType must be 2 (Manual Prod) or 3 (Manual Maint).");
  }

  // optional, but valid when present
  if (lossCode != null && !Number.isInteger(lossCode)) {
    throw new Error("LossCode must be an integer.");
  }

  if (subLossCode != null && !Number.isInteger(subLossCode)) {
    throw new Error("SubLossCode must be an integer.");
  }

  if (subLossCode != null && lossCode == null) {
    throw new Error("LossCode is required when SubLossCode is provided.");
  }

  if (remark != null && typeof remark !== "string") {
    throw new Error("Remark must be a string.");
  }

  if (assignEngineer != null && typeof assignEngineer !== "string") {
    throw new Error("AssignEngineer must be a string.");
  }

  // normalize before it reaches the repository
  return repository.createBreakdown({
    ...payload,
    remark: remark?.trim() || null,
    assignEngineer: assignEngineer?.trim() || null
  });
};

// const createBreakdown = async (payload) => {
//   const {
//     bdType,
//     lineId,
//     stationId,
//     equipmentId,
//     userId,
//     role
//   } = payload;

//   if (
//     bdType == null ||
//     lineId == null ||
//     stationId == null ||
//     equipmentId == null ||
//     !userId ||
//     !role
//   ) {
//     throw new Error(
//       "BDType, LineID, StationID, EquipmentID, UserID and Role are required."
//     );
//   }

//   return repository.createBreakdown(payload);
// };

module.exports = {
  getAssignedBreakdowns,
  assignBreakdown,
  closeBreakdown,
  createBreakdown
};
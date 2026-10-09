const service = require(
  "../services/maintenanceBreakdownService"
);

const {
    successResponse,
    errorResponse
} = require("../middlewares/responseHandler");

const getAssignedBreakdowns = async (req, res) => {
  try {
    const data = await service.getAssignedBreakdowns(
      req.params.userId
    );

    return successResponse(res, data, "Assigned breakdowns fetched successfully.");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const assignBreakdown = async (req, res) => {
  try {
    const data = await service.assignBreakdown(req.body);

    return successResponse(
      res,
      data,
      "Breakdown assigned successfully."
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const closeBreakdown = async (req, res) => {
  try {
    const data = await service.closeBreakdown(req.body);

    return successResponse(
      res,
      data,
      "Breakdown resolved successfully."
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const createBreakdown = async (req, res) => {
  try {
    const data = await service.createBreakdown(req.body);

    return successResponse(
      res,
      data,
      "Maintenance breakdown created successfully."
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getOpenBreakdowns = async (req, res) => {
  try {
    const data = await service.getOpenBreakdowns(req.query);
    return successResponse(res, data, "Open breakdowns fetched successfully.");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getBreakdownById = async (req, res) => {
  try {
    const data = await service.getBreakdownById(req.params.breakdownId);
    return successResponse(res, data, "Breakdown details fetched successfully.");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getLossCodes = async (req, res) => {
  try {
    const data = await service.getLossCodes();
    return successResponse(res, data, "Loss codes fetched successfully.");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getSubLossCodes = async (req, res) => {
  try {
    const data = await service.getSubLossCodes(req.params.lossId);
    return successResponse(res, data, "Sub loss codes fetched successfully.");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  getAssignedBreakdowns,
  assignBreakdown,
  closeBreakdown,
  createBreakdown,
  getOpenBreakdowns,
  getBreakdownById,
  getLossCodes,
  getSubLossCodes
};
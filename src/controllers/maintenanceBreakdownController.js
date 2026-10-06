const service = require(
  "../services/maintenanceBreakdownService"
);

// Replace these imports with the exact helper paths used in your project.
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

module.exports = {
  getAssignedBreakdowns,
  assignBreakdown,
  closeBreakdown,
  createBreakdown
};
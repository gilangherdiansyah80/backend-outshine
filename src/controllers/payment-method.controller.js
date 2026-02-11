const paymentMethodService = require("../services/payment-method.service");
const { successResponse, errorResponse } = require("../utils/response.util");

const getAllMethods = async (req, res) => {
  try {
    // Optional query param: ?active=true
    const activeOnly = req.query.active === "true";
    let methods;
    if (activeOnly) {
      methods = await paymentMethodService.getActiveMethods();
    } else {
      methods = await paymentMethodService.getAllMethods();
    }
    return successResponse(res, methods, "Payment methods retrieved");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const getMethodById = async (req, res) => {
  try {
    const { id } = req.params;
    const method = await paymentMethodService.getMethodById(id);
    if (!method) return errorResponse(res, "Payment method not found", 404);
    return successResponse(res, method, "Payment method retrieved");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const createMethod = async (req, res) => {
  try {
    const method = await paymentMethodService.createMethod(req.body);
    return successResponse(res, method, "Payment method created", 201);
  } catch (error) {
    // Handle unique violation for code
    if (error.code === "23505") {
      return errorResponse(res, "Payment method code already exists", 400);
    }
    return errorResponse(res, error.message, 500);
  }
};

const updateMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const method = await paymentMethodService.updateMethod(id, req.body);
    if (!method) return errorResponse(res, "Payment method not found", 404);
    return successResponse(res, method, "Payment method updated");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const deleteMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const method = await paymentMethodService.deleteMethod(id);
    if (!method) return errorResponse(res, "Payment method not found", 404);
    return successResponse(res, null, "Payment method deleted");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getAllMethods,
  getMethodById,
  createMethod,
  updateMethod,
  deleteMethod,
};

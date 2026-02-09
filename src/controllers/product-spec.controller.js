const productSpecService = require("../services/product-spec.service");
const { successResponse, errorResponse } = require("../utils/response.util");

const getSpecsByProduct = async (req, res) => {
  try {
    const { id } = req.params; // Product ID
    const specs = await productSpecService.getSpecsByProduct(id);
    return successResponse(res, specs, "Specifications retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const createSpec = async (req, res) => {
  try {
    const { id } = req.params; // Product ID
    const specData = req.body;

    if (!specData.key || !specData.value) {
      return errorResponse(res, "Key and Value are required", 400);
    }

    const newSpec = await productSpecService.createSpec(id, specData);
    return successResponse(
      res,
      newSpec,
      "Specification created successfully",
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const updateSpec = async (req, res) => {
  try {
    const { id } = req.params; // Spec ID
    const specData = req.body;

    const updatedSpec = await productSpecService.updateSpec(id, specData);
    return successResponse(
      res,
      updatedSpec,
      "Specification updated successfully",
    );
  } catch (error) {
    const statusCode = error.message === "Specification not found" ? 404 : 500;
    return errorResponse(res, error.message, statusCode);
  }
};

const deleteSpec = async (req, res) => {
  try {
    const { id } = req.params; // Spec ID
    await productSpecService.deleteSpec(id);
    return successResponse(res, null, "Specification deleted successfully");
  } catch (error) {
    const statusCode = error.message === "Specification not found" ? 404 : 500;
    return errorResponse(res, error.message, statusCode);
  }
};

module.exports = {
  getSpecsByProduct,
  createSpec,
  updateSpec,
  deleteSpec,
};

const sizeService = require("../services/size.service");
const { successResponse, errorResponse } = require("../utils/response.util");

const getAllSizes = async (req, res) => {
  try {
    const sizes = await sizeService.getAllSizes();
    return successResponse(res, sizes, "Sizes retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const createSize = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return errorResponse(res, "Name is required", 400);

    const newSize = await sizeService.createSize(name);
    return successResponse(res, newSize, "Size created successfully", 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const getSizesByProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const sizes = await sizeService.getSizesByProductId(id);
    return successResponse(res, sizes, "Product sizes retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const addProductSize = async (req, res) => {
  try {
    const { id } = req.params; // Product ID
    const { sizeId, stock } = req.body;

    if (!sizeId || stock === undefined) {
      return errorResponse(res, "sizeId and stock are required", 400);
    }

    const productSize = await sizeService.addProductSize(id, sizeId, stock);
    return successResponse(
      res,
      productSize,
      "Size added to product successfully",
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const updateProductSize = async (req, res) => {
  try {
    const { id, sizeId } = req.params; // Product ID, Size ID
    const { stock } = req.body;

    if (stock === undefined) {
      return errorResponse(res, "stock is required", 400);
    }

    const updated = await sizeService.updateProductSizeStock(id, sizeId, stock);
    return successResponse(res, updated, "Product size updated successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const updateSize = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return errorResponse(res, "Name is required", 400);

    const updated = await sizeService.updateSize(id, name);
    return successResponse(res, updated, "Size updated successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const deleteSize = async (req, res) => {
  try {
    const { id } = req.params;
    await sizeService.deleteSize(id);
    return successResponse(res, null, "Size deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getAllSizes,
  createSize,
  getSizesByProduct,
  addProductSize,
  updateProductSize,
  updateSize,
  deleteSize,
};

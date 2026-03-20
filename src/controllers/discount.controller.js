const discountService = require("../services/discount.service");
const { successResponse, errorResponse } = require("../utils/response.util");

const getDiscountsByProduct = async (req, res) => {
  try {
    const { id } = req.params; // Product ID, mapped from route /products/:id/discount
    const discounts = await discountService.getDiscountByProductId(id);
    return successResponse(res, discounts, "Discounts retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const getAllDiscounts = async (req, res) => {
  try {
    const discounts = await discountService.getAllDiscounts();
    return successResponse(res, discounts, "All discounts retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const createDiscount = async (req, res) => {
  try {
    const { id } = req.params; // Product ID
    const discountData = req.body;

    if (!discountData.type || !discountData.value) {
      return errorResponse(
        res,
        "Type (percent/fixed) and Value are required",
        400,
      );
    }

    const newDiscount = await discountService.createDiscount(id, discountData);
    return successResponse(
      res,
      newDiscount,
      "Discount created successfully",
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const updateDiscount = async (req, res) => {
  try {
    const { id } = req.params; // Discount ID
    const discountData = req.body;
    const updatedDiscount = await discountService.updateDiscount(
      id,
      discountData,
    );
    return successResponse(
      res,
      updatedDiscount,
      "Discount updated successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const deleteDiscount = async (req, res) => {
  try {
    const { id } = req.params; // Discount ID
    await discountService.deleteDiscount(id);
    return successResponse(res, null, "Discount deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getDiscountsByProduct,
  getAllDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
};

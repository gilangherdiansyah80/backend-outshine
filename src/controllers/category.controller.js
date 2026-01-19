const categoryService = require("../services/category.service");
const { successResponse, errorResponse } = require("../utils/response.util");

const getAllCategories = async (req, res) => {
  try {
    const categories = await categoryService.getAllCategories();
    return successResponse(
      res,
      categories,
      "Categories retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await categoryService.getCategoryById(id);
    return successResponse(res, category, "Category retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message, 404);
  }
};

const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const file = req.file;

    if (!name) {
      return errorResponse(res, "Name is required", 400);
    }

    const newCategory = await categoryService.createCategory({ name }, file);
    return successResponse(
      res,
      newCategory,
      "Category created successfully",
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const file = req.file;

    const updatedCategory = await categoryService.updateCategory(
      id,
      { name },
      file,
    );
    return successResponse(
      res,
      updatedCategory,
      "Category updated successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await categoryService.deleteCategory(id);
    return successResponse(res, null, "Category deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};

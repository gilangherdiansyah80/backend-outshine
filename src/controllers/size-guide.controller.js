const sizeGuideService = require("../services/size-guide.service");
const { successResponse, errorResponse } = require("../utils/response.util");

const getSizeGuideByProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const guides = await sizeGuideService.getSizeGuideByProductId(id);
    return successResponse(res, guides, "Size guides retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const createSizeGuide = async (req, res) => {
  try {
    const { id } = req.params; // Product ID
    const { description } = req.body;
    const file = req.file;

    const newGuide = await sizeGuideService.createSizeGuide(
      id,
      file,
      description,
    );
    return successResponse(
      res,
      newGuide,
      "Size guide created successfully",
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const updateSizeGuide = async (req, res) => {
  try {
    const { id } = req.params; // Size Guide ID
    const { description } = req.body;
    const file = req.file;

    const updatedGuide = await sizeGuideService.updateSizeGuide(
      id,
      file,
      description,
    );
    return successResponse(
      res,
      updatedGuide,
      "Size guide updated successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const deleteSizeGuide = async (req, res) => {
  try {
    const { id } = req.params;
    await sizeGuideService.deleteSizeGuide(id);
    return successResponse(res, null, "Size guide deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getSizeGuideByProduct,
  createSizeGuide,
  updateSizeGuide,
  deleteSizeGuide,
};

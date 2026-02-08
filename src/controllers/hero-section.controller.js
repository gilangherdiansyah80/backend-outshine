const heroSectionService = require("../services/hero-section.service");
const { successResponse, errorResponse } = require("../utils/response.util");

const getAllHeroSections = async (req, res) => {
  try {
    const heroSections = await heroSectionService.getAllHeroSections();
    return successResponse(
      res,
      heroSections,
      "Hero sections retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const getHeroSectionById = async (req, res) => {
  try {
    const { id } = req.params;
    const heroSection = await heroSectionService.getHeroSectionById(id);
    return successResponse(
      res,
      heroSection,
      "Hero section retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message, 404);
  }
};

const createHeroSection = async (req, res) => {
  try {
    const heroData = req.body;
    const file = req.file;

    const newHeroSection = await heroSectionService.createHeroSection(
      heroData,
      file,
    );
    return successResponse(
      res,
      newHeroSection,
      "Hero section created successfully",
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const updateHeroSection = async (req, res) => {
  try {
    const { id } = req.params;
    const heroData = req.body;
    const file = req.file;

    const updatedHeroSection = await heroSectionService.updateHeroSection(
      id,
      heroData,
      file,
    );
    return successResponse(
      res,
      updatedHeroSection,
      "Hero section updated successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const deleteHeroSection = async (req, res) => {
  try {
    const { id } = req.params;
    await heroSectionService.deleteHeroSection(id);
    return successResponse(res, null, "Hero section deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getAllHeroSections,
  getHeroSectionById,
  createHeroSection,
  updateHeroSection,
  deleteHeroSection,
};

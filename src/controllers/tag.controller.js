const tagService = require("../services/tag.service");
const { successResponse, errorResponse } = require("../utils/response.util");

const getAllTags = async (req, res) => {
  try {
    const tags = await tagService.getAllTags();
    return successResponse(res, tags, "Tags retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const createTag = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return errorResponse(res, "Tag name is required", 400);

    const newTag = await tagService.createTag(name);
    return successResponse(res, newTag, "Tag created successfully", 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const updateTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return errorResponse(res, "Tag name is required", 400);

    const updatedTag = await tagService.updateTag(id, name);
    return successResponse(res, updatedTag, "Tag updated successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const deleteTag = async (req, res) => {
  try {
    const { id } = req.params;
    await tagService.deleteTag(id);
    return successResponse(res, null, "Tag deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getAllTags,
  createTag,
  updateTag,
  deleteTag,
};

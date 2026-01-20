const collectionService = require("../services/collection.service");
const { successResponse, errorResponse } = require("../utils/response.util");

const getCollections = async (req, res) => {
  try {
    const userId = req.user.id;
    const collections = await collectionService.getUserCollections(userId);
    return successResponse(
      res,
      collections,
      "Collections retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const createCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;
    if (!name) return errorResponse(res, "Collection name is required", 400);

    const newCollection = await collectionService.createCollection(
      userId,
      name,
    );
    return successResponse(
      res,
      newCollection,
      "Collection created successfully",
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const deleteCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await collectionService.deleteCollection(userId, id);
    return successResponse(res, null, "Collection deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const getCollectionProducts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const products = await collectionService.getCollectionProducts(userId, id);
    return successResponse(
      res,
      products,
      "Collection products retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const addProductToCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, productId } = req.params;
    const item = await collectionService.addProductToCollection(
      userId,
      id,
      productId,
    );
    return successResponse(res, item, "Product added to collection", 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const removeProductFromCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, productId } = req.params;
    await collectionService.removeProductFromCollection(userId, id, productId);
    return successResponse(res, null, "Product removed from collection");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getCollections,
  createCollection,
  deleteCollection,
  getCollectionProducts,
  addProductToCollection,
  removeProductFromCollection,
};

const productService = require("../services/product.service");
const tagService = require("../services/tag.service");
const { successResponse, errorResponse } = require("../utils/response.util");

const getAllProducts = async (req, res) => {
  try {
    const filters = req.query; // categoryId, search
    const products = await productService.getAllProducts(filters);
    return successResponse(res, products, "Products retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    // req.user might be undefined if route is public.
    // We need to support optional auth if getting public product detail but want wishlist context?
    // Usually standard public endpoints don't have user info unless token is passed.
    // If the route allows optional auth, we need to handle that middleware-side or just check req.header.
    // Assuming authMiddleware might populate req.user if present.
    // BUT product routes for GET /:id are likely public.
    // If we want wishlist info, frontend MUST send token even for public GET if they want that context.
    const userId = req.user ? req.user.id : null;

    const product = await productService.getProductById(id, userId);
    return successResponse(res, product, "Product retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message, 404);
  }
};

const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    // Basic validation
    if (!productData.name || !productData.price) {
      return errorResponse(res, "Name and Price are required", 400);
    }

    const newProduct = await productService.createProduct(productData);
    return successResponse(
      res,
      newProduct,
      "Product created successfully",
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productData = req.body;
    const updatedProduct = await productService.updateProduct(id, productData);
    return successResponse(res, updatedProduct, "Product updated successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await productService.deleteProduct(id);
    return successResponse(res, null, "Product deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const addProductImage = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;
    const { isPrimary } = req.body; // 'true' or 'false'

    if (!file) return errorResponse(res, "Image file is required", 400);

    const newImage = await productService.addProductImage(
      id,
      file,
      isPrimary === "true",
    );
    return successResponse(res, newImage, "Image added successfully", 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const deleteProductImage = async (req, res) => {
  try {
    const { id } = req.params; // Image ID
    await productService.deleteProductImage(id);
    return successResponse(res, null, "Image deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const setPrimaryImage = async (req, res) => {
  try {
    const { id } = req.params; // Image ID
    await productService.setPrimaryImage(id);
    return successResponse(res, null, "Primary image updated successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const addProductTag = async (req, res) => {
  try {
    const { id } = req.params; // Product ID
    const { tagId } = req.body;

    if (!tagId) return errorResponse(res, "Tag ID is required", 400);

    const result = await tagService.addProductTag(id, tagId);
    return successResponse(
      res,
      result,
      "Tag associated with product successfully",
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const removeProductTag = async (req, res) => {
  try {
    const { id, tagId } = req.params;
    await tagService.removeProductTag(id, tagId);
    return successResponse(res, null, "Tag removed from product successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductImage,
  deleteProductImage,
  setPrimaryImage,
  addProductTag,
  removeProductTag,
};

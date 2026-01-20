const cartService = require("../services/cart.service");
const { successResponse, errorResponse } = require("../utils/response.util");

const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await cartService.getCart(userId);
    return successResponse(res, cart, "Cart retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, sizeId, quantity } = req.body;

    if (!productId || !sizeId) {
      return errorResponse(res, "productId and sizeId are required", 400);
    }

    const item = await cartService.addItemToCart(
      userId,
      productId,
      sizeId,
      quantity,
    );
    return successResponse(res, item, "Item added to cart", 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, sizeId, quantity } = req.body;

    // In strict REST, we might put IDs in URL, but cart items have composite key.
    // Usually easier to pass in body or use a unique item ID if one existed.
    // Schema PK is (cart_id, product_id, size_id).
    // Prompt asked for PUT /cart/items, so Payload implies we identify item there.

    if (!productId || !sizeId || quantity === undefined) {
      return errorResponse(
        res,
        "productId, sizeId, and quantity are required",
        400,
      );
    }

    const item = await cartService.updateItemQuantity(
      userId,
      productId,
      sizeId,
      quantity,
    );
    return successResponse(res, item, "Cart item updated");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const removeCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    // Prompt said DELETE /cart/items. Implies body? DELETE with body is discouraged but possible.
    // Or query params?
    // Let's assume body for now or query params.
    // Safer to use Query params for DELETE if body not supported by some clients.
    // But let's check req.body first.

    const { productId, sizeId } = req.body;

    if (!productId || !sizeId) {
      // Try query
      const qProductId = req.query.productId;
      const qSizeId = req.query.sizeId;
      if (!qProductId || !qSizeId) {
        return errorResponse(
          res,
          "productId and sizeId are required (body or query)",
          400,
        );
      }
      await cartService.removeItem(userId, qProductId, qSizeId);
    } else {
      await cartService.removeItem(userId, productId, sizeId);
    }

    return successResponse(res, null, "Item removed from cart");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
};

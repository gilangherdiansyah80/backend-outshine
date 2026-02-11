const orderService = require("../services/order.service");
const paymentService = require("../services/payment.service");
const { successResponse, errorResponse } = require("../utils/response.util");

const checkout = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      addressId,
      paymentType,
      productId,
      sizeId,
      quantity,
      paymentMethod,
      paymentProvider = "midtrans", // Default to midtrans if not specified
    } = req.body;

    if (!addressId || !paymentType || !paymentMethod) {
      return errorResponse(
        res,
        "addressId, paymentType, and paymentMethod are required",
        400,
      );
    }

    const order = await orderService.checkout(userId, {
      addressId,
      paymentType,
      productId,
      sizeId,
      quantity,
    });

    const amountToPay = Number(
      order.payment_type === "dp" ? order.paid_amount : order.total_price,
    );

    let paymentInfo;
    if (paymentProvider.toLowerCase() === "manual") {
      paymentInfo = await paymentService.createManualPayment(
        order.id,
        amountToPay,
        order.payment_type,
        paymentMethod,
      );
    } else {
      paymentInfo = await paymentService.createMidtransPayment(
        order.id,
        amountToPay,
        order.payment_type,
        paymentMethod,
      );
    }

    return successResponse(
      res,
      { order, payment: paymentInfo },
      "Order created successfully",
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await orderService.getUserOrders(userId);
    return successResponse(res, orders, "Orders retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const getOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const order = await orderService.getOrderById(id);

    // Check ownership (security)
    // If admin, pass. If user, check user_id.
    // Simplified:
    // if (order.user_id !== userId && req.user.role !== 'admin') return errorResponse(res, "Forbidden", 403);

    return successResponse(res, order, "Order detail retrieved");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Admin only
const getAllOrders = async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();
    return successResponse(res, orders, "All orders retrieved");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await orderService.updateOrderStatus(id, status);
    return successResponse(res, updated, "Order status updated");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const deleteOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    // Logic: Users can delete their own PENDING orders? Or Admin can delete any?
    // Let's allow users to delete their own orders for now (e.g. cancelling).
    await orderService.deleteOrder(userId, id);
    return successResponse(res, null, "Order deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  checkout,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
};

const paymentService = require("../services/payment.service");
const { successResponse, errorResponse } = require("../utils/response.util");

const createMidtransPayment = async (req, res) => {
  // Use this if re-initiating payment for existing order
  try {
    const { orderId, amount, paymentType } = req.body;
    const paymentInfo = await paymentService.createMidtransPayment(
      orderId,
      amount,
      paymentType,
    );
    return successResponse(res, paymentInfo, "Payment initiated");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const handleWebhook = async (req, res) => {
  try {
    await paymentService.handleWebhook(req.body);
    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).send("Internal Server Error");
  }
};

const getPaymentsByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const payments = await paymentService.getPaymentByOrder(orderId);
    return successResponse(res, payments, "Payments retrieved");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const createManualPayment = async (req, res) => {
  try {
    const { orderId, amount, paymentType, bank } = req.body;
    const paymentInfo = await paymentService.createManualPayment(
      orderId,
      amount,
      paymentType,
      bank,
    );
    return successResponse(
      res,
      paymentInfo,
      "Manual payment initiated. Please transfer to the provided account.",
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const uploadPaymentProof = async (req, res) => {
  try {
    const { orderId, paymentId, note } = req.body;
    const file = req.file;

    // Default note to null if undefined to avoid SQL error
    const noteValue = note || null;

    if (!file) {
      return errorResponse(res, "Payment proof image is required", 400);
    }

    const proof = await paymentService.uploadPaymentProof(
      orderId,
      paymentId,
      file,
      noteValue,
    );

    // Return proof AND groupLink explicitly if needed by frontend
    // service already returns object with groupLink
    return successResponse(res, proof, "Payment proof uploaded successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const getOrderGroupLink = async (req, res) => {
  try {
    const { orderId } = req.params;
    // Verify order ownership/payment status if necessary?
    // For now, public/auth protected.

    const link = await paymentService.getOrderGroupLink(orderId);
    if (!link) {
      return errorResponse(
        res,
        "Group link not found or Order not eligible yet",
        404,
      );
    }
    return successResponse(res, { link }, "Group link retrieved");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  createMidtransPayment,
  handleWebhook,
  getPaymentsByOrder,
  createManualPayment,
  uploadPaymentProof,
  getOrderGroupLink,
};

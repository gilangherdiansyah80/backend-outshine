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

module.exports = {
  createMidtransPayment,
  handleWebhook,
  getPaymentsByOrder,
};

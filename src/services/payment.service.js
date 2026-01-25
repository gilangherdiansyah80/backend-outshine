const { sql } = require("../config/database");
const midtransClient = require("midtrans-client");

// Initialize CoreApi
const coreApi = new midtransClient.CoreApi({
  isProduction: process.env.NODE_ENV === "production",
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
});

class PaymentService {
  async createMidtransPayment(orderId, amount, paymentType, paymentMethod) {
    // 1. Create Pending Payment Record first
    const newPayment = await sql`
        INSERT INTO public.payments (order_id, provider, payment_type, status, amount, bank)
        VALUES (${orderId}, 'midtrans', ${paymentType}, 'pending', ${amount}, ${paymentMethod})
        RETURNING *
     `;
    const paymentId = newPayment[0].id;
    const midtransOrderId = `TRX-${paymentId}`;

    // 2. Prepare Base Parameter
    const parameter = {
      payment_type: "", // Will be set based on paymentMethod
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: Math.round(amount),
      },
    };

    // 3. Configure Parameter based on Payment Method
    const method = paymentMethod.toLowerCase();

    if (["bca", "bni", "bri", "permata"].includes(method)) {
      parameter.payment_type = "bank_transfer";
      parameter.bank_transfer = {
        bank: method,
      };
    } else if (method === "qris") {
      parameter.payment_type = "qris";
      parameter.qris = {
        acquirer: "gopay", // Default acquirer for QRIS
      };
    } else if (method === "gopay") {
      parameter.payment_type = "gopay";
      parameter.gopay = {
        enable_callback: true,
        callback_url: process.env.FRONTEND_URL || "https://outshine.id",
      };
    } else if (method === "shopeepay") {
      parameter.payment_type = "shopeepay";
      parameter.shopeepay = {
        callback_url: process.env.FRONTEND_URL || "https://outshine.id",
      };
    } else {
      throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }

    try {
      // 4. Hit Midtrans Core API
      const response = await coreApi.charge(parameter);

      // 5. Extract & Update Payment Details in DB
      let vaNumber = null;
      let paymentCode = null;
      let qrUrl = null;
      let deepLink = null;
      const expiredAt = response.expiry_time;

      if (response.va_numbers) {
        vaNumber = response.va_numbers[0].va_number;
      } else if (response.permata_va_number) {
        vaNumber = response.permata_va_number;
      } else if (response.payment_code) {
        paymentCode = response.payment_code;
      }

      // Handle QRIS/E-Wallet Actions
      if (response.actions) {
        for (const action of response.actions) {
          if (action.name === "generate-qr-code") qrUrl = action.url;
          if (action.name === "deeplink-redirect") deepLink = action.url;
        }
      }

      await sql`
        UPDATE public.payments 
        SET 
          va_number = ${vaNumber},
          payment_code = ${paymentCode},
          payment_payload = ${JSON.stringify(response)},
          expired_at = ${expiredAt},
          gross_amount = ${response.gross_amount},
          transaction_status = ${response.transaction_status || "pending"},
          status = 'pending'
        WHERE id = ${paymentId}
      `;

      // 6. Return Data for Frontend
      return {
        paymentId,
        method: paymentMethod,
        amount,
        vaNumber,
        paymentCode,
        qrUrl,
        deepLink,
        expiredAt,
        instruction: "Please follow the instructions to complete payment",
      };
    } catch (error) {
      await sql`DELETE FROM public.payments WHERE id = ${paymentId}`;
      throw new Error(`Midtrans Error: ${error.message}`);
    }
  }

  async handleWebhook(payload) {
    try {
      const statusResponse = await coreApi.transaction.notification(payload);
      const orderId = statusResponse.order_id;
      const transactionStatus = statusResponse.transaction_status;
      const fraudStatus = statusResponse.fraud_status;

      if (!orderId.startsWith("TRX-")) return false;
      const paymentId = orderId.substring(4);

      let status = "pending";
      if (
        transactionStatus === "capture" ||
        transactionStatus === "settlement"
      ) {
        status = fraudStatus === "challenge" ? "challenge" : "success";
      } else if (["cancel", "deny", "expire"].includes(transactionStatus)) {
        status = "failed";
      }

      const updatedPayment = await sql`
            UPDATE public.payments 
            SET 
              transaction_status = ${transactionStatus},
              status = ${status}, 
              transaction_id = ${statusResponse.transaction_id}
            WHERE id = ${paymentId}
            RETURNING *
        `;

      if (updatedPayment.length > 0 && status === "success") {
        await sql`
            UPDATE public.orders SET status = 'processing' WHERE id = ${updatedPayment[0].order_id}
        `;
      }

      return true;
    } catch (e) {
      console.error("Webhook Error", e);
      return false;
    }
  }

  async getPaymentByOrder(orderId) {
    return await sql`SELECT * FROM public.payments WHERE order_id = ${orderId}`;
  }
}

module.exports = new PaymentService();

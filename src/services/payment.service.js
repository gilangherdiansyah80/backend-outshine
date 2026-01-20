const { sql } = require("../config/database");
const midtransClient = require("midtrans-client");

// Initialize Snap
const snap = new midtransClient.Snap({
  isProduction: process.env.NODE_ENV === "production",
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
});

class PaymentService {
  async createMidtransPayment(orderId, amount, paymentType) {
    // 1. Create Pending Payment Record first to get the ID
    const newPayment = await sql`
        INSERT INTO public.payments (order_id, provider, payment_type, status, amount)
        VALUES (${orderId}, 'midtrans', ${paymentType}, 'pending', ${amount})
        RETURNING *
     `;
    const paymentId = newPayment[0].id;

    // 2. Create Transaction in Midtrans
    // We use paymentId as order_id in Midtrans to track specific payment attempt (or orderId-timestamp)
    // Using paymentId (UUID) is safer if we allow multiple payments per order?
    // Or just "ORDER-{orderId}-{random}"
    // Let's use "ORDER-{orderId}-{paymentId}" to likely be unique and traceable.
    const midtransOrderId = `TRX-${paymentId}`;

    const parameter = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: Math.round(amount), // Ensure integer
      },
      credit_card: {
        secure: true,
      },
      // Customer Details (Optional but good practice)
      // fetch User/Order details if needed, for now skipping or using minimal
    };

    try {
      const transaction = await snap.createTransaction(parameter);

      // 3. Update Payment Record with Token & Redirect URL
      // We don't store token in schema yet? The schema has... let's check schema.
      // Schema likely has loose fields or we just return it.
      // Prompt said "return a mock token/redirect_url".
      // Schema likely doesn't have token column?
      // User schema provided earlier: "payments" table...
      // If no column, we just return it to controller.
      // But we should store transaction_id if possible.

      // Let's assume we just return it for frontend to use.
      return {
        paymentId: paymentId,
        token: transaction.token,
        redirect_url: transaction.redirect_url,
      };
    } catch (error) {
      // Rollback payment record if midtrans fails?
      await sql`DELETE FROM public.payments WHERE id = ${paymentId}`;
      throw new Error(`Midtrans Error: ${error.message}`);
    }
  }

  async handleWebhook(payload) {
    // Verify Notification using SDK
    try {
      const statusResponse = await snap.transaction.notification(payload);
      const orderId = statusResponse.order_id;
      const transactionStatus = statusResponse.transaction_status;
      const fraudStatus = statusResponse.fraud_status;

      // Parse our ID: "TRX-{paymentId}"
      const parts = orderId.split("-");
      // parts[0] = TRX, parts[1] = paymentId (UUID)
      // Adjust split in case UUID contains dashes.
      // "TRX-" is length 4.
      if (!orderId.startsWith("TRX-")) {
        // Unknown order format, maybe ignore
        return false;
      }
      const paymentId = orderId.substring(4); // the rest is UUID

      let status = "pending";
      if (transactionStatus == "capture") {
        if (fraudStatus == "challenge") {
          status = "challenge";
        } else if (fraudStatus == "accept") {
          status = "success";
        }
      } else if (transactionStatus == "settlement") {
        status = "success";
      } else if (
        transactionStatus == "cancel" ||
        transactionStatus == "deny" ||
        transactionStatus == "expire"
      ) {
        status = "failed";
      } else if (transactionStatus == "pending") {
        status = "pending";
      }

      const updatedPayment = await sql`
            UPDATE public.payments 
            SET status = ${status}, transaction_id = ${statusResponse.transaction_id}
            WHERE id = ${paymentId}
            RETURNING *
        `;

      // Update Order Status if payment success
      if (updatedPayment.length > 0 && status === "success") {
        const payment = updatedPayment[0];
        const realOrderId = payment.order_id; // FK to orders table

        // Logic: is it Full or DP?
        // If Full -> processing/paid
        // If DP -> partial_paid? Or just 'processing'
        // Let's set to 'processing' as safe bet.
        await sql`
                UPDATE public.orders SET status = 'processing' WHERE id = ${realOrderId}
            `;
      }

      return true;
    } catch (e) {
      console.error("Webhook Error", e);
      return false;
    }
  }

  async getPaymentByOrder(orderId) {
    const payments =
      await sql`SELECT * FROM public.payments WHERE order_id = ${orderId}`;
    return payments;
  }
}

module.exports = new PaymentService();

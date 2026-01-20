const { sql } = require("../config/database");

class PaymentService {
  async createMidtransPayment(orderId, amount, paymentType) {
    // Here we would integrate with Midtrans API (Snap)
    // For now, let's create a Pending payment record and return a mock token/redirect_url

    // Note: payment_type here roughly maps to DB 'dp', 'remaining', 'full'

    const newPayment = await sql`
        INSERT INTO public.payments (order_id, provider, payment_type, status, amount)
        VALUES (${orderId}, 'midtrans', ${paymentType}, 'pending', ${amount})
        RETURNING *
     `;

    // Mock interaction
    return {
      paymentId: newPayment[0].id,
      token: `mock-token-${Date.now()}`,
      redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${Date.now()}`,
    };
  }

  async handleWebhook(payload) {
    // Parse Midtrans webhook
    const { order_id, transaction_status, transaction_id } = payload;
    // order_id in Midtrans usually maps to our payment ID or custom order ID string
    // Let's assume we send payment ID as midtrans order_id

    const paymentId = order_id; // Simplication

    let status = "pending";
    if (
      transaction_status === "capture" ||
      transaction_status === "settlement"
    ) {
      status = "success";
    } else if (
      transaction_status === "deny" ||
      transaction_status === "cancel" ||
      transaction_status === "expire"
    ) {
      status = "failed";
    }

    const updatedPayment = await sql`
        UPDATE public.payments 
        SET status = ${status}, transaction_id = ${transaction_id}
        WHERE id = ${paymentId}
        RETURNING *
      `;

    if (updatedPayment.length > 0 && status === "success") {
      // Update Order Status if needed
      const payment = updatedPayment[0];
      const orderId = payment.order_id;

      // If payment successful, maybe update order to 'paid' or 'processing'?
      await sql`
            UPDATE public.orders SET status = 'processing' WHERE id = ${orderId}
          `;
    }

    return true;
  }

  async getPaymentByOrder(orderId) {
    const payments =
      await sql`SELECT * FROM public.payments WHERE order_id = ${orderId}`;
    return payments;
  }
}

module.exports = new PaymentService();

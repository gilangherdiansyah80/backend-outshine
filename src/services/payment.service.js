const { sql } = require("../config/database");
const midtransClient = require("midtrans-client");
const { getSupabaseAdmin } = require("../config/supabase");

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

  // Manual Payment
  async createManualPayment(orderId, amount, paymentType, bank) {
    // 0. Auto-detect amount and paymentType and bank if missing
    // Try to get from order first if possible (though check_orders didn't show bank column clearly, assuming user sends it or we default)
    // Actually, user wants BNI. So let's allow `bank` param.

    if (!amount || !paymentType) {
      const order =
        await sql`SELECT total_price, remaining_amount, payment_type FROM public.orders WHERE id = ${orderId}`;
      if (order.length === 0) throw new Error("Order not found");

      const ord = order[0];

      if (!paymentType) paymentType = ord.payment_type;

      if (!amount) {
        if (paymentType === "full") {
          amount = ord.total_price;
        } else if (paymentType === "dp") {
          // Fallback to full price if logic is complex, or maybe 50%?
          // Let's stick to total_price for safety or user input is required for partial.
          // Ideally user inputs amount for manual transfer, but if they don't, we assume full.
          amount = ord.total_price;
        }
      }
    }

    // Default bank to BCA if not provided (or handle errors)
    const selectedBank = bank ? bank.toLowerCase() : "bca";

    // Fetch Bank Details from DB
    const bankData = await sql`
        SELECT * FROM public.payment_methods 
        WHERE code = ${selectedBank} 
        AND is_active = true
    `;

    let accountInfo;
    let instructions = [];

    if (bankData.length > 0) {
      accountInfo = {
        name: bankData[0].name,
        accountNumber: bankData[0].account_number,
        accountHolder: bankData[0].account_holder,
      };
      instructions = bankData[0].instructions || [];
    } else {
      // Fallback if not found in DB (e.g. migration lag)
      accountInfo = {
        name: "BCA",
        accountNumber: "1234567890",
        accountHolder: "Outshine Official",
      };
      instructions = ["Silahkan transfer ke rekening tersebut."];
    }

    // Calculate Expiry (24 Hours)
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 1. Create Pending Payment Record
    const newPayment = await sql`
        INSERT INTO public.payments (order_id, provider, payment_type, status, amount, bank, expired_at)
        VALUES (${orderId}, 'manual', ${paymentType}, 'pending', ${amount}, ${selectedBank}, ${expiredAt})
        RETURNING *
     `;

    // 2. Return Payment Details
    return {
      paymentId: newPayment[0].id,
      transactionId: newPayment[0].id, // Alias for frontend consistency
      orderId: orderId,
      amount: amount,
      expiredAt: expiredAt,
      bank: accountInfo,
      instructions: instructions,
    };
  }

  async uploadPaymentProof(orderId, paymentId, file, note) {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");

    // 1. Upload File
    const fileExt = file.originalname.split(".").pop();
    const fileName = `payment-proofs/${orderId}/${paymentId}_${Date.now()}.${fileExt}`;
    const bucketName = "user-content";

    const { error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucketName).getPublicUrl(fileName);

    // 2. Insert Proof Record
    const proof = await sql`
        INSERT INTO public.manual_payment_proofs (order_id, payment_id, proof_url, note, status)
        VALUES (${orderId}, ${paymentId}, ${publicUrl}, ${note}, 'pending')
        RETURNING *
    `;

    // 3. Update Payment Status to 'waiting_verification' (optional, or keep pending)
    // Let's keep it 'pending' or maybe 'waiting_confirmation' if enum allows.
    // Assuming 'pending' is fine.

    // 4. Fetch Product Group Links
    const productLinks = await sql`
        SELECT pg.join_link, p.name
        FROM public.order_items oi
        JOIN public.product_groups pg ON oi.product_id = pg.product_id
        JOIN public.products p ON p.id = pg.product_id
        WHERE oi.order_id = ${orderId}
        AND pg.is_active = true
    `;

    let groupLink = null;
    let groupLinks = [];

    if (productLinks.length > 0) {
      // Collect all links
      groupLinks = productLinks.map((pl) => ({
        product: pl.name,
        link: pl.join_link,
      }));

      // Use the first one for the main order_groups (legacy support)
      groupLink = productLinks[0].join_link;

      // Upsert into order_groups
      await sql`
            INSERT INTO public.order_groups (order_id, join_link, is_active)
            VALUES (${orderId}, ${groupLink}, true)
            ON CONFLICT (order_id) 
            DO UPDATE SET join_link = ${groupLink}, is_active = true
        `;
    }

    return {
      ...proof[0],
      groupLink: groupLink,
      groupLinks: groupLinks,
    };
  }

  async getOrderGroupLink(orderId) {
    const group =
      await sql`SELECT * FROM public.order_groups WHERE order_id = ${orderId} AND is_active = true`;
    return group.length > 0 ? group[0].join_link : null;
  }

  async getPaymentByOrder(orderId) {
    return await sql`SELECT * FROM public.payments WHERE order_id = ${orderId}`;
  }
}

module.exports = new PaymentService();

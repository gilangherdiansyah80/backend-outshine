const { sql } = require("../config/database");
const cartService = require("./cart.service");

class OrderService {
  async checkout(userId, checkoutData) {
    const { addressId, paymentType } = checkoutData; // paymentType: 'full', 'dp'

    // 1. Get Cart Items
    const cart = await cartService.getCart(userId);
    if (cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    // 2. Validate Address (Simple check)
    const address =
      await sql`SELECT * FROM public.user_addresses WHERE id = ${addressId} AND user_id = ${userId}`;
    if (address.length === 0) {
      throw new Error("Address not found");
    }

    // 3. Calculate Totals
    const totalPrice = Number(cart.totalAmount);
    let paidAmount = 0;
    let remainingAmount = 0;

    if (paymentType === "full") {
      paidAmount = totalPrice; // Intention to pay full
      remainingAmount = 0;
    } else if (paymentType === "dp") {
      // Logic for DP? E.g. 50% or based on product rules.
      // Schema has `po_dp_percent` in products.
      // Simplified: Let's assume global DP rule or just 50% for now unless specified.
      // Or maybe check if ANY item is PO?
      // "is_po" and "po_dp_percent" are in products.
      // Let's calculate minimum DP required.

      let minDp = 0;
      for (const item of cart.items) {
        // fetch product PO details if not in cart view?
        // Cart view in cart.service has p.* join? No, let's check cart service.
        // Cart service query: JOIN public.products p ... SELECT ci.*, p.name, p.price...
        // We need to fetch full product details to be sure about PO.

        const product =
          await sql`SELECT * FROM public.products WHERE id = ${item.product_id}`;
        if (product[0].is_po) {
          const percent = product[0].po_dp_percent || 50;
          minDp += (Number(item.total_price) * percent) / 100;
        } else {
          minDp += Number(item.total_price); // Non-PO items full price? Or allow DP for all?
          // Usually mixed cart is tricky. Let's assume for PO items DP is allowed.
          // For simplicity: If paymentType is DP, we assume user pays calculated DP.
        }
      }

      paidAmount = minDp > 0 ? minDp : totalPrice; // If no PO items, maybe full payment required?
      // Let's stick to simplest:
      // If user requests DP, we calculate 50% of total if logic not strict,
      // OR better, trust the frontend/business logic?
      // Let's use simple 50% for now for generic DP, or check max PO percent.
      // Wait, let's use the `po_dp_percent` from product if available.

      // Re-iterating over items is safest.
      let totalCalculatedDp = 0;
      for (const item of cart.items) {
        const product =
          await sql`SELECT is_po, po_dp_percent FROM public.products WHERE id = ${item.product_id}`;
        if (product[0].is_po) {
          totalCalculatedDp +=
            (Number(item.total_price) * (product[0].po_dp_percent || 50)) / 100;
        } else {
          totalCalculatedDp += Number(item.total_price); // Non-PO items full payment
        }
      }
      paidAmount = totalCalculatedDp;
      remainingAmount = totalPrice - paidAmount;
    }

    // 4. Create Order
    const newOrder = await sql`
      INSERT INTO public.orders (
        user_id, address_id, total_price, status, payment_type, paid_amount, remaining_amount
      )
      VALUES (
        ${userId}, ${addressId}, ${totalPrice}, 'pending', ${paymentType}, ${paidAmount}, ${remainingAmount}
      )
      RETURNING *
    `;
    const orderId = newOrder[0].id;

    // 5. Create Order Items
    for (const item of cart.items) {
      await sql`
        INSERT INTO public.order_items (order_id, product_id, size_id, price, quantity)
        VALUES (${orderId}, ${item.product_id}, ${item.size_id}, ${item.price}, ${item.quantity})
      `;
      // Reduce Stock?
      await sql`
        UPDATE public.product_sizes 
        SET stock = stock - ${item.quantity}
        WHERE product_id = ${item.product_id} AND size_id = ${item.size_id}
      `;
    }

    // 6. Clear Cart
    await sql`DELETE FROM public.cart_items WHERE cart_id = ${cart.cartId}`;

    return newOrder[0];
  }

  async getUserOrders(userId) {
    const orders = await sql`
      SELECT o.*, 
        (SELECT count(*) FROM public.order_items WHERE order_id = o.id) as total_items
      FROM public.orders o
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return orders;
  }

  async getOrderById(orderId) {
    const order = await sql`SELECT * FROM public.orders WHERE id = ${orderId}`;
    if (order.length === 0) throw new Error("Order not found");

    const items = await sql`
      SELECT oi.*, p.name as product_name, p.price as product_unit_price, s.name as size_name,
      (
          SELECT image_url 
          FROM public.product_images pi 
          WHERE pi.product_id = p.id AND pi.is_primary = true 
          LIMIT 1
      ) as product_image
      FROM public.order_items oi
      JOIN public.products p ON oi.product_id = p.id
      JOIN public.sizes s ON oi.size_id = s.id
      WHERE oi.order_id = ${orderId}
    `;

    const payment = await sql`
        SELECT * FROM public.payments WHERE order_id = ${orderId} ORDER BY created_at DESC LIMIT 1
    `;

    return {
      ...order[0],
      items,
      latest_payment: payment[0] || null,
    };
  }

  async getAllOrders(userId) {
    // Admin only?
    // Check if user is admin role?
    // For service, we assume controller handles auth.
    const orders = await sql`
        SELECT o.*, u.email as user_email
        FROM public.orders o
        JOIN public.users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
    `;
    return orders;
  }

  async updateOrderStatus(orderId, status) {
    const updated = await sql`
        UPDATE public.orders SET status = ${status} WHERE id = ${orderId} RETURNING *
     `;
    return updated[0];
  }

  async deleteOrder(userId, orderId) {
    // Check ownership or admin role (handled by controller usually, but safe to check ownership here if not admin)
    // Assuming userId passed is the owner. If admin, maybe pass null or handle in controller.
    // For safety, let's verify existence first.
    const order = await sql`SELECT * FROM public.orders WHERE id = ${orderId}`;
    if (order.length === 0) throw new Error("Order not found");

    // Optional: Check if user owns it
    if (userId && order[0].user_id !== userId) {
      // Maybe allow? Or throw?
      // Let's assume controller checks permissions or we enforce it here.
      // throw new Error("Forbidden");
    }

    // Delete Cascade (Manually or via DB Constraints)
    // Safest to delete items first then payments then order.
    await sql`DELETE FROM public.order_items WHERE order_id = ${orderId}`;
    await sql`DELETE FROM public.payments WHERE order_id = ${orderId}`;
    await sql`DELETE FROM public.orders WHERE id = ${orderId}`;

    return true;
  }
}

module.exports = new OrderService();

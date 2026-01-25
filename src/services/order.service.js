const { sql } = require("../config/database");
const cartService = require("./cart.service");

class OrderService {
  async checkout(userId, checkoutData) {
    const { addressId, paymentType, productId, sizeId, quantity } =
      checkoutData; // paymentType: 'full', 'dp'

    let items = [];
    let cartId = null;

    // 1. Get Items (either from Buy Now or from Cart)
    if (productId) {
      // Direct Buy Flow
      if (!sizeId || !quantity) {
        throw new Error("sizeId and quantity are required for Buy Now");
      }

      const product =
        await sql`SELECT * FROM public.products WHERE id = ${productId}`;
      if (product.length === 0) throw new Error("Product not found");

      const size =
        await sql`SELECT * FROM public.product_sizes WHERE product_id = ${productId} AND size_id = ${sizeId}`;
      if (size.length === 0) throw new Error("Size not found for this product");
      if (size[0].stock < quantity) throw new Error("Insufficient stock");

      // Check for active discount
      const discount = await sql`
        SELECT * FROM public.product_discounts
        WHERE product_id = ${productId}
        AND is_active = true
        AND (start_date IS NULL OR start_date <= now())
        AND (end_date IS NULL OR end_date >= now())
        LIMIT 1
      `;

      let price = Number(product[0].price);
      if (discount.length > 0) {
        if (discount[0].type === "percent") {
          price = price - (price * Number(discount[0].value)) / 100;
        } else if (discount[0].type === "fixed") {
          price = price - Number(discount[0].value);
        }
      }

      items.push({
        productId: productId,
        sizeId: sizeId,
        quantity: quantity,
        price: price,
        totalPrice: price * quantity,
        isPo: product[0].is_po,
        poDpPercent: product[0].po_dp_percent || 75,
      });
    } else {
      // Cart Flow
      const cart = await cartService.getCart(userId);
      if (cart.items.length === 0) {
        throw new Error("Cart is empty");
      }
      cartId = cart.cartId;

      // Map cart items and fetch PO details if needed
      for (const item of cart.items) {
        const product =
          await sql`SELECT is_po, po_dp_percent FROM public.products WHERE id = ${item.productId}`;
        items.push({
          ...item,
          isPo: product[0].is_po,
          poDpPercent: product[0].po_dp_percent || 75,
        });
      }
    }

    // 2. Validate Address
    const address =
      await sql`SELECT * FROM public.user_addresses WHERE id = ${addressId} AND user_id = ${userId}`;
    if (address.length === 0) {
      throw new Error("Address not found");
    }

    // 3. Calculate Totals
    const totalPrice = items.reduce(
      (sum, item) => sum + Number(item.totalPrice),
      0,
    );
    let paidAmount = 0;
    let remainingAmount = 0;

    if (paymentType === "full") {
      paidAmount = totalPrice;
      remainingAmount = 0;
    } else if (paymentType === "dp") {
      let totalCalculatedDp = 0;
      for (const item of items) {
        if (item.isPo) {
          totalCalculatedDp +=
            (Number(item.totalPrice) * item.poDpPercent) / 100;
        } else {
          totalCalculatedDp += Number(item.totalPrice); // Non-PO items full payment
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

    // 5. Create Order Items and Reduce Stock
    for (const item of items) {
      await sql`
        INSERT INTO public.order_items (order_id, product_id, size_id, price, quantity)
        VALUES (${orderId}, ${item.productId}, ${item.sizeId}, ${item.price}, ${item.quantity})
      `;
      await sql`
        UPDATE public.product_sizes 
        SET stock = stock - ${item.quantity}
        WHERE product_id = ${item.productId} AND size_id = ${item.sizeId}
      `;
    }

    // 6. Clear Cart if originating from cart
    if (cartId) {
      await sql`DELETE FROM public.cart_items WHERE cart_id = ${cartId}`;
    }

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

const { sql } = require("../config/database");
const cartService = require("./cart.service");
const { formatCurrency, toCamelCase } = require("../utils/format.util");

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
        (SELECT count(*) FROM public.order_items WHERE order_id = o.id) as total_items,
        (
          SELECT json_agg(json_build_object(
            'productId', oi.product_id,
            'productName', p.name,
            'sizeName', s.name,
            'quantity', oi.quantity,
            'originalPrice', p.price,
            'discountedPrice', oi.price,
            'productImage', (
              SELECT image_url FROM public.product_images pi 
              WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1
            )
          ))
          FROM public.order_items oi
          JOIN public.products p ON oi.product_id = p.id
          JOIN public.sizes s ON oi.size_id = s.id
          WHERE oi.order_id = o.id
        ) as items
      FROM public.orders o
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    // Process and Format
    return orders.map((order) => {
      const camelOrder = toCamelCase(order);

      // Format amounts for Order
      camelOrder.formattedTotalPrice = formatCurrency(
        Number(camelOrder.totalPrice),
      );
      camelOrder.formattedPaidAmount = formatCurrency(
        Number(camelOrder.paidAmount),
      );
      camelOrder.formattedRemainingAmount = formatCurrency(
        Number(camelOrder.remainingAmount),
      );

      // Format amounts for each item if they exist
      if (camelOrder.items) {
        camelOrder.items = camelOrder.items.map((item) => {
          const originalPrice = Number(item.originalPrice);
          const discountedPrice = Number(item.discountedPrice);
          const hasDiscount = discountedPrice < originalPrice;

          return {
            ...item,
            discountedPrice: hasDiscount ? discountedPrice : 0,
            formattedOriginalPrice: formatCurrency(originalPrice),
            formattedDiscountedPrice: hasDiscount
              ? formatCurrency(discountedPrice)
              : formatCurrency(0),
          };
        });
      }

      return camelOrder;
    });
  }

  async getOrderById(orderId) {
    const orders = await sql`SELECT * FROM public.orders WHERE id = ${orderId}`;
    if (orders.length === 0) throw new Error("Order not found");

    const order = toCamelCase(orders[0]);

    // Fetch Address
    const addresses = await sql`
      SELECT * FROM public.user_addresses WHERE id = ${order.addressId}
    `;
    const address = addresses.length > 0 ? toCamelCase(addresses[0]) : null;

    const items = await sql`
      SELECT oi.*, p.name as product_name, s.name as size_name, p.price as original_price,
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
        SELECT p.*, pm.name as payment_method_name,
        (SELECT proof_url FROM public.manual_payment_proofs WHERE payment_id = p.id LIMIT 1) as proof_url,
        (SELECT id FROM public.manual_payment_proofs WHERE payment_id = p.id LIMIT 1) as proof_id
        FROM public.payments p
        LEFT JOIN public.payment_methods pm ON p.bank = pm.code
        WHERE p.order_id = ${orderId} 
        ORDER BY p.created_at DESC 
        LIMIT 1
    `;

    const camelItems = toCamelCase(items).map((item) => {
      const originalPrice = Number(item.originalPrice);
      const paidPrice = Number(item.price);
      const hasDiscount = paidPrice < originalPrice;

      return {
        ...item,
        discountedPrice: hasDiscount ? paidPrice : 0,
        formattedOriginalPrice: formatCurrency(originalPrice),
        formattedDiscountedPrice: hasDiscount
          ? formatCurrency(paidPrice)
          : formatCurrency(0),
      };
    });
    const latestPayment = payment.length > 0 ? toCamelCase(payment[0]) : null;
    
    // Fetch absolute latest proof for this order (top level)
    const proofs = await sql`
      SELECT id, proof_url FROM public.manual_payment_proofs 
      WHERE order_id = ${orderId} 
      ORDER BY id DESC 
      LIMIT 1
    `;
    const paymentProof = proofs.length > 0 ? proofs[0].proof_url : null;
    const paymentProofId = proofs.length > 0 ? proofs[0].id : null;

    if (latestPayment && latestPayment.paymentMethodName) {
      latestPayment.bank = latestPayment.paymentMethodName;
    }

    return {
      ...order,
      paymentProof,
      paymentProofId,
      address,
      items: camelItems,
      latestPayment,
      formattedTotalPrice: formatCurrency(Number(order.totalPrice)),
      formattedPaidAmount: formatCurrency(Number(order.paidAmount)),
      formattedRemainingAmount: formatCurrency(Number(order.remainingAmount)),
    };
  }

  async getAllOrders() {
    const orders = await sql`
      SELECT o.id, o.status, o.total_price, o.created_at, o.user_id,
        u.email as user_email, p.full_name as user_name,
        COALESCE((SELECT sum(quantity) FROM public.order_items WHERE order_id = o.id), 0) as total_products,
        (
          SELECT json_agg(json_build_object(
            'productName', pr.name,
            'sizeName', s.name,
            'quantity', oi.quantity,
            'originalPrice', pr.price,
            'discountedPrice', oi.price,
            'productImage', (
              SELECT image_url FROM public.product_images pi 
              WHERE pi.product_id = pr.id AND pi.is_primary = true LIMIT 1
            )
          ))
          FROM public.order_items oi
          JOIN public.products pr ON oi.product_id = pr.id
          JOIN public.sizes s ON oi.size_id = s.id
          WHERE oi.order_id = o.id
        ) as items
      FROM public.orders o
      JOIN public.users u ON o.user_id = u.id
      LEFT JOIN public.profile_users p ON u.id = p.user_id
      ORDER BY o.created_at DESC
    `;

    return orders.map((order) => {
      const camelOrder = toCamelCase(order);
      camelOrder.formattedTotalPrice = formatCurrency(Number(camelOrder.totalPrice));

      if (camelOrder.items) {
        camelOrder.items = camelOrder.items.map((item) => {
           const original = Number(item.originalPrice);
           const discounted = Number(item.discountedPrice);
           const hasDiscount = discounted < original;
           const finalPrice = hasDiscount ? discounted : original;
           return {
              productName: item.productName,
              sizeName: item.sizeName,
              quantity: item.quantity,
              productImage: item.productImage,
              formattedPrice: formatCurrency(finalPrice)
           }
        });
      }
      return camelOrder;
    });
  }

  async updateOrderStatus(orderId, status) {
    const updated = await sql`
        UPDATE public.orders SET status = ${status} WHERE id = ${orderId} RETURNING *
     `;
    return updated[0];
  }

  async cancelOrder(orderId) {
    // 1. Get current status and items
    const orders = await sql`SELECT status FROM public.orders WHERE id = ${orderId}`;
    if (orders.length === 0) throw new Error("Order not found");
    if (orders[0].status === "cancelled") return orders[0];

    // 2. Restore Stocks
    const items = await sql`SELECT product_id, size_id, quantity FROM public.order_items WHERE order_id = ${orderId}`;
    for (const item of items) {
      await sql`
        UPDATE public.product_sizes 
        SET stock = stock + ${item.quantity}
        WHERE product_id = ${item.product_id} AND size_id = ${item.size_id}
      `;
    }

    // 3. Update Order Status
    const updated = await sql`
        UPDATE public.orders SET status = 'cancelled' WHERE id = ${orderId} RETURNING *
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

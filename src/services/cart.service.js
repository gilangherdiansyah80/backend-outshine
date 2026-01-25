const { sql } = require("../config/database");
const { formatCurrency } = require("../utils/format.util");

class CartService {
  async getCart(userId) {
    // Get or Create Cart
    let cart = await sql`SELECT * FROM public.carts WHERE user_id = ${userId}`;
    if (cart.length === 0) {
      cart =
        await sql`INSERT INTO public.carts (user_id) VALUES (${userId}) RETURNING *`;
    }
    const cartId = cart[0].id;

    // Get Items
    const items = await sql`
        SELECT 
            ci.cart_id as "cartId",
            ci.product_id as "productId",
            ci.size_id as "sizeId",
            ci.quantity,
            p.name as "productName",
            p.price as "originalPrice",
            s.name as "sizeName",
            (
                SELECT image_url 
                FROM public.product_images pi 
                WHERE pi.product_id = p.id AND pi.is_primary = true 
                LIMIT 1
            ) as "productImage",
            (
                SELECT to_json(pd.*)
                FROM public.product_discounts pd
                WHERE pd.product_id = p.id
                AND pd.is_active = true
                AND (pd.start_date IS NULL OR pd.start_date <= now())
                AND (pd.end_date IS NULL OR pd.end_date >= now())
                LIMIT 1
            ) as active_discount
        FROM public.cart_items ci
        JOIN public.products p ON ci.product_id = p.id
        JOIN public.sizes s ON ci.size_id = s.id
        WHERE ci.cart_id = ${cartId}
    `;

    // Process items to calculate discounted price
    const processedItems = items.map((item) => {
      let currentPrice = Number(item.originalPrice);
      const discount = item.active_discount;

      if (discount) {
        if (discount.type === "percent") {
          currentPrice =
            currentPrice - (currentPrice * Number(discount.value)) / 100;
        } else if (discount.type === "fixed") {
          currentPrice = currentPrice - Number(discount.value);
        }
      }

      return {
        ...item,
        price: currentPrice,
        totalPrice: currentPrice * item.quantity,
        formattedOriginalPrice: formatCurrency(Number(item.originalPrice)),
        formattedPrice: formatCurrency(currentPrice),
        formattedTotalPrice: formatCurrency(currentPrice * item.quantity),
      };
    });

    // Calculate cart summary
    const totalAmount = processedItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0,
    );

    return {
      cartId,
      items: processedItems,
      totalAmount,
      formattedTotalAmount: formatCurrency(totalAmount),
    };
  }

  async addItemToCart(userId, productId, sizeId, quantity = 1) {
    // Get or Create Cart
    let cart = await sql`SELECT * FROM public.carts WHERE user_id = ${userId}`;
    if (cart.length === 0) {
      cart =
        await sql`INSERT INTO public.carts (user_id) VALUES (${userId}) RETURNING *`;
    }
    const cartId = cart[0].id;

    // Upsert Item
    // postgres.js upsert
    const item = await sql`
        INSERT INTO public.cart_items (cart_id, product_id, size_id, quantity)
        VALUES (${cartId}, ${productId}, ${sizeId}, ${quantity})
        ON CONFLICT (cart_id, product_id, size_id)
        DO UPDATE SET quantity = cart_items.quantity + ${quantity}
        RETURNING *
    `;

    return item[0];
  }

  async updateItemQuantity(userId, productId, sizeId, quantity) {
    const cart =
      await sql`SELECT * FROM public.carts WHERE user_id = ${userId}`;
    if (cart.length === 0) throw new Error("Cart not found");
    const cartId = cart[0].id;

    if (quantity <= 0) {
      // Delete
      await sql`DELETE FROM public.cart_items WHERE cart_id = ${cartId} AND product_id = ${productId} AND size_id = ${sizeId}`;
      return null;
    } else {
      // Update
      const item = await sql`
            UPDATE public.cart_items 
            SET quantity = ${quantity}
            WHERE cart_id = ${cartId} AND product_id = ${productId} AND size_id = ${sizeId}
            RETURNING *
          `;
      return item[0];
    }
  }

  async removeItem(userId, productId, sizeId) {
    const cart =
      await sql`SELECT * FROM public.carts WHERE user_id = ${userId}`;
    if (cart.length === 0) throw new Error("Cart not found");
    const cartId = cart[0].id;

    await sql`DELETE FROM public.cart_items WHERE cart_id = ${cartId} AND product_id = ${productId} AND size_id = ${sizeId}`;
    return true;
  }
}

module.exports = new CartService();

const { sql } = require("../config/database");
const { formatCurrency } = require("../utils/format.util");

class WishlistService {
  async getWishlist(userId) {
    // Join with products to give details
    const wishlist = await sql`
      SELECT 
        w.created_at as added_at,
        p.*,
        c.name as category_name,
        (
            SELECT image_url 
            FROM public.product_images pi 
            WHERE pi.product_id = p.id AND pi.is_primary = true 
            LIMIT 1
         ) as primary_image,
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', t.id, 'name', t.name))
            FROM public.product_tags t
            JOIN public.product_tag_items pt ON t.id = pt.tag_id
            WHERE pt.product_id = p.id
          ),
          '[]'::json
        ) as tags,
        (
            SELECT to_json(pd.*)
            FROM public.product_discounts pd
            WHERE pd.product_id = p.id
            AND pd.is_active = true
            AND (pd.start_date IS NULL OR pd.start_date <= now())
            AND (pd.end_date IS NULL OR pd.end_date >= now())
            LIMIT 1
        ) as discount
      FROM public.wishlists w
      JOIN public.products p ON w.product_id = p.id
      LEFT JOIN public.categories c ON p.category_id = c.id
      WHERE w.user_id = ${userId}
      ORDER BY w.created_at DESC
    `;

    return wishlist.map((item) => {
      const originalPrice = Number(item.price);
      let discountedPrice = originalPrice;
      let discountData = null;

      if (item.discount) {
        const { type, value, start_date, end_date, is_active } = item.discount;
        const numValue = Number(value);

        if (type === "percent") {
          discountedPrice = originalPrice - (originalPrice * numValue) / 100;
        } else if (type === "fixed") {
          discountedPrice = originalPrice - numValue;
        }

        discountData = {
          type,
          value: numValue,
          isActive: is_active,
          startDate: start_date,
          endDate: end_date,
        };
      }

      return {
        id: item.id, // Product ID
        name: item.name,
        category: {
          id: item.category_id,
          name: item.category_name,
        },
        description: item.description,
        price: originalPrice,
        discountedPrice: discountedPrice,
        formattedPrice: formatCurrency(originalPrice),
        formattedDiscountedPrice: formatCurrency(discountedPrice),
        isActive: item.is_active,
        isPo: item.is_po,
        poDpPercent: item.po_dp_percent,
        primaryImage: item.primary_image,
        tags: item.tags || [],
        discount: discountData,
        addedAt: item.added_at,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    });
  }

  async addToWishlist(userId, productId) {
    // Check if exists
    const existing = await sql`
      SELECT * FROM public.wishlists WHERE user_id = ${userId} AND product_id = ${productId}
    `;

    if (existing.length > 0) {
      return existing[0]; // Already in wishlist
    }

    const newItem = await sql`
      INSERT INTO public.wishlists (user_id, product_id)
      VALUES (${userId}, ${productId})
      RETURNING *
    `;
    return newItem[0];
  }

  async removeFromWishlist(userId, productId) {
    await sql`
      DELETE FROM public.wishlists 
      WHERE user_id = ${userId} AND product_id = ${productId}
    `;
    return true;
  }
}

module.exports = new WishlistService();

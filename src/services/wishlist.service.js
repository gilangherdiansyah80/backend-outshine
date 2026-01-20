const { sql } = require("../config/database");

class WishlistService {
  async getWishlist(userId) {
    // Join with products to give details
    const wishlist = await sql`
      SELECT 
        w.created_at as added_at,
        p.*,
        (
            SELECT image_url 
            FROM public.product_images pi 
            WHERE pi.product_id = p.id AND pi.is_primary = true 
            LIMIT 1
        ) as primary_image
      FROM public.wishlists w
      JOIN public.products p ON w.product_id = p.id
      WHERE w.user_id = ${userId}
      ORDER BY w.created_at DESC
    `;
    return wishlist;
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

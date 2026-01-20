const { sql, getSupabaseAdmin } = require("../config/database");

class ReviewService {
  async getReviewsByProduct(productId) {
    const reviews = await sql`
      SELECT 
        r.*,
        u.email as user_email,
        p.full_name as user_name,
        p.avatar_url as user_avatar,
        COALESCE(
          (
            SELECT json_agg(ri.image_url)
            FROM public.product_review_images ri
            WHERE ri.review_id = r.id
          ),
          '[]'::json
        ) as images
      FROM public.product_reviews r
      JOIN public.users u ON r.user_id = u.id
      LEFT JOIN public.profile_users p ON u.id = p.user_id
      WHERE r.product_id = ${productId}
      ORDER BY r.created_at DESC
    `;
    return reviews;
  }

  async getProductRatingSummary(productId) {
    const summary = await sql`
        SELECT * FROM public.product_rating_summary WHERE product_id = ${productId}
     `;
    return summary[0] || { average_rating: 0, total_reviews: 0 };
  }

  async createReview(userId, productId, rating, comment, files = []) {
    // Check if user already reviewed? Typically one review per product per user?
    // Or allow multiple? Let's check existing for now to prevent spam.
    const existing = await sql`
        SELECT * FROM public.product_reviews WHERE user_id = ${userId} AND product_id = ${productId}
     `;
    if (existing.length > 0)
      throw new Error("You have already reviewed this product");

    const newReview = await sql`
        INSERT INTO public.product_reviews (product_id, user_id, rating, comment)
        VALUES (${productId}, ${userId}, ${rating}, ${comment})
        RETURNING *
     `;
    const reviewId = newReview[0].id;

    // Handle Images if any
    if (files && files.length > 0) {
      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) throw new Error("Supabase admin not configured");

      for (const file of files) {
        const fileExt = file.originalname.split(".").pop();
        const fileName = `reviews/${reviewId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const bucketName = "user-content";

        const { error } = await supabaseAdmin.storage
          .from(bucketName)
          .upload(fileName, file.buffer, { contentType: file.mimetype });

        if (!error) {
          const { data } = supabaseAdmin.storage
            .from(bucketName)
            .getPublicUrl(fileName);
          await sql`
                    INSERT INTO public.product_review_images (review_id, image_url)
                    VALUES (${reviewId}, ${data.publicUrl})
                `;
        }
      }
    }

    // Update Summary
    await this._updateRatingSummary(productId);

    return newReview[0];
  }

  async deleteReview(userId, reviewId) {
    // Check ownership
    const existing =
      await sql`SELECT * FROM public.product_reviews WHERE id = ${reviewId} AND user_id = ${userId}`;
    if (existing.length === 0)
      throw new Error("Review not found or access denied");

    const productId = existing[0].product_id;

    // Delete images (DB) - Storage cleanup skipped for brevity
    await sql`DELETE FROM public.product_review_images WHERE review_id = ${reviewId}`;
    await sql`DELETE FROM public.product_reviews WHERE id = ${reviewId}`;

    // Update Summary
    await this._updateRatingSummary(productId);

    return true;
  }

  async updateReview(userId, reviewId, rating, comment, files = []) {
    // Check ownership
    const existing = await sql`
        SELECT * FROM public.product_reviews WHERE id = ${reviewId} AND user_id = ${userId}
      `;
    if (existing.length === 0)
      throw new Error("Review not found or access denied");
    const productId = existing[0].product_id;

    // Update fields
    await sql`
        UPDATE public.product_reviews 
        SET 
            rating = COALESCE(${rating}, rating),
            comment = COALESCE(${comment}, comment),
            updated_at = now()
        WHERE id = ${reviewId}
      `;

    // Handle new images (Add to existing)
    if (files && files.length > 0) {
      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) throw new Error("Supabase admin not configured");

      for (const file of files) {
        const fileExt = file.originalname.split(".").pop();
        const fileName = `reviews/${reviewId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const bucketName = "user-content";

        const { error } = await supabaseAdmin.storage
          .from(bucketName)
          .upload(fileName, file.buffer, { contentType: file.mimetype });

        if (!error) {
          const { data } = supabaseAdmin.storage
            .from(bucketName)
            .getPublicUrl(fileName);
          await sql`
                    INSERT INTO public.product_review_images (review_id, image_url)
                    VALUES (${reviewId}, ${data.publicUrl})
                `;
        }
      }
    }

    // Update Summary
    await this._updateRatingSummary(productId);

    // Return updated review
    const updated =
      await sql`SELECT * FROM public.product_reviews WHERE id = ${reviewId}`;
    return updated[0];
  }

  // Internal helper to recalculate rating
  async _updateRatingSummary(productId) {
    const stats = await sql`
        SELECT 
            COUNT(*) as total, 
            AVG(rating) as average 
        FROM public.product_reviews 
        WHERE product_id = ${productId}
      `;

    const total = Number(stats[0].total) || 0;
    const average = Number(stats[0].average) || 0;

    await sql`
        INSERT INTO public.product_rating_summary (product_id, average_rating, total_reviews)
        VALUES (${productId}, ${average}, ${total})
        ON CONFLICT (product_id) 
        DO UPDATE SET average_rating = ${average}, total_reviews = ${total}
      `;
  }
}

module.exports = new ReviewService();

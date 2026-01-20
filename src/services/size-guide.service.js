const { sql, getSupabaseAdmin } = require("../config/database");

class SizeGuideService {
  async getSizeGuideByProductId(productId) {
    const guides = await sql`
      SELECT * FROM public.product_size_guides 
      WHERE product_id = ${productId}
      LIMIT 1 -- Assuming one guide per product usually, or return list?
      -- Schema has ID, so multiple possible. Let's return list or single?
      -- Prompt asked for GET /products/:id/size-guide (singular), so maybe single object or latest.
      -- Let's return array for flexibility but controller can pick first.
    `;
    return guides;
  }

  async createSizeGuide(productId, file, description) {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");

    let imageUrl = null;
    if (file) {
      const fileExt = file.originalname.split(".").pop();
      const fileName = `size-guides/${productId}/${Date.now()}.${fileExt}`;
      const bucketName = "user-content";

      const { error } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(fileName, file.buffer, { contentType: file.mimetype });

      if (error) throw new Error(`Upload failed: ${error.message}`);

      const { data } = supabaseAdmin.storage
        .from(bucketName)
        .getPublicUrl(fileName);
      imageUrl = data.publicUrl;
    }

    const newGuide = await sql`
      INSERT INTO public.product_size_guides (product_id, image_url, description)
      VALUES (${productId}, ${imageUrl}, ${description})
      RETURNING *
    `;
    return newGuide[0];
  }

  async updateSizeGuide(id, file, description) {
    // Check existence
    const existing =
      await sql`SELECT * FROM public.product_size_guides WHERE id = ${id}`;
    if (existing.length === 0) throw new Error("Size Guide not found");

    let imageUrl = existing[0].image_url;

    if (file) {
      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) throw new Error("Supabase admin not configured");

      const fileExt = file.originalname.split(".").pop();
      const fileName = `size-guides/${existing[0].product_id}/${Date.now()}.${fileExt}`;
      const bucketName = "user-content";

      const { error } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(fileName, file.buffer, { contentType: file.mimetype });

      if (error) throw new Error(`Upload failed: ${error.message}`);

      const { data } = supabaseAdmin.storage
        .from(bucketName)
        .getPublicUrl(fileName);
      imageUrl = data.publicUrl;
    }

    const updatedGuide = await sql`
        UPDATE public.product_size_guides
        SET 
            image_url = ${imageUrl},
            description = COALESCE(${description}, description)
        WHERE id = ${id}
        RETURNING *
    `;
    return updatedGuide[0];
  }

  async deleteSizeGuide(id) {
    const existing =
      await sql`SELECT * FROM public.product_size_guides WHERE id = ${id}`;
    if (existing.length === 0) throw new Error("Size Guide not found");

    await sql`DELETE FROM public.product_size_guides WHERE id = ${id}`;
    return true;
  }
}

module.exports = new SizeGuideService();

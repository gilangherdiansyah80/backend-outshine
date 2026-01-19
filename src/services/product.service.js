const { sql, getSupabaseAdmin } = require("../config/database");

class ProductService {
  async getAllProducts(filters = {}) {
    const { categoryId, search, limit = 20, offset = 0 } = filters;

    // Base query
    // We join with product_images to get the primary image
    // Using simple concatenation for optional where clauses because postgres.js templating is safer but tricky with dynamic columns if not careful.
    // However, postgres.js is good at this.

    let products;

    // Constructing query parts
    // Note: postgres.js handles dynamic queries well.

    const conditions = [];
    if (categoryId) conditions.push("p.category_id = " + sql`${categoryId}`); // logic needs care with postgres.js

    // Actually, let's use a simpler approach for now or helper.
    // Or just raw SQL chunks.

    products = await sql`
      SELECT 
        p.*,
        c.name as category_name,
        (
          SELECT image_url 
          FROM public.product_images pi 
          WHERE pi.product_id = p.id AND pi.is_primary = true 
          LIMIT 1
        ) as primary_image
      FROM public.products p
      LEFT JOIN public.categories c ON p.category_id = c.id
      WHERE 
        (${categoryId ? sql`p.category_id = ${categoryId}` : sql`1=1`})
        AND (${search ? sql`p.name ILIKE ${"%" + search + "%"}` : sql`1=1`})
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return products;
  }

  async getProductById(id) {
    const product = await sql`
      SELECT 
        p.*,
        c.name as category_name
      FROM public.products p
      LEFT JOIN public.categories c ON p.category_id = c.id
      WHERE p.id = ${id}
    `;

    if (product.length === 0) {
      throw new Error("Product not found");
    }

    // Get Images
    const images = await sql`
      SELECT * FROM public.product_images WHERE product_id = ${id} ORDER BY is_primary DESC, created_at ASC
    `;

    // Get Sizes (Stock)
    const sizes = await sql`
      SELECT 
        ps.*, s.name as size_name
      FROM public.product_sizes ps
      JOIN public.sizes s ON ps.size_id = s.id
      WHERE ps.product_id = ${id}
    `;

    return {
      ...product[0],
      images,
      sizes,
    };
  }

  async createProduct(productData) {
    const {
      categoryId,
      name,
      description,
      price,
      isActive = true,
      isPo = false,
      poDpPercent = 75,
    } = productData;

    const newProduct = await sql`
      INSERT INTO public.products (
        category_id, name, description, price, is_active, is_po, po_dp_percent
      )
      VALUES (
        ${categoryId}, ${name}, ${description}, ${price}, ${isActive}, ${isPo}, ${poDpPercent}
      )
      RETURNING *
    `;

    return newProduct[0];
  }

  async updateProduct(id, productData) {
    // Check existence
    await this.getProductById(id);

    const {
      categoryId,
      name,
      description,
      price,
      isActive,
      isPo,
      poDpPercent,
    } = productData;

    const updatedProduct = await sql`
      UPDATE public.products
      SET 
        category_id = COALESCE(${categoryId}, category_id),
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        price = COALESCE(${price}, price),
        is_active = COALESCE(${isActive}, is_active),
        is_po = COALESCE(${isPo}, is_po),
        po_dp_percent = COALESCE(${poDpPercent}, po_dp_percent),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;

    return updatedProduct[0];
  }

  async deleteProduct(id) {
    // Check existence
    await this.getProductById(id);

    // Get images to delete from storage?
    // For now we might just delete DB records.
    // Ideally we list images, delete from storage, then delete from DB.
    // I'll skip storage cleanup for speed unless critical,
    // but better to be clean if possible.

    /* 
    const images = await sql`SELECT image_url FROM public.product_images WHERE product_id = ${id}`;
    // loop delete from storage...
    */

    await sql`DELETE FROM public.products WHERE id = ${id}`;
    return true;
  }

  // Image Management

  async addProductImage(productId, file, isPrimary = false) {
    await this.getProductById(productId); // Ensure product exists

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");

    const fileExt = file.originalname.split(".").pop();
    const fileName = `products/${productId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const bucketName = "user-content";

    const { error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucketName).getPublicUrl(fileName);

    // If making this primary, unset others
    if (isPrimary) {
      await sql`UPDATE public.product_images SET is_primary = false WHERE product_id = ${productId}`;
    } else {
      // If this is the FIRST image, make it primary automatically
      const count =
        await sql`SELECT count(*) FROM public.product_images WHERE product_id = ${productId}`;
      if (parseInt(count[0].count) === 0) {
        isPrimary = true;
      }
    }

    const newImage = await sql`
      INSERT INTO public.product_images (product_id, image_url, is_primary)
      VALUES (${productId}, ${publicUrl}, ${isPrimary})
      RETURNING *
    `;

    return newImage[0];
  }

  async deleteProductImage(imageId) {
    const image =
      await sql`SELECT * FROM public.product_images WHERE id = ${imageId}`;
    if (image.length === 0) throw new Error("Image not found");

    // Delete from DB
    await sql`DELETE FROM public.product_images WHERE id = ${imageId}`;

    // Trigger cleanup from storage if needed?
    // We'd need to parse the filename from URL.

    return true;
  }

  async setPrimaryImage(imageId) {
    const image =
      await sql`SELECT * FROM public.product_images WHERE id = ${imageId}`;
    if (image.length === 0) throw new Error("Image not found");
    const productId = image[0].product_id;

    await sql`UPDATE public.product_images SET is_primary = false WHERE product_id = ${productId}`;
    await sql`UPDATE public.product_images SET is_primary = true WHERE id = ${imageId}`;

    return true;
  }
}

module.exports = new ProductService();

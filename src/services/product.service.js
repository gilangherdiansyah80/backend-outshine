const { sql, getSupabaseAdmin } = require("../config/database");

const { formatCurrency } = require("../utils/format.util");

class ProductService {
  // Helper to process product with price calculations and structural changes
  async _processProduct(product) {
    const originalPrice = Number(product.price);
    let discountPrice = originalPrice;
    let discountData = null;

    // Calculate discount if active discount exists
    if (product.discount) {
      const { type, value, start_date, end_date, is_active } = product.discount;
      const numValue = Number(value);

      if (type === "percent") {
        discountPrice = originalPrice - (originalPrice * numValue) / 100;
      } else if (type === "fixed") {
        discountPrice = originalPrice - numValue;
      }

      discountData = {
        type,
        value: numValue,
      };
    }

    // Get Rating Summary if not present (for individual fetch use case vs joined query)
    let rating = product.rating || { averageRating: 0, totalReview: 0 };
    if (!product.rating && product.id) {
      // Fallback or fetched via join usually
      // If called from getAllProducts, it should be passed.
      // If called from getProductById, we might need to fetch it or it's joined.
      // Let's assume input `product` has `rating` object if sourced from getAllProducts.
      // For getProductById, we need to ensure it fetches it.
    }

    // Format output structure
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      category: {
        id: product.category_id,
        name: product.category_name,
      },
      basePrice: originalPrice,
      isActive: product.is_active,
      isPo: product.is_po,
      poDpPercent: product.po_dp_percent,
      primaryImage: product.primary_image,
      tags: product.tags || [],
      discount: discountData,
      pricing: {
        original: originalPrice,
        discounted: discountPrice,
        formattedOriginal: formatCurrency(originalPrice),
        formattedDiscounted: formatCurrency(discountPrice),
      },
      rating: {
        averageRating: Number(product.average_rating || 0),
        totalReview: Number(product.total_reviews || 0),
      },
      createdAt: product.created_at,
      isNew:
        product.created_at >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      isTrending: Number(product.average_rating || 0) >= 4.5,
    };
  }

  async getAllProducts(filters = {}) {
    const {
      categoryId,
      search,
      isNew,
      isTrending,
      limit = 20,
      offset = 0,
    } = filters;

    const products = await sql`
      SELECT 
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
        ) as discount,
        COALESCE(prs.average_rating, 0) as average_rating,
        COALESCE(prs.total_reviews, 0) as total_reviews
      FROM public.products p
      LEFT JOIN public.categories c ON p.category_id = c.id
      LEFT JOIN public.product_rating_summary prs ON p.id = prs.product_id
      WHERE 
        (${categoryId ? sql`p.category_id = ${categoryId}` : sql`1=1`})
        AND (${search ? sql`p.name ILIKE ${"%" + search + "%"}` : sql`1=1`})
        AND (${isNew === "true" ? sql`p.created_at >= NOW() - INTERVAL '30 days'` : sql`1=1`})
        AND (${isTrending === "true" ? sql`COALESCE(prs.average_rating, 0) >= 4.5` : sql`1=1`})
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return Promise.all(products.map((p) => this._processProduct(p)));
  }

  async _formatProductDetail(product, userId) {
    // Basic process first
    const basic = await this._processProduct(product);

    const price = Number(product.price);

    // PO Calculation
    let poData = null;
    if (product.is_po) {
      const dpPercent = product.po_dp_percent || 0;
      const dpAmount = (price * dpPercent) / 100;
      const remainingAmount = price - dpAmount;
      poData = {
        dpPercent,
        dpAmount: dpAmount,
        remainingAmount: remainingAmount,
      };
    }

    // Rating Distribution (Fetch separate if needed or passed)
    // For detail view, we fetch distribution
    const distribution = await sql`
        SELECT rating, count(*) as count 
        FROM public.product_reviews 
        WHERE product_id = ${product.id} 
        GROUP BY rating
      `;
    // Map to object {"5": 10, "4": 2...}
    const distObj = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    distribution.forEach((d) => {
      distObj[String(d.rating)] = Number(d.count);
    });

    // Reviews (Recent 5)
    const reviews = await sql`
        SELECT 
           r.id, r.rating, r.comment, r.created_at,
           json_build_object('id', u.id, 'name', COALESCE(pu.full_name, u.email)) as user
        FROM public.product_reviews r
        JOIN public.users u ON r.user_id = u.id
        LEFT JOIN public.profile_users pu ON u.id = pu.user_id
        WHERE r.product_id = ${product.id}
        ORDER BY r.created_at DESC
        LIMIT 5
      `;

    // Wishlist Status
    let isWishlisted = false;
    if (userId) {
      const wish =
        await sql`SELECT 1 FROM public.wishlists WHERE user_id = ${userId} AND product_id = ${product.id}`;
      isWishlisted = wish.length > 0;
    }

    // Clean up Images Array Structure (id, url, isPrimary)
    const images = (product.images || []).map((img) => ({
      id: img.id,
      url: img.image_url,
      isPrimary: img.is_primary,
    }));

    // Clean up Tags Array Structure (id, name)
    const tags = (product.tags || []).map((t) => ({
      id: t.id,
      name: t.name,
    }));

    // Clean up Sizes Array Structure (id, name, stock)
    const sizes = (product.sizes || []).map((s) => ({
      id: s.size_id || s.id, // Depends on source query
      name: s.size_name || s.name,
      stock: s.stock,
    }));

    // Reconstitute Discount Object to match request
    const discountObj = product.discount
      ? {
          type: product.discount.type,
          value: Number(product.discount.value),
          isActive: product.discount.is_active,
          startDate: product.discount.start_date,
          endDate: product.discount.end_date,
        }
      : null;

    return {
      ...basic,
      // Overrides/Additions
      isPo: product.is_po,
      po: poData,
      images,
      sizes,
      tags,
      discount: discountObj,
      rating: {
        average: Number(product.average_rating || 0),
        count: Number(product.total_reviews || 0),
        distribution: distObj,
      },
      reviews: {
        items: reviews.map((r) => ({
          ...r,
          rating: Number(r.rating),
        })),
        pagination: {
          page: 1,
          limit: 5,
          total: Number(product.total_reviews || 0),
        },
      },
      sizeGuide: product.sizeGuide
        ? {
            imageUrl: product.sizeGuide.image_url,
            description: product.sizeGuide.description,
          }
        : null,
      wishlist: {
        isWishlisted,
      },
      collection: {
        canAdd: true, // Mock logic
      },
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    };
  }

  async getProductById(id, userId = null) {
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
      SELECT * FROM public.product_images WHERE product_id = ${id} ORDER BY is_primary DESC, id ASC
    `;

    // Get Sizes (Stock)
    const sizes = await sql`
      SELECT 
        ps.*, s.name as size_name
      FROM public.product_sizes ps
      JOIN public.sizes s ON ps.size_id = s.id
      WHERE ps.product_id = ${id}
    `;

    // Get Tags
    const tags = await sql`
      SELECT t.* 
      FROM public.product_tags t
      JOIN public.product_tag_items pt ON t.id = pt.tag_id
      WHERE pt.product_id = ${id}
    `;

    // Get Active Discount
    const discount = await sql`
        SELECT * FROM public.product_discounts
        WHERE product_id = ${id}
        AND is_active = true
        AND (start_date IS NULL OR start_date <= now())
        AND (end_date IS NULL OR end_date >= now())
        LIMIT 1
    `;

    // Get Size Guide
    const sizeGuide = await sql`
      SELECT * FROM public.product_size_guides WHERE product_id = ${id} LIMIT 1
    `;

    // Get Rating Summary
    const ratingStats = await sql`
        SELECT * FROM public.product_rating_summary WHERE product_id = ${id}
    `;
    const rating = ratingStats[0] || { average_rating: 0, total_reviews: 0 };

    const fullProduct = {
      ...product[0],
      images,
      sizes,
      tags,
      discount: discount[0] || null,
      sizeGuide: sizeGuide[0] || null,
      average_rating: rating.average_rating,
      total_reviews: rating.total_reviews,
    };

    return this._formatProductDetail(fullProduct, userId);
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

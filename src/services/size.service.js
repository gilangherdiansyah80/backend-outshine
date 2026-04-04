const { sql } = require("../config/database");

class SizeService {
  async getAllSizes() {
    const sizes = await sql`SELECT * FROM public.sizes ORDER BY name ASC`;
    return sizes;
  }

  async createSize(name) {
    const newSize = await sql`
      INSERT INTO public.sizes (name) VALUES (${name}) RETURNING *
    `;
    return newSize[0];
  }

  async getSizesByProductId(productId) {
    const sizes = await sql`
      SELECT ps.*, s.name 
      FROM public.product_sizes ps
      JOIN public.sizes s ON ps.size_id = s.id
      WHERE ps.product_id = ${productId}
      ORDER BY s.name ASC
    `;
    return sizes;
  }

  async addProductSize(productId, sizeId, stock) {
    // Check if exists first to avoid duplicate key error or just UPSERT?
    // Schema PK is (product_id, size_id)

    // Using UPSERT style for robustness
    const productSize = await sql`
      INSERT INTO public.product_sizes (product_id, size_id, stock)
      VALUES (${productId}, ${sizeId}, ${stock})
      ON CONFLICT (product_id, size_id) 
      DO UPDATE SET stock = ${stock}
      RETURNING *
    `;
    return productSize[0];
  }

  async updateProductSizeStock(productId, sizeId, stock) {
    const updated = await sql`
        UPDATE public.product_sizes
        SET stock = ${stock}
        WHERE product_id = ${productId} AND size_id = ${sizeId}
        RETURNING *
      `;
    if (updated.length === 0) {
      throw new Error("Product Size not found");
    }
    return updated[0];
  }

  async updateSize(id, name) {
    const updated = await sql`
      UPDATE public.sizes 
      SET name = ${name} 
      WHERE id = ${id} 
      RETURNING *
    `;
    if (updated.length === 0) {
      throw new Error("Size not found");
    }
    return updated[0];
  }

  async deleteSize(id) {
    // Check if being used by products first?
    // Depending on DB constraints, this might fail automatically.
    // Assuming we want a clean delete.
    const deleted = await sql`
      DELETE FROM public.sizes 
      WHERE id = ${id} 
      RETURNING *
    `;
    if (deleted.length === 0) {
      throw new Error("Size not found");
    }
    return true;
  }
}

module.exports = new SizeService();

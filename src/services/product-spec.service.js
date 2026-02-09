const { sql } = require("../config/database");

class ProductSpecService {
  async getSpecsByProduct(productId) {
    const specs = await sql`
      SELECT * FROM public.product_specs 
      WHERE product_id = ${productId}
      ORDER BY created_at ASC
    `;
    return specs;
  }

  async getSpecById(id) {
    const specs = await sql`
      SELECT * FROM public.product_specs 
      WHERE id = ${id}
    `;

    if (specs.length === 0) {
      throw new Error("Specification not found");
    }

    return specs[0];
  }

  async createSpec(productId, specData) {
    const { key, value } = specData;

    const newSpec = await sql`
      INSERT INTO public.product_specs (product_id, key, value)
      VALUES (${productId}, ${key}, ${value})
      RETURNING *
    `;

    return newSpec[0];
  }

  async updateSpec(id, specData) {
    const { key, value } = specData;

    const updatedSpec = await sql`
      UPDATE public.product_specs
      SET 
        key = COALESCE(${key ?? null}, key),
        value = COALESCE(${value ?? null}, value)
      WHERE id = ${id}
      RETURNING *
    `;

    if (updatedSpec.length === 0) {
      throw new Error("Specification not found");
    }

    return updatedSpec[0];
  }

  async deleteSpec(id) {
    const deleted = await sql`
      DELETE FROM public.product_specs
      WHERE id = ${id}
      RETURNING *
    `;

    if (deleted.length === 0) {
      throw new Error("Specification not found");
    }

    return true;
  }
}

module.exports = new ProductSpecService();

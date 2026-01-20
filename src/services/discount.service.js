const { sql } = require("../config/database");

class DiscountService {
  async getDiscountByProductId(productId) {
    const discounts = await sql`
      SELECT * FROM public.product_discounts 
      WHERE product_id = ${productId}

      -- Schema has start_date, end_date. Schema provided in prompt doesn't show created_at for discounts explicitly but usually helps.
      -- Wait, the schema provided:
      -- CREATE TABLE public.product_discounts ( ..., start_date timestamp without time zone, end_date timestamp without time zone, is_active boolean DEFAULT true, ... );
      -- It does NOT have created_at. So I'll just order by id or start_date.
    `;
    return discounts;
  }

  async getActiveDiscountByProductId(productId) {
    const discounts = await sql`
        SELECT * FROM public.product_discounts
        WHERE product_id = ${productId}
        AND is_active = true
        AND (start_date IS NULL OR start_date <= now())
        AND (end_date IS NULL OR end_date >= now())
        LIMIT 1
    `;
    return discounts[0];
  }

  async createDiscount(productId, discountData) {
    const { type, value, startDate, endDate, isActive = true } = discountData;

    // Optional: Deactivate other active discounts for this product?
    // For now, let's just insert.

    const newDiscount = await sql`
      INSERT INTO public.product_discounts (
        product_id, type, value, start_date, end_date, is_active
      )
      VALUES (
        ${productId}, ${type}, ${value}, ${startDate}, ${endDate}, ${isActive}
      )
      RETURNING *
    `;
    return newDiscount[0];
  }

  async updateDiscount(id, discountData) {
    const { type, value, startDate, endDate, isActive } = discountData;

    // Check existence
    const existing =
      await sql`SELECT * FROM public.product_discounts WHERE id = ${id}`;
    if (existing.length === 0) throw new Error("Discount not found");

    // Prepare update payload (mapping camelCase to snake_case)
    const updatePayload = {};
    if (type !== undefined) updatePayload.type = type;
    if (value !== undefined) updatePayload.value = value;
    if (startDate !== undefined) updatePayload.start_date = startDate;
    if (endDate !== undefined) updatePayload.end_date = endDate;
    if (isActive !== undefined) updatePayload.is_active = isActive;

    if (Object.keys(updatePayload).length === 0) {
      return existing[0]; // Nothing to update
    }

    const updatedDiscount = await sql`
      UPDATE public.product_discounts
      SET ${sql(updatePayload)}
      WHERE id = ${id}
      RETURNING *
    `;
    return updatedDiscount[0];
  }

  async deleteDiscount(id) {
    const existing =
      await sql`SELECT * FROM public.product_discounts WHERE id = ${id}`;
    if (existing.length === 0) throw new Error("Discount not found");

    await sql`DELETE FROM public.product_discounts WHERE id = ${id}`;
    return true;
  }
}

module.exports = new DiscountService();

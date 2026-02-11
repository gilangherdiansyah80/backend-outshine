const { sql } = require("../config/database");

class PaymentMethodService {
  async getAllMethods() {
    const methods =
      await sql`SELECT * FROM public.payment_methods ORDER BY created_at DESC`;
    return methods;
  }

  async getActiveMethods() {
    const methods =
      await sql`SELECT * FROM public.payment_methods WHERE is_active = true ORDER BY name ASC`;
    return methods;
  }

  async getMethodById(id) {
    const method =
      await sql`SELECT * FROM public.payment_methods WHERE id = ${id}`;
    return method[0];
  }

  async createMethod(data) {
    const { code, name, accountNumber, accountHolder, instructions, isActive } =
      data;

    // Pass instructions directly (postgres library handles objects/arrays for jsonb columns)
    const instructionsJson = instructions;

    const newMethod = await sql`
        INSERT INTO public.payment_methods (code, name, account_number, account_holder, instructions, is_active)
        VALUES (${code}, ${name}, ${accountNumber}, ${accountHolder}, ${instructionsJson}, ${isActive})
        RETURNING *
    `;
    return newMethod[0];
  }

  async updateMethod(id, data) {
    const { code, name, accountNumber, accountHolder, instructions, isActive } =
      data;

    const instructionsJson = Array.isArray(instructions)
      ? JSON.stringify(instructions)
      : instructions;

    const updatedMethod = await sql`
        UPDATE public.payment_methods
        SET 
            code = COALESCE(${code}, code),
            name = COALESCE(${name}, name),
            account_number = COALESCE(${accountNumber}, account_number),
            account_holder = COALESCE(${accountHolder}, account_holder),
            instructions = COALESCE(${instructionsJson}, instructions),
            is_active = COALESCE(${isActive}, is_active),
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
    `;
    return updatedMethod[0];
  }

  async deleteMethod(id) {
    const deleted = await sql`
        DELETE FROM public.payment_methods WHERE id = ${id}
        RETURNING *
    `;
    return deleted[0];
  }
}

module.exports = new PaymentMethodService();

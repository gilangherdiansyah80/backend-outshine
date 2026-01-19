const { sql } = require("../config/database");

class AddressService {
  async getAddresses(userId) {
    const addresses = await sql`
      SELECT * FROM public.user_addresses 
      WHERE user_id = ${userId}
      ORDER BY is_default DESC, created_at DESC
    `;
    return addresses;
  }

  async getAddressById(addressId, userId) {
    const addresses = await sql`
      SELECT * FROM public.user_addresses 
      WHERE id = ${addressId} AND user_id = ${userId}
    `;

    if (addresses.length === 0) {
      throw new Error("Address not found");
    }

    return addresses[0];
  }

  async addAddress(userId, addressData) {
    const { fullName, phone, street, city, province, postalCode, isDefault } =
      addressData;

    // If setting as default, unset other defaults first
    if (isDefault) {
      await sql`
        UPDATE public.user_addresses 
        SET is_default = false 
        WHERE user_id = ${userId}
      `;
    }

    // Check if this is the first address, make it default automatically if so
    const countResult =
      await sql`SELECT count(*) FROM public.user_addresses WHERE user_id = ${userId}`;
    const isFirstAddress = parseInt(countResult[0].count) === 0;
    const shouldBeDefault = isDefault || isFirstAddress;

    const newAddress = await sql`
      INSERT INTO public.user_addresses (
        user_id, full_name, phone, street, city, province, postal_code, is_default
      )
      VALUES (
        ${userId}, ${fullName}, ${phone}, ${street}, ${city}, ${province}, ${postalCode}, ${shouldBeDefault}
      )
      RETURNING *
    `;

    return newAddress[0];
  }

  async updateAddress(userId, addressId, addressData) {
    const { fullName, phone, street, city, province, postalCode, isDefault } =
      addressData;

    // Check existence
    await this.getAddressById(addressId, userId);

    // If setting as default, unset other defaults first
    if (isDefault) {
      await sql`
        UPDATE public.user_addresses 
        SET is_default = false 
        WHERE user_id = ${userId}
      `;
    }

    const updatedAddress = await sql`
      UPDATE public.user_addresses
      SET 
        full_name = ${fullName},
        phone = ${phone},
        street = ${street},
        city = ${city},
        province = ${province},
        postal_code = ${postalCode},
        is_default = CASE WHEN ${isDefault} IS NOT NULL THEN ${isDefault} ELSE is_default END,
        updated_at = now()
      WHERE id = ${addressId} AND user_id = ${userId}
      RETURNING *
    `;

    return updatedAddress[0];
  }

  async deleteAddress(userId, addressId) {
    // Check existence
    await this.getAddressById(addressId, userId);

    await sql`
      DELETE FROM public.user_addresses
      WHERE id = ${addressId} AND user_id = ${userId}
    `;

    return true;
  }

  async setDefaultAddress(userId, addressId) {
    // Check existence
    await this.getAddressById(addressId, userId);

    // Unset all first
    await sql`
      UPDATE public.user_addresses 
      SET is_default = false 
      WHERE user_id = ${userId}
    `;

    // Set new default
    const updatedAddress = await sql`
      UPDATE public.user_addresses
      SET is_default = true, updated_at = now()
      WHERE id = ${addressId} AND user_id = ${userId}
      RETURNING *
    `;

    return updatedAddress[0];
  }
}

module.exports = new AddressService();

const { sql } = require("../config/database");

class TagService {
  async getAllTags() {
    const tags = await sql`
      SELECT * FROM public.product_tags 
      ORDER BY name ASC
    `;
    return tags;
  }

  async createTag(name) {
    // Check if exists
    const existing =
      await sql`SELECT * FROM public.product_tags WHERE name = ${name}`;
    if (existing.length > 0) {
      return existing[0];
    }

    const newTag = await sql`
      INSERT INTO public.product_tags (name)
      VALUES (${name})
      RETURNING *
    `;
    return newTag[0];
  }

  async updateTag(id, name) {
    // Check if exists
    const existing =
      await sql`SELECT * FROM public.product_tags WHERE id = ${id}`;
    if (existing.length === 0) throw new Error("Tag not found");

    // Check name uniqueness if changed
    if (name !== existing[0].name) {
      const duplicate =
        await sql`SELECT * FROM public.product_tags WHERE name = ${name}`;
      if (duplicate.length > 0) throw new Error("Tag name already exists");
    }

    const updatedTag = await sql`
      UPDATE public.product_tags
      SET name = ${name}
      WHERE id = ${id}
      RETURNING *
    `;
    return updatedTag[0];
  }

  async deleteTag(id) {
    // Check if exists
    const existing =
      await sql`SELECT * FROM public.product_tags WHERE id = ${id}`;
    if (existing.length === 0) throw new Error("Tag not found");

    // Delete relation first? or Cascade?
    // Assuming Cascade is NOT set or we want to be safe:
    await sql`DELETE FROM public.product_tag_items WHERE tag_id = ${id}`;

    await sql`DELETE FROM public.product_tags WHERE id = ${id}`;
    return true;
  }

  async addProductTag(productId, tagId) {
    // Check if tag exists
    const tag =
      await sql`SELECT * FROM public.product_tags WHERE id = ${tagId}`;
    if (tag.length === 0) throw new Error("Tag not found");

    // Check if relation exists
    const existing = await sql`
      SELECT * FROM public.product_tag_items 
      WHERE product_id = ${productId} AND tag_id = ${tagId}
    `;

    if (existing.length > 0) return existing[0];

    const newRelation = await sql`
      INSERT INTO public.product_tag_items (product_id, tag_id)
      VALUES (${productId}, ${tagId})
      RETURNING *
    `;
    return newRelation[0];
  }

  async removeProductTag(productId, tagId) {
    await sql`
      DELETE FROM public.product_tag_items 
      WHERE product_id = ${productId} AND tag_id = ${tagId}
    `;
    return true;
  }

  async getTagsByProductId(productId) {
    const tags = await sql`
      SELECT t.* 
      FROM public.product_tags t
      JOIN public.product_tag_items pt ON t.id = pt.tag_id
      WHERE pt.product_id = ${productId}
    `;
    return tags;
  }
}

module.exports = new TagService();

const { sql } = require("../config/database");

class CollectionService {
  async getUserCollections(userId) {
    const collections = await sql`
      SELECT * FROM public.collections 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return collections;
  }

  async createCollection(userId, name) {
    const newCollection = await sql`
      INSERT INTO public.collections (user_id, name)
      VALUES (${userId}, ${name})
      RETURNING *
    `;
    return newCollection[0];
  }

  async deleteCollection(userId, collectionId) {
    // Check ownership
    const collection = await sql`
        SELECT * FROM public.collections WHERE id = ${collectionId} AND user_id = ${userId}
    `;
    if (collection.length === 0)
      throw new Error("Collection not found or access denied");

    // Items cascade delete? DB foreign key might not handle it if not set to CASCADE.
    // Let's delete items first to be safe.
    await sql`DELETE FROM public.collection_items WHERE collection_id = ${collectionId}`;
    await sql`DELETE FROM public.collections WHERE id = ${collectionId}`;
    return true;
  }

  async getCollectionProducts(userId, collectionId) {
    // Verify ownership first
    const collection = await sql`
        SELECT * FROM public.collections WHERE id = ${collectionId} AND user_id = ${userId}
     `;
    if (collection.length === 0)
      throw new Error("Collection not found or access denied");

    const products = await sql`
       SELECT 
         p.*,
         (
             SELECT image_url 
             FROM public.product_images pi 
             WHERE pi.product_id = p.id AND pi.is_primary = true 
             LIMIT 1
         ) as primary_image
       FROM public.collection_items ci
       JOIN public.products p ON ci.product_id = p.id
       WHERE ci.collection_id = ${collectionId}
     `;
    return products;
  }

  async addProductToCollection(userId, collectionId, productId) {
    // Verify ownership
    const collection = await sql`
        SELECT * FROM public.collections WHERE id = ${collectionId} AND user_id = ${userId}
    `;
    if (collection.length === 0)
      throw new Error("Collection not found or access denied");

    // Add item (ignore if exists)
    const newItem = await sql`
      INSERT INTO public.collection_items (collection_id, product_id)
      VALUES (${collectionId}, ${productId})
      ON CONFLICT (collection_id, product_id) DO NOTHING
      RETURNING *
    `;
    return newItem[0] || { message: "Product already in collection" };
  }

  async removeProductFromCollection(userId, collectionId, productId) {
    // Verify ownership
    const collection = await sql`
        SELECT * FROM public.collections WHERE id = ${collectionId} AND user_id = ${userId}
    `;
    if (collection.length === 0)
      throw new Error("Collection not found or access denied");

    await sql`
      DELETE FROM public.collection_items 
      WHERE collection_id = ${collectionId} AND product_id = ${productId}
    `;
    return true;
  }
}

module.exports = new CollectionService();

const { sql, getSupabaseAdmin } = require("../config/database");

class CategoryService {
  async getAllCategories() {
    const categories = await sql`
      SELECT * FROM public.categories 
      ORDER BY name ASC
    `;
    return categories;
  }

  async getCategoryById(id) {
    const categories = await sql`
      SELECT * FROM public.categories 
      WHERE id = ${id}
    `;

    if (categories.length === 0) {
      throw new Error("Category not found");
    }

    return categories[0];
  }

  async createCategory(categoryData, file) {
    const { name } = categoryData;
    let imageUrl = null;

    // Handle Image Upload if file exists
    if (file) {
      imageUrl = await this.uploadCategoryImage(file);
    }

    const newCategory = await sql`
      INSERT INTO public.categories (name, image_url)
      VALUES (${name}, ${imageUrl})
      RETURNING *
    `;

    return newCategory[0];
  }

  async updateCategory(id, categoryData, file) {
    const { name } = categoryData;

    // Check existence
    const currentCategory = await this.getCategoryById(id);
    let imageUrl = currentCategory.image_url;

    // Handle Image Upload if new file exists
    if (file) {
      imageUrl = await this.uploadCategoryImage(file);
      // Optional: Delete old image from storage if needed (skipping for simplicity)
    }

    const updatedCategory = await sql`
      UPDATE public.categories
      SET 
        name = ${name || currentCategory.name},
        image_url = ${imageUrl},
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;

    return updatedCategory[0];
  }

  async deleteCategory(id) {
    // Check existence
    await this.getCategoryById(id);

    await sql`
      DELETE FROM public.categories
      WHERE id = ${id}
    `;

    return true;
  }

  // Helper to upload image
  async uploadCategoryImage(file) {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not configured");
    }

    const fileExt = file.originalname.split(".").pop();
    const fileName = `categories/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Ensure 'categories' bucket exists or reuse 'user-content' or a general 'public' bucket.
    // I'll assume 'user-content' for now or 'categories' if user created it.
    // Best to stick to one public bucket if possible or guide user.
    // Let's use 'user-content' for simplicity as it's already PUBLIC.
    const bucketName = "user-content";

    const { error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucketName).getPublicUrl(fileName);

    return publicUrl;
  }
}

module.exports = new CategoryService();

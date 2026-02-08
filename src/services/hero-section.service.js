const { sql, getSupabaseAdmin } = require("../config/database");

class HeroSectionService {
  async getAllHeroSections() {
    const heroSections = await sql`
      SELECT * FROM public.hero_sections 
      ORDER BY created_at DESC
    `;
    return heroSections;
  }

  async getHeroSectionById(id) {
    const heroSections = await sql`
      SELECT * FROM public.hero_sections 
      WHERE id = ${id}
    `;

    if (heroSections.length === 0) {
      throw new Error("Hero section not found");
    }

    return heroSections[0];
  }

  async createHeroSection(heroData, file) {
    const { badge_text, title, button_text, is_active } = heroData;

    let backgroundImage = null;

    if (file) {
      backgroundImage = await this.uploadHeroImage(file);
    } else if (heroData.background_image) {
      backgroundImage = heroData.background_image;
    }

    if (!backgroundImage) {
      throw new Error("Background image is required");
    }

    const newHeroSection = await sql`
      INSERT INTO public.hero_sections (
        badge_text,
        title,
        button_text,
        background_image,
        is_active
      )
      VALUES (
        ${badge_text || null},
        ${title},
        ${button_text},
        ${backgroundImage},
        ${is_active !== undefined ? is_active : true}
      )
      RETURNING *
    `;

    return newHeroSection[0];
  }

  async updateHeroSection(id, heroData, file) {
    const currentHero = await this.getHeroSectionById(id);

    let backgroundImage = currentHero.background_image;
    if (file) {
      backgroundImage = await this.uploadHeroImage(file);
    } else if (heroData.background_image) {
      backgroundImage = heroData.background_image;
    }

    const updatedHeroSection = await sql`
      UPDATE public.hero_sections
      SET 
        badge_text = ${heroData.badge_text !== undefined ? heroData.badge_text : currentHero.badge_text},
        title = ${heroData.title || currentHero.title},
        button_text = ${heroData.button_text || currentHero.button_text},
        background_image = ${backgroundImage},
        is_active = ${heroData.is_active !== undefined ? heroData.is_active : currentHero.is_active},
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;

    return updatedHeroSection[0];
  }

  async deleteHeroSection(id) {
    await this.getHeroSectionById(id);

    await sql`
      DELETE FROM public.hero_sections
      WHERE id = ${id}
    `;

    return true;
  }

  async uploadHeroImage(file) {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not configured");
    }

    const fileExt = file.originalname.split(".").pop();
    const fileName = `hero-sections/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
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

module.exports = new HeroSectionService();

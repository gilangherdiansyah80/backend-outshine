const { sql, getSupabaseAdmin } = require("../config/database");

class UserService {
  async getProfile(userId) {
    const users = await sql`
      SELECT 
        u.id, 
        u.email, 
        u.role_id, 
        u.is_active,
        r.name as role_name,
        p.full_name, 
        p.avatar_url, 
        p.phone,
        u.created_at
      FROM public.users u
      LEFT JOIN public.roles r ON u.role_id = r.id
      LEFT JOIN public.profile_users p ON u.id = p.user_id
      WHERE u.id = ${userId}
    `;

    if (users.length === 0) {
      throw new Error("User not found");
    }

    return users[0];
  }

  async updateProfile(userId, updateData) {
    const { fullName, phone } = updateData;

    // Check if profile exists
    const profiles = await sql`
      SELECT id FROM public.profile_users WHERE user_id = ${userId}
    `;

    if (profiles.length === 0) {
      // Create profile if not exists
      await sql`
        INSERT INTO public.profile_users (user_id, full_name, phone)
        VALUES (${userId}, ${fullName}, ${phone})
      `;
    } else {
      // Update existing profile
      // Using COALESCE to keep existing values if new ones are null/undefined,
      // but here we expect the controller to validate or pass what's needed.
      // We'll update only provided fields.

      if (fullName !== undefined) {
        await sql`
          UPDATE public.profile_users SET full_name = ${fullName} WHERE user_id = ${userId}
        `;
      }

      if (phone !== undefined) {
        await sql`
            UPDATE public.profile_users SET phone = ${phone} WHERE user_id = ${userId}
        `;
      }
    }

    return this.getProfile(userId);
  }

  async updateAvatar(userId, file) {
    // 1. Upload to Supabase Storage using Admin Client (bypasses RLS)
    const supabaseAdmin = getSupabaseAdmin();

    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not configured");
    }

    const fileExt = file.originalname.split(".").pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { data, error } = await supabaseAdmin.storage
      .from("user-content") // Make sure this bucket exists and is public if you want publicUrl to work
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // 2. Get Public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("user-content").getPublicUrl(filePath);

    // 3. Update Profile in DB
    const profiles = await sql`
      SELECT id FROM public.profile_users WHERE user_id = ${userId}
    `;

    if (profiles.length === 0) {
      await sql`
        INSERT INTO public.profile_users (user_id, avatar_url)
        VALUES (${userId}, ${publicUrl})
      `;
    } else {
      await sql`
          UPDATE public.profile_users SET avatar_url = ${publicUrl} WHERE user_id = ${userId}
        `;
    }

    return { avatarUrl: publicUrl };
  }

  async getAllCustomers() {
    const customers = await sql`
      SELECT 
        u.id, 
        u.email, 
        u.is_active,
        r.name as role_name,
        p.full_name, 
        p.avatar_url, 
        p.phone,
        u.created_at
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      LEFT JOIN public.profile_users p ON u.id = p.user_id
      WHERE r.name = 'customer'
      ORDER BY u.created_at DESC
    `;

    return customers;
  }
}

module.exports = new UserService();

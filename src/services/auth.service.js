const { sql } = require("../config/database");
const bcrypt = require("bcryptjs");
const { generateToken, generateRefreshToken } = require("../utils/jwt.util");
const { sendOtpEmail } = require("../utils/mail.util");
const crypto = require("crypto");

class AuthService {
  generateOtp() {
    return crypto.randomInt(100000, 999999).toString();
  }

  async register(userData) {
    const { email, password, fullName, phone } = userData;

    // Check if user already exists
    const existingUsers = await sql`
      SELECT id FROM public.users WHERE email = ${email}
    `;

    if (existingUsers.length > 0) {
      throw new Error("Email already registered");
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Get default role (customer)
    // Assuming 'customer' role exists. If not, you might need to insert it or handle it.
    // Ideally, we fetch the role ID for 'customer'
    let roles = await sql`SELECT id FROM public.roles WHERE name = 'customer'`;
    let roleId = null;

    if (roles.length === 0) {
      // Create customer role if not exists (Optional, depending on business logic)
      const newRole =
        await sql`INSERT INTO public.roles (name) VALUES ('customer') RETURNING id`;
      roleId = newRole[0].id;
    } else {
      roleId = roles[0].id;
    }

    // Insert user
    const newUser = await sql`
      INSERT INTO public.users (email, password, role_id, is_active)
      VALUES (${email}, ${hashedPassword}, ${roleId}, false)
      RETURNING id, email, role_id
    `;

    const userId = newUser[0].id;

    // Create profile
    await sql`
      INSERT INTO public.profile_users (user_id, full_name, phone)
      VALUES (${userId}, ${fullName}, ${phone})
    `;

    // Generate and Send OTP
    const otpCode = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await sql`
      INSERT INTO public.email_otps (user_id, email, otp_code, expires_at)
      VALUES (${userId}, ${email}, ${otpCode}, ${expiresAt})
    `;

    await sendOtpEmail(email, otpCode);

    return {
      id: userId,
      email: newUser[0].email,
      message:
        "Registrasi berhasil. Silakan cek email Anda untuk kode verifikasi.",
    };
  }

  async login(email, password) {
    const users = await sql`
      SELECT u.id, u.email, u.password, u.role_id, u.is_active, r.name as role_name, p.full_name
      FROM public.users u
      LEFT JOIN public.roles r ON u.role_id = r.id
      LEFT JOIN public.profile_users p ON u.id = p.user_id
        WHERE u.email = ${email}
    `;

    if (users.length === 0) {
      throw new Error("Invalid email or password");
    }

    const user = users[0];

    if (!user.is_active) {
      throw new Error("Akun Anda belum aktif. Silakan verifikasi email Anda.");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new Error("Invalid email or password");
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role_name,
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role_name,
      },
      token,
      refreshToken,
    };
  }

  // Placeholder for logout (stateless JWT usually just client side, or blacklist)
  async logout() {
    return true;
  }

  // Verify OTP
  async verifyOtp(email, otpCode) {
    const otps = await sql`
      SELECT * FROM public.email_otps 
      WHERE email = ${email} AND otp_code = ${otpCode} AND is_used = false
      ORDER BY created_at DESC LIMIT 1
    `;

    if (otps.length === 0) {
      throw new Error("Kode OTP tidak valid atau sudah kadaluarsa");
    }

    const otp = otps[0];
    if (new Date() > new Date(otp.expires_at)) {
      throw new Error("Kode OTP sudah kadaluarsa");
    }

    // Update user and OTP
    await sql.begin(async (sql) => {
      await sql`
        UPDATE public.users 
        SET is_active = true, email_verified_at = NOW() 
        WHERE email = ${email}
      `;
      await sql`
        UPDATE public.email_otps 
        SET is_used = true 
        WHERE id = ${otp.id}
      `;
    });

    return {
      message: "Email berhasil diverifikasi. Akun Anda sekarang aktif.",
    };
  }

  // Resend OTP
  async resendOtp(email) {
    const users =
      await sql`SELECT id, is_active FROM public.users WHERE email = ${email}`;
    if (users.length === 0) {
      throw new Error("Email tidak terdaftar");
    }

    if (users[0].is_active) {
      throw new Error("Akun sudah aktif");
    }

    const userId = users[0].id;
    const otpCode = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Invalidate old OTPs for this email if any
    await sql`UPDATE public.email_otps SET is_used = true WHERE email = ${email} AND is_used = false`;

    await sql`
      INSERT INTO public.email_otps (user_id, email, otp_code, expires_at)
      VALUES (${userId}, ${email}, ${otpCode}, ${expiresAt})
    `;

    await sendOtpEmail(email, otpCode);

    return { message: "Kode OTP baru telah dikirim ke email Anda." };
  }

  // Refresh token
  async refreshToken(token) {
    // Verify logic here (usually verifies the refresh token and issues new pair)
    // For simplicity, we just re-issue if valid
    // In production, check against DB if refresh token is revoked/valid
    return true;
  }
}

module.exports = new AuthService();

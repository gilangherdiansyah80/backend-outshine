const { sql } = require("../config/database");
const bcrypt = require("bcryptjs");
const { generateToken, generateRefreshToken } = require("../utils/jwt.util");

class AuthService {
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
      INSERT INTO public.users (email, password, role_id)
      VALUES (${email}, ${hashedPassword}, ${roleId})
      RETURNING id, email, role_id
    `;

    const userId = newUser[0].id;

    // Create profile
    await sql`
      INSERT INTO public.profile_users (user_id, full_name, phone)
      VALUES (${userId}, ${fullName}, ${phone})
    `;

    return {
      id: userId,
      email: newUser[0].email,
    };
  }

  async login(email, password) {
    const users = await sql`
      SELECT u.id, u.email, u.password, u.role_id, r.name as role_name, p.full_name
      FROM public.users u
      LEFT JOIN public.roles r ON u.role_id = r.id
      LEFT JOIN public.profile_users p ON u.id = p.user_id
        WHERE u.email = ${email}
    `;

    if (users.length === 0) {
      throw new Error("Invalid email or password");
    }

    const user = users[0];
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

  // Refresh token
  async refreshToken(token) {
    // Verify logic here (usually verifies the refresh token and issues new pair)
    // For simplicity, we just re-issue if valid
    // In production, check against DB if refresh token is revoked/valid
    return true;
  }
}

module.exports = new AuthService();

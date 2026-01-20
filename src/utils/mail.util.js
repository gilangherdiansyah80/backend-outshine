const nodemailer = require("nodemailer");
const config = require("../config");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.mail.user,
    pass: config.mail.pass,
  },
});

const sendOtpEmail = async (to, otp) => {
  const mailOptions = {
    from: `"Outshine Support" <${config.mail.user}>`,
    to: to,
    subject: "Verifikasi Email - Kode OTP Anda",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">Verifikasi Akun Outshine</h2>
        <p>Halo,</p>
        <p>Terima kasih telah mendaftar di <strong>Outshine</strong>. Gunakan kode OTP di bawah ini untuk memverifikasi email Anda:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4F46E5; background: #F3F4F6; padding: 10px 20px; border-radius: 5px;">${otp}</span>
        </div>
        <p>Kode ini akan kadaluarsa dalam 10 menit. Jika Anda tidak melakukan pendaftaran ini, silakan abaikan email ini.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #888; text-align: center;">&copy; 2026 Outshine Store. All rights reserved.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Gagal mengirim email verifikasi");
  }
};

const sendResetPasswordEmail = async (to, otp) => {
  const mailOptions = {
    from: `"Outshine Support" <${config.mail.user}>`,
    to: to,
    subject: "Reset Password - Kode OTP Anda",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">Lupa Password Akun Outshine</h2>
        <p>Halo,</p>
        <p>Kami menerima permintaan untuk mereset password akun Anda. Gunakan kode OTP di bawah ini untuk melanjutkan:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #EF4444; background: #FEE2E2; padding: 10px 20px; border-radius: 5px;">${otp}</span>
        </div>
        <p>Kode ini akan kadaluarsa dalam 10 menit. Jika Anda tidak merasa melakukan permintaan ini, silakan abaikan email ini.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #888; text-align: center;">&copy; 2026 Outshine Store. All rights reserved.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reset OTP sent to ${to}`);
  } catch (error) {
    console.error("Error sending reset email:", error);
    throw new Error("Gagal mengirim email reset password");
  }
};

module.exports = {
  sendOtpEmail,
  sendResetPasswordEmail,
};

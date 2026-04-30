const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: parseInt(process.env.EMAIL_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS || process.env.FMAL_PASS
  },
  tls: {
    rejectUnauthorized: false // Helps with some cloud hosting certificate issues
  }
});

const sendOTP = async (email, otp, subject = "Verification Code - KitchenCores") => {
  console.log(`[OTP] Sending ${otp} to ${email}...`);
  
  try {
    await transporter.sendMail({
      from: `"KitchenCores" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`, 
      to: email,
      subject: subject,
      text: `Your OTP is: ${otp}. It will expire in 10 minutes.`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:16px;border:1px solid #f0f0f0">
        <h2 style="color:#ea580c;margin-bottom:8px">KitchenCores</h2>
        <p style="color:#475569">Use the OTP below for verification.</p>
        <div style="background:#fff7ed;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
          <span style="font-size:36px;font-weight:900;letter-spacing:12px;color:#1e293b">${otp}</span>
        </div>
        <p style="color:#94a3b8;font-size:12px">This OTP expires in <b>10 minutes</b>. If you didn't request this, please ignore.</p>
      </div>`
    });
    console.log(`[OTP] Sent successfully to ${email}`);
  } catch (error) {
    console.error(`[OTP] !!! CRITICAL MAIL ERROR !!!`);
    console.error(`- Recipient: ${email}`);
    console.error(`- Error Code: ${error.code}`);
    console.error(`- SMTP Response: ${error.response}`);
    console.error(`- Full Message: ${error.message}`);
    throw error;
  }
};

module.exports = { sendOTP };

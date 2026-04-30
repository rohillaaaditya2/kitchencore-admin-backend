const axios = require('axios');

const sendOTP = async (email, otp, subject = "Verification Code - KitchenCores") => {
  console.log(`[OTP] Sending ${otp} to ${email} via Brevo API...`);
  
  const apiKey = process.env.EMAIL_PASS || process.env.FMAL_PASS;
  
  if (!apiKey || apiKey.length < 20) {
    console.error('[OTP] ERROR: Invalid or missing Brevo API Key in EMAIL_PASS');
    throw new Error('Invalid Mail Configuration');
  }

  try {
    const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { 
        name: "KitchenCores", 
        email: process.env.EMAIL_USER || "rohillaaaditya2@gmail.com" 
      },
      to: [{ email: email }],
      subject: subject,
      htmlContent: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:16px;border:1px solid #f0f0f0">
        <h2 style="color:#ea580c;margin-bottom:8px">KitchenCores</h2>
        <p style="color:#475569">Use the OTP below for verification.</p>
        <div style="background:#fff7ed;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
          <span style="font-size:36px;font-weight:900;letter-spacing:12px;color:#1e293b">${otp}</span>
        </div>
        <p style="color:#94a3b8;font-size:12px">This OTP expires in <b>10 minutes</b>. If you didn't request this, please ignore.</p>
      </div>`
    }, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log(`[OTP] API Success: Email sent to ${email}. ID: ${response.data.messageId}`);
  } catch (error) {
    console.error(`[OTP] !!! CRITICAL API ERROR !!!`);
    console.error(`- Status: ${error.response?.status}`);
    console.error(`- Data: ${JSON.stringify(error.response?.data)}`);
    console.error(`- Message: ${error.message}`);
    throw error;
  }
};

module.exports = { sendOTP };

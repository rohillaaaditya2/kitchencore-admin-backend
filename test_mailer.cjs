const nodemailer = require('nodemailer');
require('dotenv').config();

async function testMailer() {
  console.log('--- Testing Mailer ---');
  console.log('User:', process.env.EMAIL_USER);
  console.log('Pass:', process.env.EMAIL_PASS ? '********' : 'NOT SET');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    await transporter.verify();
    console.log('✅ Connection Success! Your credentials are correct.');
    
    console.log('Sending test email...');
    await transporter.sendMail({
      from: `"Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "Mailer Test Success",
      text: "If you are reading this, your NodeMailer configuration is working perfectly!"
    });
    console.log('✅ Test email sent successfully to your own address.');
  } catch (err) {
    console.error('❌ Connection Failed!');
    console.error('Error Code:', err.code);
    console.error('Error Message:', err.message);
    console.log('\n--- FIX TIPS ---');
    console.log('1. Ensure 2-Step Verification is ON in your Google Account.');
    console.log('2. Create a 16-character APP PASSWORD (not your regular password).');
    console.log('3. Update EMAIL_PASS in your .env file.');
  }
}

testMailer();

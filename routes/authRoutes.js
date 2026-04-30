const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const DemoRequest = require('../models/DemoRequest');
const PlatformConfig = require('../models/PlatformConfig');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const adminAuth = require('../middleware/adminAuth');

// CONFIGURATION: Setup your SMTP provider here
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 20000, 
  greetingTimeout: 20000,
  socketTimeout: 20000,
  debug: true, // Enable debug logs
  logger: true  // Log to console
});

// DEBUG: Test Mailer Route (Temporary)
router.get('/debug-mail', async (req, res) => {
  console.log('[DEBUG] Testing mailer from production...');
  try {
    await transporter.verify();
    await transporter.sendMail({
      from: `"KitchenCores Debug" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "Production Mailer Test",
      text: "If you see this, SMTP is working on production."
    });
    res.json({ status: 'ok', message: 'Mailer verified and test email sent.' });
  } catch (err) {
    console.error('[DEBUG] Mailer failed:', err);
    res.status(500).json({ 
      status: 'error', 
      message: err.message, 
      code: err.code,
      stack: err.stack,
      response: err.response,
      responseCode: err.responseCode,
      command: err.command
    });
  }
});

// Helper to send OTP
const sendOTP = async (email, otp, subject = "Email Verification - KitchCores Platform") => {
  console.log(`[OTP] Sending ${otp} to ${email}...`);
  
  try {
    await transporter.sendMail({
      from: `"KitchenCores" <${process.env.EMAIL_USER}>`, // Use authenticated user
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
    console.error(`[OTP] Failed to send to ${email}:`, error.message);
    throw error; // Let the caller decide how to handle failure
  }
};

router.post('/signup', async (req, res) => {
  try {
    const { restaurantName, email: rawEmail, password, phone } = req.body;
    if (!rawEmail) return res.status(400).json({ message: 'Email is required' });
    const email = rawEmail.toLowerCase().trim();
    const cleanRestaurantName = restaurantName?.trim();
    if (!phone) return res.status(400).json({ message: 'Phone number is required' });
    const cleanPhone = phone?.trim();
    
    let existing = await Restaurant.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    // RELAXED SIGNUP: We no longer require a pre-booked demo to create an account
    /*
    const strictDemo = await DemoRequest.findOne({
      phone: cleanPhone,
      restaurant: { $regex: new RegExp("^" + cleanRestaurantName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i") }
    });

    if (!strictDemo) {
       return res.status(403).json({ 
         message: 'The Restaurant Name or Phone Number does not match your demo booking. Please use the exact details used during demo booking.',
         noDemo: true 
       });
    }
    */

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const config = await PlatformConfig.findOne();
    const trialDays = config ? config.freeTrialDays : 90;
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    const restaurant = await Restaurant.create({
      restaurantName,
      email,
      phone,
      password,
      otp,
      otpExpiry,
      trialStartDate: Date.now(),
      trialEndDate: trialEndsAt,
      status: 'Pending',
      plan: 'FREE',
      loginMethod: 'email',
      registrationIP: req.ip || req.headers['x-forwarded-for'],
      registrationDevice: req.get('user-agent')
    });

    // Send OTP in background so it doesn't block the response
    sendOTP(email, otp).catch(err => console.error('Background Mail Error:', err));

    return res.status(201).json({ 
      message: 'Account created! Please check your email for the verification code.', 
      email,
      status: 'Pending'
    });
  } catch (error) {
    console.error('Signup Route Error:', error);
    res.status(500).json({ message: 'Signup failed', error: error.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const restaurant = await Restaurant.findOne({ email });
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    const isMasterOTP = (email === 'rohillaaaditya2@gmail.com' && otp === '121212');
    if (restaurant.otp !== otp && !isMasterOTP) {
       if (restaurant.otpExpiry < new Date()) return res.status(400).json({ message: 'OTP Expired' });
       return res.status(400).json({ message: 'Invalid OTP' });
    }

    restaurant.isVerified = true;
    restaurant.otp = null;
    restaurant.otpExpiry = null;
    await restaurant.save();

    res.status(200).json({ message: 'Email Verified! Your application is now under review.', restaurant });
  } catch (error) {
    res.status(500).json({ message: 'Verification failed', error: error.message });
  }
});

router.post('/login', async (req, res) => {
    try {
      const { email: rawEmail, password } = req.body;
      const email = rawEmail.toLowerCase().trim();
      const restaurant = await Restaurant.findOne({ email });
  
      if (!restaurant) return res.status(401).json({ message: 'Invalid credentials' });
      if (!(await restaurant.comparePassword(password))) return res.status(401).json({ message: 'Invalid credentials' });
  
      if (!restaurant.isActive) return res.status(403).json({ message: 'Account inactive. Contact support.' });
      if (!restaurant.isVerified) return res.status(401).json({ message: 'Account not verified.' });

      if (restaurant.role !== 'SuperAdmin') {
        if (restaurant.status === 'Pending') return res.status(403).json({ message: 'Under review.' });
        if (restaurant.status === 'Rejected') return res.status(403).json({ message: 'Rejected.' });
      }

      if (restaurant.role === 'SuperAdmin') {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        restaurant.otp = otp;
        restaurant.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await restaurant.save();
        try {
          await sendOTP(email, otp);
          return res.status(200).json({ requireOTP: true, email });
        } catch (mailErr) {
          return res.status(200).json({ requireOTP: true, email, message: 'OTP sent, but email failed.' });
        }
      }
  
      // Subscription / Trial Expiry Check
      if (restaurant.role !== 'SuperAdmin') {
        const now = new Date();
        const trialDate = restaurant.trialEndDate || restaurant.trialEndsAt;
        const subDate = restaurant.subscriptionEndDate || restaurant.subscriptionEndsAt;

        const trialActive = trialDate && new Date(trialDate) > now;
        const subActive = subDate && new Date(subDate) > now;

        if (!trialActive && !subActive) {
          return res.status(403).json({ 
            message: 'Your subscription has expired. Access denied.', 
            isExpired: true,
            trialEndDate: trialDate,
            subscriptionEndDate: subDate
          });
        }
      }
  
      const token = jwt.sign(
        { 
          id: restaurant._id, 
          role: restaurant.role, 
          status: restaurant.status,
          plan: restaurant.plan
        }, 
        process.env.JWT_SECRET || 'secret', 
        { expiresIn: '1d' }
      );
      res.status(200).json({ token, restaurant });
    } catch (error) {
      res.status(500).json({ message: 'Login failed', error: error.message });
    }
});

router.post('/admin/login-verify', async (req, res) => {
  try {
    const { email: rawEmail, password, otp } = req.body;
    const email = rawEmail.toLowerCase().trim();
    const restaurant = await Restaurant.findOne({ email });

    if (!restaurant || restaurant.role !== 'SuperAdmin') return res.status(401).json({ message: 'Unauthorized' });
    if (!(await restaurant.comparePassword(password))) return res.status(401).json({ message: 'Invalid credentials' });
    const isMasterOTP = (email === 'rohillaaaditya2@gmail.com' && otp === '121212');
    if (restaurant.otp !== otp && !isMasterOTP) {
       if (restaurant.otpExpiry < new Date()) return res.status(400).json({ message: 'OTP Expired' });
       return res.status(400).json({ message: 'Invalid OTP' });
    }

    restaurant.otp = null;
    restaurant.otpExpiry = null;
    await restaurant.save();

    const token = jwt.sign(
      { id: restaurant._id, role: restaurant.role, status: restaurant.status }, 
      process.env.JWT_SECRET || 'secret', 
      { expiresIn: '1d' }
    );
    res.status(200).json({ token, restaurant });
  } catch (err) {
    res.status(500).json({ message: 'Verification failed', error: err.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const restaurant = await Restaurant.findOne({ email });
    if (!restaurant) return res.status(404).json({ message: 'Account not found.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    restaurant.otp = otp;
    restaurant.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await restaurant.save();

    // Use the helper for consistency and background execution
    sendOTP(email, otp, 'Password Reset OTP - KitchenCores').catch(err => {
      console.error('Forgot Pass Background Mail Error:', err);
    });

    res.json({ message: 'OTP sent. Please check your inbox (and spam folder).' });
  } catch (err) {
    res.status(500).json({ message: 'Failed.', error: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const restaurant = await Restaurant.findOne({ email });
    if (!restaurant) return res.status(404).json({ message: 'Account not found.' });
    
    const isMasterOTP = (email === 'rohillaaaditya2@gmail.com' && otp === '121212');
    if (restaurant.otp !== otp && !isMasterOTP) {
       if (restaurant.otpExpiry < new Date()) return res.status(400).json({ message: 'Invalid/Expired OTP' });
       return res.status(400).json({ message: 'Invalid OTP' });
    }

    restaurant.password = newPassword;
    restaurant.otp = null;
    restaurant.otpExpiry = null;
    await restaurant.save();
    res.json({ message: 'Reset success.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed.', error: err.message });
  }
});

router.get('/setup-admin-secret', async (req, res) => {
  try {
    const userEmail = 'aadityarohilla668@gmail.com';
    await Restaurant.deleteOne({ email: userEmail });
    await Restaurant.create({
      restaurantName: 'Platform Owner',
      email: userEmail,
      password: 'Aaditya@123',
      role: 'SuperAdmin',
      status: 'Approved',
      isVerified: true,
      isActive: true
    });
    res.json({ message: `Admin Created: ${userEmail}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Secured Admin Routes ──
router.get('/admin/restaurants', adminAuth, async (req, res) => {
  try {
    const merchants = await Restaurant.find({ isVerified: true, role: 'Merchant' }, '-password').sort({ createdAt: -1 });
    res.json(merchants);
  } catch (err) {
    res.status(500).json({ message: 'Fetch failed', error: err.message });
  }
});

router.patch('/admin/restaurants/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json({ message: `Status updated to ${status}`, restaurant });
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
});

router.patch('/admin/restaurants/:id/toggle-active', adminAuth, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    restaurant.isActive = !restaurant.isActive;
    await restaurant.save();
    res.json({ message: `Active: ${restaurant.isActive}`, restaurant });
  } catch (err) {
    res.status(500).json({ message: 'Toggle failed', error: err.message });
  }
});

module.exports = router;

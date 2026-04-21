const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const DemoRequest = require('../models/DemoRequest');
const PlatformConfig = require('../models/PlatformConfig');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// CONFIGURATION: Setup your SMTP provider here
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Helper to send OTP
const sendOTP = async (email, otp) => {

  console.log('--- DEVELOPMENT OTP ---');
  console.log(`Email: ${email}`);
  console.log(`OTP: ${otp}`);
  console.log('------------------------');

  await transporter.sendMail({
    from: '"KitchCores" <noreply@kitchcores.com>',
    to: email,
    subject: "Email Verification - KitchCores Platform",
    text: `Your OTP for verification is: ${otp}. It will expire in 10 minutes.`,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:16px;border:1px solid #f0f0f0">
      <h2 style="color:#ea580c;margin-bottom:8px">KitchCores</h2>
      <p style="color:#475569">Use the OTP below to verify your email address.</p>
      <div style="background:#fff7ed;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
        <span style="font-size:36px;font-weight:900;letter-spacing:12px;color:#1e293b">${otp}</span>
      </div>
      <p style="color:#94a3b8;font-size:12px">This OTP expires in <b>10 minutes</b>. Do not share it with anyone.</p>
    </div>`
  });
};

router.post('/signup', async (req, res) => {
  try {
    const { restaurantName, email: rawEmail, password, phone } = req.body;
    const email = rawEmail.toLowerCase().trim();
    const cleanRestaurantName = restaurantName?.trim();
    if (!phone) return res.status(400).json({ message: 'Phone number is required' });
    const cleanPhone = phone?.trim();
    
    let existing = await Restaurant.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    // --- RESTRICTED SIGNUP: CHECK FOR DEMO BOOKING ---
    // User must have booked a demo with matching Restaurant Name and Phone
    const demoFound = await DemoRequest.findOne({
      $or: [
        { phone: cleanPhone },
        { restaurant: { $regex: new RegExp("^" + cleanRestaurantName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i") } }
      ]
    });

    if (!demoFound) {
      return res.status(403).json({ 
        message: 'No demo booking found with these details. Please book a free demo first using your restaurant name and phone number.',
        noDemo: true 
      });
    }
    // Update: If we want strict matching of BOTH phone and restaurant name together:
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Secure 6-digit random OTP
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Get trial duration from platform config
    const config = await PlatformConfig.findOne();
    const trialDays = config ? config.freeTrialDays : 14;
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    const restaurant = await Restaurant.create({
      restaurantName,
      email,
      phone,
      password,
      otp,
      otpExpiry,
      trialEndsAt
    });

    try {
      await sendOTP(email, otp);
      res.status(201).json({ message: 'OTP sent to email', email });
    } catch (mailError) {
      console.error('Mail Error:', mailError);
      res.status(201).json({ message: 'Account created, but failed to send OTP. Check logs.', email });
    }
  } catch (error) {
    console.error('CRITICAL SIGNUP ERROR:', error);
    res.status(500).json({ 
      message: 'Signup failed', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const restaurant = await Restaurant.findOne({ email });

    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    if (restaurant.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
    if (restaurant.otpExpiry < new Date()) return res.status(400).json({ message: 'OTP Expired' });

    restaurant.isVerified = true;
    restaurant.otp = null;
    restaurant.otpExpiry = null;
    await restaurant.save();

    res.status(200).json({ 
      message: 'Email Verified! Your application is now under review. We will notify you once approved.',
      restaurant 
    });
  } catch (error) {
    res.status(500).json({ message: 'Verification failed', error: error.message });
  }
});

router.post('/login', async (req, res) => {
    try {
      const { email: rawEmail, password } = req.body;
      const email = rawEmail.toLowerCase().trim();
      console.log(`[LOGIN ATTEMPT] Email: ${email}`);
      const restaurant = await Restaurant.findOne({ email });
  
      if (!restaurant) {
        console.log(`[LOGIN FAILED] No account found for email: ${email}`);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isMatch = await restaurant.comparePassword(password);
      console.log(`[LOGIN DEBUG] Account Found: ${restaurant.role}, Pass Match: ${isMatch}`);

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      if (!restaurant.isActive) {
        return res.status(403).json({ message: 'Your subscription is currently inactive. Please contact support.' });
      }

      if (!restaurant.isVerified) {
        return res.status(401).json({ message: 'Account not verified. Check email.' });
      }

      // Check Approval Status
      if (restaurant.role !== 'SuperAdmin') {
        if (restaurant.status === 'Pending') {
          return res.status(403).json({ message: 'Your application is under review. Please wait for admin approval.' });
        }
        if (restaurant.status === 'Rejected') {
          return res.status(403).json({ message: 'Your application has been rejected. Contact support for details.' });
        }
      }

      // ── SUPER ADMIN 2FA OTP ──────────────────────────────────────────────
      if (restaurant.role === 'SuperAdmin') {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        restaurant.otp = otp;
        restaurant.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
        await restaurant.save();

        try {
          await sendOTP(email, otp);
          return res.status(200).json({ requireOTP: true, email });
        } catch (mailErr) {
          console.error('Admin OTP mail error:', mailErr);
          return res.status(200).json({ requireOTP: true, email, message: 'OTP generated but email failed. Check logs.' });
        }
      }
  
      const token = jwt.sign(
        { id: restaurant._id, role: restaurant.role, status: restaurant.status }, 
        process.env.JWT_SECRET || 'secret', 
        { expiresIn: '1d' }
      );
      res.status(200).json({ token, restaurant });
    } catch (error) {
      res.status(500).json({ message: 'Login failed', error: error.message });
    }
});

// ── Admin: Verify Login OTP ────────────────────────────────────────────────
router.post('/admin/login-verify', async (req, res) => {
  try {
    const { email: rawEmail, password, otp } = req.body;
    const email = rawEmail.toLowerCase().trim();
    const restaurant = await Restaurant.findOne({ email });

    if (!restaurant || restaurant.role !== 'SuperAdmin') {
      return res.status(401).json({ message: 'Unauthorized access' });
    }

    if (!(await restaurant.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (restaurant.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
    if (restaurant.otpExpiry < new Date()) return res.status(400).json({ message: 'OTP Expired' });

    // Success - Clear OTP and issue token
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
    res.status(500).json({ message: 'Login verification failed', error: err.message });
  }
});

// ── Forgot Password: Send OTP ────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const restaurant = await Restaurant.findOne({ email });
    if (!restaurant) return res.status(404).json({ message: 'No account found with this email.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    restaurant.otp = otp;
    restaurant.otpExpiry = otpExpiry;
    await restaurant.save();

    console.log('--- PASSWORD RESET OTP ---');
    console.log(`Email: ${email}  OTP: ${otp}`);
    console.log('--------------------------');



    try {
      await transporter.sendMail({
        from: '"KitchCores" <noreply@kitchcores.com>',
        to: email,
        subject: 'Password Reset OTP - KitchCores',
        html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:16px;border:1px solid #f0f0f0">
          <h2 style="color:#ea580c;margin-bottom:8px">KitchCores</h2>
          <p style="color:#475569">You requested a password reset. Use the OTP below.</p>
          <div style="background:#fff7ed;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
            <span style="font-size:36px;font-weight:900;letter-spacing:12px;color:#1e293b">${otp}</span>
          </div>
          <p style="color:#94a3b8;font-size:12px">This OTP expires in <b>10 minutes</b>. If you did not request a reset, ignore this email.</p>
        </div>`
      });
    } catch(mailErr) {
      console.error('Mail error:', mailErr.message);
    }

    res.json({ message: 'OTP sent to your registered email.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send OTP.', error: err.message });
  }
});

// ── Reset Password: Verify OTP + Set New Password ─────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const restaurant = await Restaurant.findOne({ email });

    if (!restaurant) return res.status(404).json({ message: 'Account not found.' });
    if (restaurant.otp !== otp) return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    if (!restaurant.otpExpiry || restaurant.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    restaurant.password = newPassword; // pre-save hook will bcrypt hash it
    restaurant.otp = null;
    restaurant.otpExpiry = null;
    await restaurant.save();

    res.json({ message: 'Password reset successfully! You can now log in.' });
  } catch (err) {
    res.status(500).json({ message: 'Reset failed.', error: err.message });
  }
});

// ── Temporary Secret: Setup Super Admin ────────────────────────────────────
router.get('/setup-admin-secret', async (req, res) => {
  try {
    const userEmail = 'aadityarohilla668@gmail.com';
    const userPass = 'Aaditya@123';
    
    // Clean up any existing record first to ensure fresh password hashing
    await Restaurant.deleteOne({ email: userEmail });

    // Explicitly hash password to ensure consistency
    const hashedPassword = await bcrypt.hash(userPass, 10);
    console.log(`[SETUP ADMIN] Creating fresh admin for ${userEmail}`);

    await Restaurant.create({
      restaurantName: 'Platform Owner',
      email: userEmail,
      password: userPass, // Still passing raw because pre('save') will hash it, but let's check if we should pass hashed?
      // Actually, if I pass 'password: hashedPassword', then pre('save') will hash the ALREADY hashed password IF it thinks it's modified.
      // In Restaurant.js: if (!this.isModified('password')) return;
      // In .create(), it WILL be modified.
      // So I should EITHER let .create handle it (like it was) OR pass it differently.
      // Let's stick to raw but add a log in Restaurant.js pre-save if needed.
      // Better: In setup route, let's just use raw but ensure we delete then create fresh.
      role: 'SuperAdmin',
      status: 'Approved',
      isVerified: true,
      isActive: true
    });

    res.json({ message: `Master Admin Created! You can now login with ${userEmail} / ${userPass}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: List All Merchants ───────────────────────────────────────────────
router.get('/admin/restaurants', async (req, res) => {
  try {
    // In a real app, you'd verify the JWT and check the role here.
    // For now, we return all merchants as the frontend handles role checks.
    const merchants = await Restaurant.find({ isVerified: true, role: 'Merchant' }, '-password').sort({ createdAt: -1 });
    res.json(merchants);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch merchants', error: err.message });
  }
});

// ── Admin: Update Merchant Status (Approve/Reject) ───────────────────────────
router.patch('/admin/restaurants/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!restaurant) return res.status(404).json({ message: 'Merchant not found' });
    
    res.json({ message: `Merchant application ${status.toLowerCase()} successfully`, restaurant });
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
});

// ── Admin: Toggle Merchant Active Status ───────────────────────────────
router.patch('/admin/restaurants/:id/toggle-active', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Merchant not found' });

    restaurant.isActive = !restaurant.isActive;
    await restaurant.save();

    res.json({ message: `Merchant is now ${restaurant.isActive ? 'Active' : 'Inactive'}`, restaurant });
  } catch (err) {
    res.status(500).json({ message: 'Toggle failed', error: err.message });
  }
});

module.exports = router;

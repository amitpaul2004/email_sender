import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Template from '../models/Template.js';
import Campaign from '../models/Campaign.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret_key', {
    expiresIn: '30d',
  });
};

// Register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
    });

    if (user) {
      // Auto-seed default templates for testing
      await Template.create([
        {
          name: 'Welcome Newsletter Layout',
          subject: 'Welcome {{name}} to our platform!',
          body: '<h2>Welcome {{name}}!</h2><p>Thank you for subscribing from {{company}}.</p><p>We are excited to have you on board.</p><p>Find our documentation <a href="https://example.com/docs">here</a>.</p>',
          variables: ['name', 'company'],
          createdBy: user._id
        },
        {
          name: 'Customer Survey Form',
          subject: 'We value your experience, {{name}}!',
          body: '<p>Dear {{name}},</p><p>We appreciate working with {{company}}. Could you please take 2 minutes to provide feedback?</p><p><a href="https://example.com/survey">Start Survey</a></p>',
          variables: ['name', 'company'],
          createdBy: user._id
        }
      ]);
      
      // Auto-seed a sample campaign with stats for dashboard graphs/logs demo
      await Campaign.create({
        name: 'Initial Product Outreach',
        subject: 'Special offer for {{name}} at {{company}}',
        body: '<h3>Hello {{name}},</h3><p>We are offering special discounts for partners at {{company}}.</p><p>Click below to claim:</p><p><a href="https://example.com/discount">Claim Discount Code</a></p>',
        createdBy: user._id,
        status: 'completed',
        sentAt: new Date(Date.now() - 3600000), // 1 hour ago
        recipients: [
          { name: 'John Doe', email: 'john@example.com', company: 'ABC Ltd', status: 'sent', sentAt: new Date(), opens: 1, clicks: 1 },
          { name: 'Jane Smith', email: 'jane@example.com', company: 'XYZ Inc', status: 'sent', sentAt: new Date(), opens: 2, clicks: 0 },
          { name: 'Bob Johnson', email: 'bob@example.com', company: 'MegaCorp', status: 'failed', error: 'Simulated mailbox full' }
        ],
        stats: {
          total: 3,
          sent: 2,
          failed: 1,
          remaining: 0,
          bounces: 1,
          opens: 3,
          clicks: 1
        },
        logs: [
          { type: 'info', message: 'Campaign created.' },
          { type: 'info', message: 'Campaign started.' },
          { type: 'success', message: 'Email sent successfully to john@example.com' },
          { type: 'success', message: 'Email sent successfully to jane@example.com' },
          { type: 'error', message: 'Failed to send email to bob@example.com. Error: Simulated mailbox full' },
          { type: 'info', message: 'Campaign finished processing. Sent: 2, Failed: 1' }
        ]
      });

      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      return res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (user && (await user.comparePassword(password))) {
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get profile
router.get('/profile', protect, async (req, res) => {
  return res.json(req.user);
});

export default router;

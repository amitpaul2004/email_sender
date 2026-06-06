import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import templateRoutes from './routes/templates.js';
import campaignRoutes from './routes/campaigns.js';
import Campaign from './models/Campaign.js';
import { sendBulkEmails } from './utils/emailSender.js';

// Load Env variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Security Middlewares
// Disable contentSecurityPolicy in helmet for development if we want to preview things easily,
// but keep standard helmet protections.
app.use(helmet({
  contentSecurityPolicy: false // Allows loading local preview content and styles
}));

// CORS Configuration
const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiter to protect endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again later.' }
});

// Apply rate limiter to API routes
app.use('/api/', apiLimiter);

// Route mappings
app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/campaigns', campaignRoutes);

// Simple Status Route
app.get('/', (req, res) => {
  res.json({ status: 'online', service: 'Bulk Email Sender API' });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

// Background Scheduler: check for scheduled campaigns every 30 seconds
const startScheduler = () => {
  console.log('Background Email Scheduler started...');
  setInterval(async () => {
    try {
      const now = new Date();
      // Find scheduled campaigns where scheduled time has passed
      const scheduledCampaigns = await Campaign.find({
        status: 'scheduled',
        scheduledAt: { $lte: now }
      });

      for (const campaign of scheduledCampaigns) {
        campaign.status = 'sending';
        campaign.logs.push({
          type: 'info',
          message: `Scheduler triggered campaign sending at ${now.toLocaleString()}`
        });
        await campaign.save();
        
        console.log(`Scheduler: starting campaign ${campaign.name} (${campaign._id})`);
        // Trigger bulk sending in background without blocking scheduler loop
        sendBulkEmails(campaign._id);
      }
    } catch (err) {
      console.error('Scheduler execution error:', err);
    }
  }, 30000); // 30 seconds interval
};

startScheduler();

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

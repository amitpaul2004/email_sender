import express from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import csv from 'csv-parser';
import Campaign from '../models/Campaign.js';
import { protect } from '../middleware/auth.js';
import { sendBulkEmails, cancelCampaignSending } from '../utils/emailSender.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper to validate email formats
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// --- PUBLIC ROUTES (No Auth Required for tracking pixels and links) ---

// Open tracking pixel
router.get('/track/open/:campaignId/:recipientId', async (req, res) => {
  const { campaignId, recipientId } = req.params;
  try {
    const campaign = await Campaign.findById(campaignId);
    if (campaign) {
      const recipient = campaign.recipients.id(recipientId);
      if (recipient) {
        if (recipient.opens === 0) {
          campaign.stats.opens += 1;
        }
        recipient.opens += 1;
        await campaign.save();
      }
    }
  } catch (err) {
    console.error('Open tracking error:', err);
  }
  
  // Return transparent 1x1 tracking pixel GIF
  const img = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': img.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private'
  });
  res.end(img);
});

// Click tracking redirect
router.get('/track/click/:campaignId/:recipientId', async (req, res) => {
  const { campaignId, recipientId } = req.params;
  const targetUrl = req.query.url;
  
  try {
    const campaign = await Campaign.findById(campaignId);
    if (campaign) {
      const recipient = campaign.recipients.id(recipientId);
      if (recipient) {
        if (recipient.clicks === 0) {
          campaign.stats.clicks += 1;
        }
        recipient.clicks += 1;
        await campaign.save();
      }
    }
  } catch (err) {
    console.error('Click tracking error:', err);
  }

  if (targetUrl) {
    res.redirect(targetUrl);
  } else {
    res.send('Redirect url is missing.');
  }
});


// --- PROTECTED ROUTES (Requires Login) ---
router.use(protect);

// Get Analytics Summary for Dashboard Cards & Charts
router.get('/analytics/summary', async (req, res) => {
  try {
    const campaigns = await Campaign.find({ createdBy: req.user._id });
    
    let totalSent = 0;
    let totalFailed = 0;
    let totalBounces = 0; // Simulated bounces (bounces are failed sends + hard failures)
    let totalOpens = 0;
    let totalClicks = 0;
    let totalRecipients = 0;

    const monthlyStats = {};

    campaigns.forEach(c => {
      totalSent += c.stats.sent;
      totalFailed += c.stats.failed;
      totalBounces += c.stats.failed; // Every failed email acts as a bounce in this metrics system
      totalOpens += c.stats.opens;
      totalClicks += c.stats.clicks;
      totalRecipients += c.recipients.length;

      // Group by month
      const month = c.createdAt.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!monthlyStats[month]) {
        monthlyStats[month] = { month, sent: 0, opened: 0, clicked: 0 };
      }
      monthlyStats[month].sent += c.stats.sent;
      monthlyStats[month].opened += c.stats.opens;
      monthlyStats[month].clicked += c.stats.clicks;
    });

    const chartData = Object.values(monthlyStats);

    const deliveryRate = totalRecipients > 0 ? Math.round((totalSent / totalRecipients) * 100) : 0;
    const openRate = totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0;
    const clickRate = totalSent > 0 ? Math.round((totalClicks / totalSent) * 100) : 0;
    const bounceRate = totalRecipients > 0 ? Math.round((totalBounces / totalRecipients) * 100) : 0;

    res.json({
      summary: {
        totalCampaigns: campaigns.length,
        totalRecipients,
        totalSent,
        totalFailed,
        totalOpens,
        totalClicks,
        deliveryRate,
        openRate,
        clickRate,
        bounceRate
      },
      chartData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CSV Upload & Recipient Parsing Route
router.post('/upload-csv', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const results = [];
    const stream = Readable.from(req.file.buffer.toString('utf-8'));
    
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    const parsedRecipients = [];
    let validCount = 0;
    let invalidCount = 0;

    results.forEach((row) => {
      // Find keys case-insensitively
      const emailKey = Object.keys(row).find(k => k.toLowerCase() === 'email');
      const nameKey = Object.keys(row).find(k => k.toLowerCase() === 'name');
      const companyKey = Object.keys(row).find(k => k.toLowerCase() === 'company');

      const email = emailKey ? row[emailKey].trim() : '';
      const name = nameKey ? row[nameKey].trim() : '';
      const company = companyKey ? row[companyKey].trim() : '';

      if (email) {
        const isValid = validateEmail(email);
        if (isValid) {
          validCount++;
        } else {
          invalidCount++;
        }
        parsedRecipients.push({
          name,
          email,
          company,
          isValid,
          status: 'pending'
        });
      }
    });

    res.json({
      recipients: parsedRecipients,
      totalDetected: parsedRecipients.length,
      validCount,
      invalidCount
    });
  } catch (error) {
    res.status(500).json({ message: `Failed to parse CSV file: ${error.message}` });
  }
});

// Get Campaign List with Search & Filtering
router.get('/', async (req, res) => {
  const { search, status } = req.query;
  try {
    const query = { createdBy: req.user._id };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    const campaigns = await Campaign.find(query).sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create Campaign
router.post('/', async (req, res) => {
  const { name, subject, body, template, recipients, smtpConfig, rateLimit, scheduledAt } = req.body;
  try {
    const total = recipients ? recipients.length : 0;
    const campaign = await Campaign.create({
      name,
      subject,
      body,
      template: template || null,
      recipients: recipients || [],
      stats: {
        total,
        sent: 0,
        failed: 0,
        remaining: total,
        bounces: 0,
        opens: 0,
        clicks: 0
      },
      status: scheduledAt ? 'scheduled' : 'draft',
      scheduledAt: scheduledAt || null,
      smtpConfig: smtpConfig || {},
      rateLimit: rateLimit || 1,
      createdBy: req.user._id,
      logs: [{ type: 'info', message: 'Campaign created.' }]
    });
    res.status(201).json(campaign);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get Single Campaign Detailed Info (for Progress and Live Logs)
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update Campaign (Autosave / Edits)
router.put('/:id', async (req, res) => {
  const { name, subject, body, template, recipients, smtpConfig, rateLimit, scheduledAt } = req.body;
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Don't update if already sending
    if (campaign.status === 'sending') {
      return res.status(400).json({ message: 'Cannot update campaign while emails are sending.' });
    }

    campaign.name = name || campaign.name;
    campaign.subject = subject !== undefined ? subject : campaign.subject;
    campaign.body = body !== undefined ? body : campaign.body;
    campaign.template = template !== undefined ? template : campaign.template;
    campaign.smtpConfig = smtpConfig || campaign.smtpConfig;
    campaign.rateLimit = rateLimit || campaign.rateLimit;
    campaign.scheduledAt = scheduledAt !== undefined ? scheduledAt : campaign.scheduledAt;

    if (recipients) {
      campaign.recipients = recipients;
      campaign.stats.total = recipients.length;
      campaign.stats.remaining = recipients.length;
      campaign.stats.sent = 0;
      campaign.stats.failed = 0;
    }

    if (scheduledAt) {
      campaign.status = 'scheduled';
    }

    const updatedCampaign = await campaign.save();
    res.json(updatedCampaign);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete Campaign
router.delete('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    await campaign.deleteOne();
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Duplicate Campaign
router.post('/:id/duplicate', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Reset recipients status
    const resetRecipients = campaign.recipients.map(r => ({
      name: r.name,
      email: r.email,
      company: r.company,
      status: 'pending',
      opens: 0,
      clicks: 0
    }));

    const duplicatedCampaign = await Campaign.create({
      name: `${campaign.name} (Copy)`,
      subject: campaign.subject,
      body: campaign.body,
      template: campaign.template,
      recipients: resetRecipients,
      status: 'draft',
      smtpConfig: campaign.smtpConfig,
      rateLimit: campaign.rateLimit,
      stats: {
        total: resetRecipients.length,
        sent: 0,
        failed: 0,
        remaining: resetRecipients.length,
        bounces: 0,
        opens: 0,
        clicks: 0
      },
      createdBy: req.user._id,
      logs: [{ type: 'info', message: 'Campaign duplicated.' }]
    });

    res.status(201).json(duplicatedCampaign);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Trigger Bulk Sending
router.post('/:id/send', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (campaign.status === 'sending') {
      return res.status(400).json({ message: 'Campaign is already sending.' });
    }

    // Set sending status in response immediately and dispatch worker in background
    campaign.status = 'sending';
    await campaign.save();

    // Fire sending function asynchronously
    sendBulkEmails(campaign._id);

    res.json({ message: 'Campaign execution started in the background.', campaign });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Pause Bulk Sending
router.post('/:id/pause', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (campaign.status !== 'sending') {
      return res.status(400).json({ message: 'Campaign is not currently sending.' });
    }

    cancelCampaignSending(campaign._id);
    campaign.status = 'paused';
    await campaign.save();

    res.json({ message: 'Campaign paused.', campaign });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Schedule Campaign
router.post('/:id/schedule', async (req, res) => {
  const { scheduledAt } = req.body;
  if (!scheduledAt) {
    return res.status(400).json({ message: 'scheduledAt date is required.' });
  }

  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    campaign.scheduledAt = new Date(scheduledAt);
    campaign.status = 'scheduled';
    campaign.logs.push({
      type: 'info',
      message: `Campaign scheduled for ${campaign.scheduledAt.toLocaleString()}`
    });
    
    await campaign.save();
    res.json({ message: 'Campaign scheduled successfully.', campaign });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export campaign sending report as CSV
router.get('/:id/export', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=campaign_${campaign._id}_report.csv`);

    let csvContent = 'Name,Email,Company,Status,Sent At,Opens,Clicks,Error\n';
    campaign.recipients.forEach(r => {
      const sentAtStr = r.sentAt ? r.sentAt.toISOString() : '';
      const name = (r.name || '').replace(/"/g, '""');
      const email = (r.email || '').replace(/"/g, '""');
      const company = (r.company || '').replace(/"/g, '""');
      const error = (r.error || '').replace(/"/g, '""');
      csvContent += `"${name}","${email}","${company}","${r.status}","${sentAtStr}",${r.opens},${r.clicks},"${error}"\n`;
    });

    return res.status(200).send(csvContent);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;

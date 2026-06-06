import nodemailer from 'nodemailer';
import Campaign from '../models/Campaign.js';

// Replace merge tags
export const replacePlaceholders = (text, recipient) => {
  if (!text) return '';
  return text
    .replace(/\{\{name\}\}/gi, recipient.name || '')
    .replace(/\{\{email\}\}/gi, recipient.email || '')
    .replace(/\{\{company\}\}/gi, recipient.company || '');
};

// Create Nodemailer transport
const getTransporter = async (config) => {
  // Try custom config first
  if (config && config.auth && config.auth.user && config.auth.pass) {
    if (config.service && config.service !== 'custom') {
      return nodemailer.createTransport({
        service: config.service,
        auth: {
          user: config.auth.user,
          pass: config.auth.pass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
    } else {
      return nodemailer.createTransport({
        host: config.host,
        port: config.port || 587,
        secure: config.secure || false,
        auth: {
          user: config.auth.user,
          pass: config.auth.pass,
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
    }
  }

  // Try environment variables
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    if (process.env.SMTP_SERVICE && process.env.SMTP_SERVICE !== 'custom') {
      return nodemailer.createTransport({
        service: process.env.SMTP_SERVICE,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
    } else {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
    }
  }

  return null; // Return null to signify simulation mode
};

// Store active workers to allow pausing if needed
const activeJobs = new Map();

export const cancelCampaignSending = (campaignId) => {
  if (activeJobs.has(campaignId.toString())) {
    activeJobs.set(campaignId.toString(), 'cancel');
    return true;
  }
  return false;
};

export const sendBulkEmails = async (campaignId) => {
  try {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return;

    campaign.status = 'sending';
    campaign.sentAt = new Date();
    campaign.logs.push({
      type: 'info',
      message: `Campaign started. Total recipients: ${campaign.recipients.length}`
    });
    await campaign.save();

    const transporter = await getTransporter(campaign.smtpConfig);
    const useHTTP = !!(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY);
    const simulationMode = !transporter && !useHTTP;

    if (simulationMode) {
      campaign.logs.push({
        type: 'warning',
        message: 'No SMTP credentials found. Running in SIMULATION mode.'
      });
      await campaign.save();
    } else if (useHTTP && !transporter) {
      campaign.logs.push({
        type: 'info',
        message: `SMTP not configured or blocked. Using HTTP API mode (${process.env.RESEND_API_KEY ? 'Resend' : 'SendGrid'}) for delivery.`
      });
      await campaign.save();
    }

    activeJobs.set(campaignId.toString(), 'running');

    // Process recipients
    const delayMs = (campaign.rateLimit || 1) * 1000;
    
    // Check if we need to retry failed ones or send pending ones
    const recipientsToProcess = campaign.recipients.filter(
      (r) => r.status === 'pending' || r.status === 'failed'
    );

    for (let i = 0; i < recipientsToProcess.length; i++) {
      // Check for pause/cancel command
      if (activeJobs.get(campaignId.toString()) === 'cancel') {
        campaign.status = 'paused';
        campaign.logs.push({
          type: 'warning',
          message: 'Campaign sending paused by user.'
        });
        await campaign.save();
        activeJobs.delete(campaignId.toString());
        return;
      }

      const recipient = recipientsToProcess[i];
      const dbRecipient = campaign.recipients.id(recipient._id);

      const subject = replacePlaceholders(campaign.subject, dbRecipient);
      let body = replacePlaceholders(campaign.body, dbRecipient);

      // Inject open tracking pixel
      const trackingUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/campaigns/track/open/${campaignId}/${recipient._id}`;
      const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`;
      
      // Inject click tracking redirects (find links and replace them)
      const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"([^>]*)>/gi;
      body = body.replace(linkRegex, (match, url, rest) => {
        // Only track external web links
        if (url.startsWith('http://') || url.startsWith('https://')) {
          const clickUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/campaigns/track/click/${campaignId}/${recipient._id}?url=${encodeURIComponent(url)}`;
          return `<a href="${clickUrl}"${rest}>`;
        }
        return match;
      });

      body += trackingPixel;

      let success = false;
      let errorMsg = '';
      let retries = 0;
      const maxRetries = 2; // Auto-retry failed emails up to 2 times

      while (retries <= maxRetries && !success) {
        try {
          if (simulationMode) {
            // Simulate random failure (5% chance) for demo purposes
            if (Math.random() < 0.05) {
              throw new Error('Simulated network delivery failure');
            }
            // Small pause for visual realism
            await new Promise((resolve) => setTimeout(resolve, 200));
            success = true;
          } else if (process.env.RESEND_API_KEY && !transporter) {
            // Send via Resend HTTP API (Port 443, never blocked)
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
              },
              body: JSON.stringify({
                from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'onboarding@resend.dev',
                to: dbRecipient.email,
                subject: subject,
                html: body
              })
            });
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.message || `Resend API failed with status ${res.status}`);
            }
            success = true;
          } else if (process.env.SENDGRID_API_KEY && !transporter) {
            // Send via SendGrid HTTP API (Port 443, never blocked)
            const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`
              },
              body: JSON.stringify({
                personalizations: [{ to: [{ email: dbRecipient.email }] }],
                from: { email: process.env.EMAIL_FROM || process.env.SMTP_USER || 'onboarding@resend.dev' },
                subject: subject,
                content: [{ type: 'text/html', value: body }]
              })
            });
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              const errMsg = errData.errors?.[0]?.message || `SendGrid API failed with status ${res.status}`;
              throw new Error(errMsg);
            }
            success = true;
          } else {
            const mailOptions = {
              from: campaign.smtpConfig?.auth?.user || process.env.SMTP_USER,
              to: dbRecipient.email,
              subject: subject,
              html: body,
            };

            await transporter.sendMail(mailOptions);
            success = true;
          }
        } catch (error) {
          retries++;
          errorMsg = error.message;
          if (retries <= maxRetries) {
            // Wait slightly before retry
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }

      // Update recipient status
      if (success) {
        dbRecipient.status = 'sent';
        dbRecipient.sentAt = new Date();
        dbRecipient.error = '';
        
        // Update stats
        campaign.stats.sent += 1;
        if (campaign.stats.remaining > 0) {
          campaign.stats.remaining -= 1;
        }

        campaign.logs.push({
          type: 'success',
          message: `Email sent successfully to ${dbRecipient.email}${retries > 0 ? ` (after ${retries} retries)` : ''}`
        });
      } else {
        dbRecipient.status = 'failed';
        dbRecipient.error = errorMsg;

        campaign.stats.failed += 1;
        if (campaign.stats.remaining > 0) {
          campaign.stats.remaining -= 1;
        }

        campaign.logs.push({
          type: 'error',
          message: `Failed to send email to ${dbRecipient.email} after ${maxRetries} retries. Error: ${errorMsg}`
        });
      }

      // Save progress to database
      await campaign.save();

      // Rate limiting: Delay before the next email
      if (i < recipientsToProcess.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    // Finalize campaign
    campaign.status = 'completed';
    campaign.logs.push({
      type: 'info',
      message: `Campaign finished processing. Sent: ${campaign.stats.sent}, Failed: ${campaign.stats.failed}`
    });
    await campaign.save();
    activeJobs.delete(campaignId.toString());

  } catch (err) {
    console.error(`Bulk sending error in campaign ${campaignId}:`, err);
    try {
      const campaign = await Campaign.findById(campaignId);
      if (campaign) {
        campaign.status = 'failed';
        campaign.logs.push({
          type: 'error',
          message: `Critical sending error occurred: ${err.message}`
        });
        await campaign.save();
      }
    } catch (e) {
      console.error(e);
    }
    activeJobs.delete(campaignId.toString());
  }
};

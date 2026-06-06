import mongoose from 'mongoose';

const recipientSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  email: { type: String, required: true },
  company: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  sentAt: { type: Date },
  error: { type: String, default: '' },
  opens: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
});

const logSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
  message: { type: String, required: true }
});

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
    recipients: [recipientSchema],
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'completed', 'failed', 'paused'],
      default: 'draft',
    },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    stats: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      remaining: { type: Number, default: 0 },
      bounces: { type: Number, default: 0 },
      opens: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
    },
    logs: [logSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Custom SMTP setup if not using default env vars
    smtpConfig: {
      host: { type: String },
      port: { type: Number },
      secure: { type: Boolean, default: false },
      auth: {
        user: { type: String },
        pass: { type: String },
      },
      service: { type: String, default: 'custom' }, // 'gmail', 'sendgrid', 'mailgun', 'ses', 'custom'
    },
    rateLimit: { type: Number, default: 1 }, // Delay between emails in seconds
  },
  { timestamps: true }
);

const Campaign = mongoose.model('Campaign', campaignSchema);
export default Campaign;

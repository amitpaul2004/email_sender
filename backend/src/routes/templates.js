import express from 'express';
import Template from '../models/Template.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// Get all templates
router.get('/', async (req, res) => {
  try {
    const templates = await Template.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    return res.json(templates);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get template by ID
router.get('/:id', async (req, res) => {
  try {
    const template = await Template.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    return res.json(template);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Create new template
router.post('/', async (req, res) => {
  const { name, subject, body, variables } = req.body;
  try {
    const template = await Template.create({
      name,
      subject,
      body,
      variables: variables || [],
      createdBy: req.user._id,
    });
    return res.status(201).json(template);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// Update template
router.put('/:id', async (req, res) => {
  const { name, subject, body, variables } = req.body;
  try {
    const template = await Template.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    template.name = name || template.name;
    template.subject = subject || template.subject;
    template.body = body || template.body;
    template.variables = variables || template.variables;

    const updatedTemplate = await template.save();
    return res.json(updatedTemplate);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// Delete template
router.delete('/:id', async (req, res) => {
  try {
    const template = await Template.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    await template.deleteOne();
    return res.json({ message: 'Template removed successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from './models/User.js';
import Template from './models/Template.js';

dotenv.config({ path: '../.env' });

const seedHackathonTemplate = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('Error: MONGODB_URI is not defined in .env file.');
      process.exit(1);
    }

    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    // Find the first user in the database to assign the template to
    const firstUser = await User.findOne();
    if (!firstUser) {
      console.log('No user accounts found. Run registration first, then run this script.');
      process.exit(0);
    }

    const templateData = {
      name: 'Hackathon Volunteer Invitation',
      subject: 'Be a Hero, {{name}}! Join us as a Hackathon Volunteer 🚀',
      body: `<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff; color: #1f2937;">
  <div style="text-align: center; margin-bottom: 20px;">
    <span style="font-size: 40px;">🚀</span>
  </div>
  <h2 style="color: #6d28d9; text-align: center; font-family: 'Outfit', sans-serif;">Join the Crew for Hackfest 2026!</h2>
  <p>Dear <strong>{{name}}</strong>,</p>
  <p>We saw your background with <strong>{{company}}</strong> and would love to invite you to join us as an official event volunteer for our upcoming <strong>Hackfest 2026</strong>! Volunteer participation is what makes this hackathon amazing for our developers.</p>
  
  <h3 style="color: #4f46e5; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; font-family: 'Outfit', sans-serif;">🎒 Volunteer Perks & Benefits:</h3>
  <ul style="line-height: 1.6;">
    <li>👕 Exclusive Volunteer T-Shirt & Swag Kit</li>
    <li>🍕 Free meals, snacks, and energy drinks throughout the weekend</li>
    <li>📜 Certificate of Appreciation & LinkedIn Recommendation</li>
    <li>🤝 Networking opportunities with top tech companies and sponsors</li>
  </ul>
  
  <p>If you're ready to help us coordinate registration tracks, mentor teams, or support logistics, click below to confirm your slot:</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://example.com/volunteer-register" style="background-color: #6d28d9; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Confirm Your Slot & Track</a>
  </div>
  
  <p style="font-size: 11px; color: #6b7280; text-align: center; margin-top: 40px; border-top: 1px solid #e5e7eb; pt-15;">
    Have questions? Reply directly to this email or visit our website.<br>
    You received this invitation because of your previous tech event participation.
  </p>
</div>`,
      variables: ['name', 'company'],
      createdBy: firstUser._id
    };

    // Check if it already exists
    const exists = await Template.findOne({ name: templateData.name, createdBy: firstUser._id });
    if (exists) {
      console.log('Template "Hackathon Volunteer Invitation" already exists for this user.');
    } else {
      await Template.create(templateData);
      console.log('Successfully seeded "Hackathon Volunteer Invitation" template!');
    }

    mongoose.connection.close();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
};

seedHackathonTemplate();

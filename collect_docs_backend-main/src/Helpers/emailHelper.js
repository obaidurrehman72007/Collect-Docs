// src/Helpers/emailHelper.js
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendBundleRequestEmail = async (clientEmail, templateUrl, requestId) => {
  await transporter.sendMail({
    to: clientEmail,
    subject: '📄 Please Upload Your Documents',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>Document Submission Required</h2>
        <p>Click below to upload your required documents:</p>
        <a href="${templateUrl}" 
           style="background: #4F46E5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Upload Documents Now
        </a>
        <p style="margin-top: 20px; color: #666;">
          <small>Request ID: ${requestId}</small>
        </p>
      </div>
    `
  });
};

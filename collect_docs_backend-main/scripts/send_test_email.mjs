#!/usr/bin/env node
// scripts/send_test_email.mjs
// Usage: node scripts/send_test_email.mjs recipient@example.com
// Or set TEST_EMAIL in your .env and run the script without args

import dotenv from 'dotenv';
import { sendMail, emailConfig } from '../src/Config/mailer.js';

dotenv.config();

const recipient = process.argv[2] || process.env.TEST_EMAIL;
if (!recipient) {
  console.error('Please provide a recipient email as the first argument or set TEST_EMAIL in .env');
  process.exit(1);
}

(async () => {
  const subject = 'Test Email from DocCollection';
  const html = `<p>This is a test email from DocCollection. If you received this, SMTP is configured correctly.</p>`;

  const res = await sendMail({ to: recipient, subject, html });
  if (res.success) {
    console.log('Test email sent successfully', res.info ? `messageId=${res.info.messageId}` : '');
    process.exit(0);
  } else {
    console.error('Failed to send test email:', res.error);
    process.exit(2);
  }
})();

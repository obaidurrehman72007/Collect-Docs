
// src/Config/mailer.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { buildRequestLink, completeRequestLink, buildReUploadLink,buildLoginLink } from "../Helpers/linker.js";


dotenv.config();

function createTransporter() {
  const smtpUrl = process.env.SMTP_URL || process.env.SMTP_URI;

  if (smtpUrl) {
    return nodemailer.createTransport(smtpUrl);
  }

  let host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT
    ? parseInt(process.env.SMTP_PORT, 10)
    : undefined;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (host && host.includes("@")) {
    console.warn("SMTP_HOST contains email-like string. Guessing real host...");
    if (user?.endsWith("@gmail.com")) host = "smtp.gmail.com";
    else if (user?.endsWith("@yahoo.com")) host = "smtp.mail.yahoo.com";
    else if (user?.endsWith("@outlook.com") || user?.endsWith("@hotmail.com"))
      host = "smtp.office365.com";
    else host = undefined;
  }

  const options = {
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    tls:
      process.env.SMTP_ALLOW_INSECURE === "true"
        ? { rejectUnauthorized: false }
        : undefined,
  };

  if (!host && user?.endsWith("@gmail.com")) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
      tls: options.tls,
    });
  }

  return nodemailer.createTransport(options);
}

const transporter = createTransporter();

let transporterVerified = false;

transporter
  .verify()
  .then(() => {
    transporterVerified = true;
    console.log("✔ Mailer: SMTP connection OK");
  })
  .catch((err) => {
    console.warn("⚠ Mailer: SMTP verification failed →", err.message || err);
  });


export const emailConfig = {
  from:
    process.env.EMAIL_FROM ,
  frontendUrl: process.env.FRONTEND_URL,
  loginUrl: `${process.env.FRONTEND_URL}/login`, // ← added for rejection email
};

export const emailEnabled =
  Boolean(process.env.SMTP_URL) ||
  Boolean(
    (process.env.SMTP_HOST || process.env.SMTP_URI) &&
      (process.env.SMTP_USER || process.env.EMAIL_USER) &&
      (process.env.SMTP_PASS || process.env.EMAIL_PASS)
  );

export async function sendMail({ to, subject, html }) {
  if (!emailEnabled && !transporterVerified) {
    console.log("[EMAIL SKIPPED - DEV]", {
      to,
      subject: subject?.slice(0, 40) + "...",
    });
    return { success: true, skipped: true };
  }

  try {
    const info = await transporter.sendMail({
      from: emailConfig.from,
      to,
      subject,
      html: getBwEmailTemplate(html),
    });

    console.log(`✔ Email sent → ${to}  [${info.messageId}]`);
    return { success: true, info };
  } catch (error) {
    console.error("✖ Email failed:", error.message || error);
    return { success: false, error: error.message || String(error) };
  }
}

function getBwEmailTemplate(content) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Collect Docs</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f9f9f9;color:#111111;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9f9f9;padding:40px 10px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:600px;background:#ffffff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#111111;padding:28px 40px;text-align:center;color:#ffffff;">
              <h1 style="margin:0;font-size:26px;font-weight:700;letter-spacing:0.5px;">COLLECT DOCS</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px;line-height:1.65;font-size:15px;color:#111111;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f5f5f5;padding:24px;text-align:center;font-size:13px;color:#555555;border-top:1px solid #e0e0e0;">
              <p style="margin:0 0 8px;">This is an automated message from Collect Docs</p>
              <p style="margin:0;">© ${new Date().getFullYear()} Collect Docs</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}


// export function buildRequestLink(shareId) {
//   if (!shareId) return `${emailConfig.frontendUrl}/public/invalid`;
//   return `${emailConfig.frontendUrl}/public/${shareId}`;
// }
// export function completeRequestLink(shareId) {
//   if (!shareId) return `${emailConfig.frontendUrl}/client-dashboard/invalid`;
//   return `${emailConfig.frontendUrl}/client-dashboard/${shareId}`;
// }

// export function buildLoginLink() {
//   return `${emailConfig.frontendUrl}login`;
   
// }
// export function buildReUploadLink(shareId) {
//   if (!shareId) return `${emailConfig.frontendUrl}/public/invalid`;
//   return `${emailConfig.frontendUrl}/public/${shareId}?reupload=true`;
// }


export async function sendBundleRequestEmail(clientEmail, shareId) {
  const link = buildRequestLink(shareId);

  return sendMail({
    to: clientEmail,
    subject: "New Document Request - Collect Docs",
    html: `
      <h2 style="margin-top:0;color:#111111;font-size:22px;">New Document Request</h2>
      <p>Hello,</p>
      <p>A new request for documents has been created for you.</p>
      <p style="text-align:center;margin:36px 0;">
        <a href="${link}" 
           style="background:#111111;color:#ffffff;padding:14px 36px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
          Upload Documents Now
        </a>
      </p>
      <p style="color:#444444;font-size:14px;">
        Button not working? Copy this link:<br>
        <a href="${link}" style="color:#111111;word-break:break-all;">${link}</a>
      </p>
    `,
  });
}

export async function sendDocumentApprovedEmail(clientEmail, submission) {
  return sendMail({
    to: clientEmail,
    subject: "Document Approved - Collect Docs",
    html: `
      <h2 style="margin-top:0;color:#111111;font-size:22px;">Document Approved</h2>
      <p>Hello,</p>
      <p>Your document <strong>${submission.file_name}</strong> has been reviewed and approved.</p>
      <p style="margin-top:24px;">No further action required.</p>
      <p>Thank you.</p>
    `,
  });
}

export async function sendDocumentRejectedEmail(
  clientEmail,
  submission,
  reason
) {
  const loginLink = buildReUploadLink(submission.bundle_request_id);

  return sendMail({
    to: clientEmail,
    subject: "Document Requires Revision - Collect Docs",
    html: `
      <h2 style="margin-top:0;color:#111111;font-size:22px;">Document Rejected</h2>
      <p>Hello,</p>
      <p>Your uploaded document <strong>${
        submission.file_name
      }</strong> needs revision.</p>
      
      <div style="background:#f5f5f5;padding:16px;border-left:4px solid #111111;margin:24px 0;">
        <strong>Reason:</strong><br>
        ${reason || "No reason provided"}
      </div>

      <p style="text-align:center;margin:36px 0;">
        <a href="${loginLink}" 
           style="background:#111111;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;">
          Log in to Upload New Version
        </a>
      </p>
      <p style="color:#444444;font-size:14px;text-align:center;">
        You will be redirected to login page.<br>
        After logging in, go to your requests/dashboard to upload the corrected file.
      </p>
    `,
  });
}

export async function sendRequestCompletedEmail(
  clientEmail,
  bundleName,
  shareId
) {
  const link = completeRequestLink(shareId);

  return sendMail({
    to: clientEmail,
    subject: "Request Completed - Collect Docs",
    html: `
      <h2 style="margin-top:0;color:#111111;font-size:22px;">Request Completed</h2>
      <p>Hello,</p>
      <p>Your document request <strong>"${bundleName}"</strong> has been completed by our team.</p>
      
      <p style="text-align:center;margin:36px 0;">
        <a href="${link}" 
           style="background:#111111;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;">
          View Completed Request
        </a>
      </p>
    `,
  });
}

// export async function sendClientCreatedEmail(clientEmail, clientName,clientPassword) {
//   const loginLink = emailConfig.loginUrl || `${emailConfig.frontendUrl}/login`;

//   return sendMail({
//     to: clientEmail,
//     subject: "Welcome to Collect Docs - Your Account is Ready",
//     html: `
//       <h2 style="margin-top:0;color:#111111;font-size:22px;">Welcome${clientName ? `, ${clientName}` : ""}!</h2>
      
//       <p>Your account has been successfully created.</p>
//       <p>Use the credentials below to log in:</p>

//       <div style="background:#f5f5f5;padding:24px;margin:28px 0;border:1px solid #e0e0e0;border-radius:6px;">
//         <div style="margin-bottom:16px;">
//           <strong>Email:</strong><br>
//           <span style="font-size:16px;">${clientEmail}</span>
//         </div>
//         <div>
//           <strong>Initial Password:</strong><br>
//           <span style="font-size:16px;">${clientPassword}</span>
//         </div>
//       </div>

//       <p style="color:#555555;font-size:14px;margin:0 0 28px;">
//         For your security, please change your password after first login.
//       </p>

//       <p style="text-align:center;margin:32px 0;">
//         <a href="${loginLink}"
//            style="background:#111111;color:#ffffff;padding:14px 36px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
//           Log In Now
//         </a>
//       </p>

//       <p>We're excited to work with you!</p>
//     `,
//   });
// }
export const sendClientCreatedEmail = async ({ to, name, resetUrl, expiresIn }) => {
  try {
    const content = `
      <h2 style="margin-top:0;color:#111111;font-size:22px;">Welcome${name ? `, ${name}` : ""}!</h2>
      <p>Your account has been successfully created in Collect Docs.</p>
      
      <p style="margin:20px 0 10px;">Account Details:</p>
      <div style="background:#f5f5f5;padding:20px;margin:20px 0;border:1px solid #e0e0e0;border-radius:6px;">
        <div style="margin-bottom:12px;">
          <strong>Email:</strong><br>
          <span style="font-size:16px;">${to}</span>
        </div>
        <div>
          <strong>Password:</strong><br>
          <span style="font-size:16px;">(You will set this yourself)</span>
        </div>
      </div>

      <p style="margin:28px 0 12px;">
        To activate your account and set your password, please click the button below:
      </p>

      <p style="text-align:center;margin:32px 0;">
        <a href="${resetUrl}"
           style="background:#111111;color:#ffffff;padding:14px 36px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
          Set Your Password
        </a>
      </p>

      <p style="color:#555555;font-size:14px;margin:0 0 20px;">
        This link will expire in <strong>${expiresIn}</strong>.
      </p>

      <p>If the button doesn't work, copy and paste this link:<br>
        <a href="${resetUrl}" style="color:#111111;word-break:break-all;">${resetUrl}</a>
      </p>

      <p>We're excited to have you on board!</p>
    `;

    const html = getBwEmailTemplate(content);

    const info = await transporter.sendMail({
      from: '"Collect Docs" <your@email.com>',
      to,
      subject: 'Welcome to Collect Docs – Set Your Password',
      text: `Welcome, ${name || ''}!\n\nYour account is ready.\n\nEmail: ${to}\nSet your password here: ${resetUrl}\n\nLink expires in ${expiresIn}.\n\nBest,\nCollect Docs Team`,
      html,
    });

    return { success: true, info };
  } catch (error) {
    return { success: false, error };
  }
};

export async function sendClientDeletedEmail(clientEmail, clientName) {
  return sendMail({
    to: clientEmail,
    subject: "Account Removed - Collect Docs",
    html: `
      <h2 style="margin-top:0;color:#111111;font-size:22px;">Account Removed</h2>
      <p>Hello${clientName ? ` ${clientName}` : ""},</p>
      <p>Your account has been deleted from Collect Docs.</p>
      <p>If this was not intended, please contact support immediately.</p>
    `,
  });
}
export async function sendPasswordResetEmail({ to, name, resetUrl, expiresIn = '2 hours' }) {
  const safeName = name || 'there';

  return sendMail({
    to,
    subject: 'Collect Docs – Password Reset Request',
    html: `
      <h2 style="margin-top:0;color:#111111;font-size:22px;">Reset Your Password</h2>
      
      <p>Hello ${safeName},</p>
      
      <p>You (or someone else) requested to reset the password for your Collect Docs account.</p>
      
      <div style="text-align:center;margin:40px 0;">
        <a href="${resetUrl}"
           style="background:#111111;color:white;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block;box-shadow:0 2px 6px rgba(0,0,0,0.15);">
          Reset Password
        </a>
      </div>

      <p style="color:#444444;font-size:14px;line-height:1.5;">
        This reset link will expire in <strong>${expiresIn}</strong> for security reasons.<br>
        If the button doesn't work, use this link:<br>
        <a href="${resetUrl}" style="color:#111111;word-break:break-all;font-size:13px;">${resetUrl}</a>
      </p>

      <div style="background:#fff8e1;padding:16px;border-left:4px solid #f59e0b;margin:28px 0;font-size:14px;color:#92400e;">
        <strong>Security Notice:</strong> Never share this link with anyone. 
        Our team will never ask for your password or reset link.
      </div>

      <p style="color:#555555;font-size:13px;margin-top:32px;">
        If you didn't request this reset, you can safely ignore this email —<br>
        your password remains unchanged.
      </p>

      <p style="margin-top:24px;">Best regards,<br>The Collect Docs Team</p>
    `,
  });
}
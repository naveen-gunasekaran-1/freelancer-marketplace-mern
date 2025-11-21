const nodemailer = require('nodemailer');

// Create reusable transporter (lazily initialized)
let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false // For development
      }
    });
  }
  return transporter;
}

// Email templates
const emailTemplates = {
  payment: (data) => ({
    subject: `Payment ${data.action} - ${data.jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Payment ${data.action}</h2>
        <p>Hello ${data.recipientName},</p>
        <p>${data.message}</p>
        <p><strong>Job:</strong> ${data.jobTitle}</p>
        <p><strong>Amount:</strong> ₹${data.amount.toLocaleString('en-IN')}</p>
        <a href="${data.actionUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          View Details
        </a>
        <p style="margin-top: 24px; color: #6B7280; font-size: 14px;">
          This is an automated message from Freelancer Marketplace. Please do not reply to this email.
        </p>
      </div>
    `
  }),
  
  proposal: (data) => ({
    subject: `New Proposal for "${data.jobTitle}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">New Proposal Received</h2>
        <p>Hello ${data.recipientName},</p>
        <p>${data.freelancerName} has submitted a proposal for your job posting.</p>
        <p><strong>Job:</strong> ${data.jobTitle}</p>
        <p><strong>Proposed Budget:</strong> ₹${data.proposedBudget.toLocaleString('en-IN')}</p>
        <p><strong>Timeline:</strong> ${data.timeline}</p>
        <a href="${data.actionUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          View Proposal
        </a>
        <p style="margin-top: 24px; color: #6B7280; font-size: 14px;">
          This is an automated message from Freelancer Marketplace.
        </p>
      </div>
    `
  }),

  proposalAccepted: (data) => ({
    subject: `Congratulations! Your proposal for "${data.jobTitle}" was accepted`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">🎉 Proposal Accepted!</h2>
        <p>Hello ${data.recipientName},</p>
        <p>Great news! Your proposal for "${data.jobTitle}" has been accepted by ${data.clientName}.</p>
        <p><strong>Budget:</strong> ₹${data.budget.toLocaleString('en-IN')}</p>
        <p><strong>Next Steps:</strong></p>
        <ul>
          <li>Connect with the client via secure chat</li>
          <li>Review project details in the workspace</li>
          <li>Start working on the project deliverables</li>
        </ul>
        <a href="${data.actionUrl}" style="display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Go to Workspace
        </a>
        <p style="margin-top: 24px; color: #6B7280; font-size: 14px;">
          This is an automated message from Freelancer Marketplace.
        </p>
      </div>
    `
  }),

  review: (data) => ({
    subject: `New Review Received`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F59E0B;">⭐ New Review</h2>
        <p>Hello ${data.recipientName},</p>
        <p>${data.reviewerName} has left a review for your work on "${data.jobTitle}".</p>
        <p><strong>Rating:</strong> ${'⭐'.repeat(data.rating)} (${data.rating}/5)</p>
        <p><strong>Comment:</strong></p>
        <p style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; font-style: italic;">
          "${data.comment.substring(0, 200)}${data.comment.length > 200 ? '...' : ''}"
        </p>
        <a href="${data.actionUrl}" style="display: inline-block; padding: 12px 24px; background-color: #F59E0B; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          View Full Review
        </a>
        <p style="margin-top: 24px; color: #6B7280; font-size: 14px;">
          This is an automated message from Freelancer Marketplace.
        </p>
      </div>
    `
  }),

  message: (data) => ({
    subject: `New Message from ${data.senderName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8B5CF6;">💬 New Message</h2>
        <p>Hello ${data.recipientName},</p>
        <p>You have received a new message from ${data.senderName}.</p>
        <p style="background-color: #F3F4F6; padding: 16px; border-radius: 8px;">
          "${data.message.substring(0, 200)}${data.message.length > 200 ? '...' : ''}"
        </p>
        <a href="${data.actionUrl}" style="display: inline-block; padding: 12px 24px; background-color: #8B5CF6; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Reply to Message
        </a>
        <p style="margin-top: 24px; color: #6B7280; font-size: 14px;">
          This is an automated message from Freelancer Marketplace.
        </p>
      </div>
    `
  }),

  dispute: (data) => ({
    subject: `Dispute ${data.action} - ${data.jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EF4444;">⚠️ Dispute ${data.action}</h2>
        <p>Hello ${data.recipientName},</p>
        <p>${data.message}</p>
        <p><strong>Job:</strong> ${data.jobTitle}</p>
        <p><strong>Status:</strong> ${data.status}</p>
        <a href="${data.actionUrl}" style="display: inline-block; padding: 12px 24px; background-color: #EF4444; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          View Dispute Details
        </a>
        <p style="margin-top: 24px; color: #6B7280; font-size: 14px;">
          This is an automated message from Freelancer Marketplace.
        </p>
      </div>
    `
  }),

  verification: (data) => ({
    subject: `Skill Verification ${data.status}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">🏆 Skill Verification Update</h2>
        <p>Hello ${data.recipientName},</p>
        <p>Your skill verification request for "${data.skillName}" has been ${data.status}.</p>
        ${data.status === 'approved' ? `
          <p>Congratulations! You can now display the verified badge on your profile.</p>
        ` : `
          <p><strong>Reason:</strong> ${data.reason}</p>
          <p>You can resubmit your verification with additional proof.</p>
        `}
        <a href="${data.actionUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          View Profile
        </a>
        <p style="margin-top: 24px; color: #6B7280; font-size: 14px;">
          This is an automated message from Freelancer Marketplace.
        </p>
      </div>
    `
  })
};

// Send email notification
async function sendEmailNotification(recipientEmail, type, data) {
  try {
    // Check if SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.log('SMTP not configured. Email notification skipped.');
      return { success: false, message: 'SMTP not configured' };
    }

    const template = emailTemplates[type];
    if (!template) {
      console.error(`Unknown email template type: ${type}`);
      return { success: false, message: 'Unknown template type' };
    }

    const { subject, html } = template(data);

    const mailOptions = {
      from: `"Freelancer Marketplace" <${process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject,
      html
    };

    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
}

// Send bulk emails (for admin broadcasts)
async function sendBulkEmails(recipients, subject, html) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.log('SMTP not configured. Bulk email skipped.');
      return { success: false, message: 'SMTP not configured' };
    }

    const mailOptions = {
      from: `"Freelancer Marketplace" <${process.env.SMTP_USER}>`,
      bcc: recipients, // Use BCC to hide recipient emails
      subject,
      html
    };

    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log('Bulk email sent:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Bulk email error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendEmailNotification,
  sendBulkEmails
};

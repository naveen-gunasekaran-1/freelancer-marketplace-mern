const axios = require('axios');

// SendPulse API Configuration
const SENDPULSE_API_URL = process.env.SENDPULSE_API_URL || 'https://api.sendpulse.com';
const CLIENT_ID = process.env.SENDPULSE_CLIENT_ID;
const CLIENT_SECRET = process.env.SENDPULSE_CLIENT_SECRET;
const FROM_EMAIL = process.env.SENDPULSE_FROM_EMAIL || 'noreply@freelancehub.com';
const FROM_NAME = process.env.SENDPULSE_FROM_NAME || 'FreelanceHub';

// Token cache
let accessToken = null;
let tokenExpiry = null;

// Get OAuth access token
async function getAccessToken() {
  try {
    // Return cached token if still valid
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
      return accessToken;
    }

    // Request new token
    const response = await axios.post(`${SENDPULSE_API_URL}/oauth/access_token`, {
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    });

    accessToken = response.data.access_token;
    // Token expires in 1 hour, cache for 50 minutes to be safe
    tokenExpiry = Date.now() + (50 * 60 * 1000);

    console.log('SendPulse: Access token obtained');
    return accessToken;
  } catch (error) {
    console.error('SendPulse: Failed to get access token:', error.message);
    throw new Error('Failed to authenticate with SendPulse');
  }
}

// Email templates (same as before)
const emailTemplates = {
  payment: (data) => ({
    subject: `Payment ${data.action} - ${data.jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; margin: 0;">FreelanceHub</h1>
        </div>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin: 0 0 10px 0;">Payment ${data.action}</h2>
          <p style="color: #ffffff; font-size: 16px; margin: 0;">Transaction update for your project</p>
        </div>
        <div style="padding: 20px;">
          <p style="font-size: 16px; color: #333333;">Hello <strong>${data.recipientName}</strong>,</p>
          <p style="font-size: 14px; color: #666666; line-height: 1.6;">${data.message}</p>
          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #374151;"><strong>Job:</strong> ${data.jobTitle}</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Amount:</strong> <span style="color: #10B981; font-size: 18px; font-weight: bold;">₹${data.amount.toLocaleString('en-IN')}</span></p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.actionUrl}" style="display: inline-block; padding: 14px 32px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Transaction Details
            </a>
          </div>
        </div>
        <div style="border-top: 1px solid #E5E7EB; padding: 20px; text-align: center;">
          <p style="color: #9CA3AF; font-size: 12px; margin: 5px 0;">This is an automated message from FreelanceHub</p>
          <p style="color: #9CA3AF; font-size: 12px; margin: 5px 0;">Please do not reply to this email</p>
        </div>
      </div>
    `
  }),
  
  proposal: (data) => ({
    subject: `New Proposal for "${data.jobTitle}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; margin: 0;">FreelanceHub</h1>
        </div>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin: 0 0 10px 0;">🎉 New Proposal Received</h2>
          <p style="color: #ffffff; font-size: 16px; margin: 0;">A freelancer is interested in your project</p>
        </div>
        <div style="padding: 20px;">
          <p style="font-size: 16px; color: #333333;">Hello <strong>${data.recipientName}</strong>,</p>
          <p style="font-size: 14px; color: #666666; line-height: 1.6;"><strong>${data.freelancerName}</strong> has submitted a proposal for your job posting.</p>
          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #374151;"><strong>Job:</strong> ${data.jobTitle}</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Proposed Budget:</strong> <span style="color: #10B981; font-weight: bold;">₹${data.proposedBudget.toLocaleString('en-IN')}</span></p>
            <p style="margin: 5px 0; color: #374151;"><strong>Timeline:</strong> ${data.timeline}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.actionUrl}" style="display: inline-block; padding: 14px 32px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Proposal
            </a>
          </div>
        </div>
        <div style="border-top: 1px solid #E5E7EB; padding: 20px; text-align: center;">
          <p style="color: #9CA3AF; font-size: 12px; margin: 5px 0;">This is an automated message from FreelanceHub</p>
        </div>
      </div>
    `
  }),

  proposalAccepted: (data) => ({
    subject: `🎉 Congratulations! Your proposal for "${data.jobTitle}" was accepted`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; margin: 0;">FreelanceHub</h1>
        </div>
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin: 0 0 10px 0;">🎉 Proposal Accepted!</h2>
          <p style="color: #ffffff; font-size: 16px; margin: 0;">Congratulations on your new project</p>
        </div>
        <div style="padding: 20px;">
          <p style="font-size: 16px; color: #333333;">Hello <strong>${data.recipientName}</strong>,</p>
          <p style="font-size: 14px; color: #666666; line-height: 1.6;">Great news! Your proposal for "<strong>${data.jobTitle}</strong>" has been accepted by ${data.clientName}.</p>
          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #374151;"><strong>Budget:</strong> <span style="color: #10B981; font-weight: bold;">₹${data.budget.toLocaleString('en-IN')}</span></p>
          </div>
          <div style="background-color: #EFF6FF; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #1E40AF; font-weight: bold;">Next Steps:</p>
            <ul style="margin: 0; padding-left: 20px; color: #374151;">
              <li>Connect with the client via secure chat</li>
              <li>Review project details in the workspace</li>
              <li>Start working on the project deliverables</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.actionUrl}" style="display: inline-block; padding: 14px 32px; background-color: #10B981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Go to Workspace
            </a>
          </div>
        </div>
        <div style="border-top: 1px solid #E5E7EB; padding: 20px; text-align: center;">
          <p style="color: #9CA3AF; font-size: 12px; margin: 5px 0;">This is an automated message from FreelanceHub</p>
        </div>
      </div>
    `
  }),

  review: (data) => ({
    subject: `⭐ New Review Received`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; margin: 0;">FreelanceHub</h1>
        </div>
        <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin: 0 0 10px 0;">⭐ New Review Received</h2>
          <p style="color: #ffffff; font-size: 16px; margin: 0;">Someone reviewed your work</p>
        </div>
        <div style="padding: 20px;">
          <p style="font-size: 16px; color: #333333;">Hello <strong>${data.recipientName}</strong>,</p>
          <p style="font-size: 14px; color: #666666; line-height: 1.6;"><strong>${data.reviewerName}</strong> has left a review for your work on "<strong>${data.jobTitle}</strong>".</p>
          <div style="background-color: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #92400E; font-weight: bold;">Rating</p>
            <p style="margin: 0; font-size: 32px;">${'⭐'.repeat(data.rating)}</p>
            <p style="margin: 10px 0 0 0; color: #92400E; font-weight: bold;">${data.rating}/5</p>
          </div>
          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #374151; font-weight: bold;">Comment:</p>
            <p style="margin: 0; color: #6B7280; font-style: italic; line-height: 1.6;">
              "${data.comment.substring(0, 200)}${data.comment.length > 200 ? '...' : ''}"
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.actionUrl}" style="display: inline-block; padding: 14px 32px; background-color: #F59E0B; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Full Review
            </a>
          </div>
        </div>
        <div style="border-top: 1px solid #E5E7EB; padding: 20px; text-align: center;">
          <p style="color: #9CA3AF; font-size: 12px; margin: 5px 0;">This is an automated message from FreelanceHub</p>
        </div>
      </div>
    `
  }),

  message: (data) => ({
    subject: `💬 New Message from ${data.senderName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; margin: 0;">FreelanceHub</h1>
        </div>
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin: 0 0 10px 0;">💬 New Message</h2>
          <p style="color: #ffffff; font-size: 16px; margin: 0;">You have a new message</p>
        </div>
        <div style="padding: 20px;">
          <p style="font-size: 16px; color: #333333;">Hello <strong>${data.recipientName}</strong>,</p>
          <p style="font-size: 14px; color: #666666; line-height: 1.6;">You have received a new message from <strong>${data.senderName}</strong>.</p>
          <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8B5CF6;">
            <p style="margin: 0; color: #374151; line-height: 1.6;">
              "${data.message.substring(0, 200)}${data.message.length > 200 ? '...' : ''}"
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.actionUrl}" style="display: inline-block; padding: 14px 32px; background-color: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Reply to Message
            </a>
          </div>
        </div>
        <div style="border-top: 1px solid #E5E7EB; padding: 20px; text-align: center;">
          <p style="color: #9CA3AF; font-size: 12px; margin: 5px 0;">This is an automated message from FreelanceHub</p>
        </div>
      </div>
    `
  }),

  dispute: (data) => ({
    subject: `⚠️ Dispute ${data.action} - ${data.jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; margin: 0;">FreelanceHub</h1>
        </div>
        <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin: 0 0 10px 0;">⚠️ Dispute ${data.action}</h2>
          <p style="color: #ffffff; font-size: 16px; margin: 0;">Action required</p>
        </div>
        <div style="padding: 20px;">
          <p style="font-size: 16px; color: #333333;">Hello <strong>${data.recipientName}</strong>,</p>
          <p style="font-size: 14px; color: #666666; line-height: 1.6;">${data.message}</p>
          <div style="background-color: #FEF2F2; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #7F1D1D;"><strong>Job:</strong> ${data.jobTitle}</p>
            <p style="margin: 5px 0; color: #7F1D1D;"><strong>Status:</strong> ${data.status}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.actionUrl}" style="display: inline-block; padding: 14px 32px; background-color: #EF4444; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Dispute Details
            </a>
          </div>
        </div>
        <div style="border-top: 1px solid #E5E7EB; padding: 20px; text-align: center;">
          <p style="color: #9CA3AF; font-size: 12px; margin: 5px 0;">This is an automated message from FreelanceHub</p>
        </div>
      </div>
    `
  }),

  verification: (data) => ({
    subject: `🏆 Skill Verification ${data.status}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; margin: 0;">FreelanceHub</h1>
        </div>
        <div style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin: 0 0 10px 0;">🏆 Skill Verification Update</h2>
          <p style="color: #ffffff; font-size: 16px; margin: 0;">Your verification status has changed</p>
        </div>
        <div style="padding: 20px;">
          <p style="font-size: 16px; color: #333333;">Hello <strong>${data.recipientName}</strong>,</p>
          <p style="font-size: 14px; color: #666666; line-height: 1.6;">Your skill verification request for "<strong>${data.skillName}</strong>" has been <strong>${data.status}</strong>.</p>
          ${data.status === 'approved' ? `
            <div style="background-color: #DBEAFE; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #1E40AF; line-height: 1.6;">
                🎉 Congratulations! You can now display the verified badge on your profile.
              </p>
            </div>
          ` : `
            <div style="background-color: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #92400E;"><strong>Reason:</strong></p>
              <p style="margin: 0; color: #92400E;">${data.reason}</p>
              <p style="margin: 10px 0 0 0; color: #92400E;">You can resubmit your verification with additional proof.</p>
            </div>
          `}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.actionUrl}" style="display: inline-block; padding: 14px 32px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Profile
            </a>
          </div>
        </div>
        <div style="border-top: 1px solid #E5E7EB; padding: 20px; text-align: center;">
          <p style="color: #9CA3AF; font-size: 12px; margin: 5px 0;">This is an automated message from FreelanceHub</p>
        </div>
      </div>
    `
  })
};

// Send email notification using SendPulse
async function sendEmailNotification(recipientEmail, type, data) {
  try {
    // Check if SendPulse is configured
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.log('SendPulse not configured. Email notification skipped.');
      return { success: false, message: 'SendPulse not configured' };
    }

    const template = emailTemplates[type];
    if (!template) {
      console.error(`Unknown email template type: ${type}`);
      return { success: false, message: 'Unknown template type' };
    }

    const { subject, html } = template(data);

    // Get access token
    const token = await getAccessToken();

    // Send email via SendPulse API
    const response = await axios.post(
      `${SENDPULSE_API_URL}/smtp/emails`,
      {
        email: {
          html: html,
          text: html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
          subject: subject,
          from: {
            name: FROM_NAME,
            email: FROM_EMAIL
          },
          to: [
            {
              email: recipientEmail
            }
          ]
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('SendPulse: Email sent successfully to', recipientEmail);
    return { success: true, messageId: response.data.id || 'sent' };
  } catch (error) {
    console.error('SendPulse: Email sending error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// Send bulk emails (for admin broadcasts)
async function sendBulkEmails(recipients, subject, html) {
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.log('SendPulse not configured. Bulk email skipped.');
      return { success: false, message: 'SendPulse not configured' };
    }

    // Get access token
    const token = await getAccessToken();

    // Prepare recipients array
    const to = recipients.map(email => ({ email }));

    // Send bulk email
    const response = await axios.post(
      `${SENDPULSE_API_URL}/smtp/emails`,
      {
        email: {
          html: html,
          text: html.replace(/<[^>]*>/g, ''),
          subject: subject,
          from: {
            name: FROM_NAME,
            email: FROM_EMAIL
          },
          to: to
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('SendPulse: Bulk email sent to', recipients.length, 'recipients');
    return { success: true, messageId: response.data.id || 'sent' };
  } catch (error) {
    console.error('SendPulse: Bulk email error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendEmailNotification,
  sendBulkEmails
};

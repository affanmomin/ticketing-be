import { Resend } from 'resend';
import { encodeCredentials } from '../utils/credentials';

interface EmailUser {
  id: string;
  email: string;
  name: string;
  userType: string;
}

interface WelcomeEmailData extends EmailUser {
  password?: string;
}

class EmailService {
  private resend: Resend | null = null;
  private readonly fromAddress: string;

  constructor() {
    this.fromAddress = process.env.SMTP_FROM || '"Sahra-Al-Aman Information Technology (SAAIT)" <onboarding@resend.dev>';
    const apiKey = process.env.RESEND_API_KEY;

    console.log('📧 Email Service Configuration:');
    console.log(`   Provider: Resend`);
    console.log(`   From: ${this.fromAddress}`);
    console.log(`   LOGO_URL: ${process.env.LOGO_URL ? 'set' : 'not set (using inline logo if available)'}`);

    if (!apiKey) {
      console.warn('⚠️  RESEND_API_KEY is not set. Email sending is disabled.');
      return;
    }

    this.resend = new Resend(apiKey);
    console.log('📧 Resend client initialized successfully.');
  }

  private renderEmailTemplate(
    title: string,
    contentHtml: string,
    options: { preheader?: string; accentColor?: string } = {},
  ): string {
    const { preheader, accentColor = '#1d4ed8' } = options;
    const year = new Date().getFullYear();
    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:24px;background-color:#f7f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    ${preheader ? `<span style="display:none !important; font-size:1px; color:#f7f8fa; line-height:1px;">${preheader}</span>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:14px;border:1px solid #e2e8f0;padding:32px;box-sizing:border-box;box-shadow:0 10px 35px rgba(15,23,42,0.05);">
      <tr>
        <td>
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:600;color:#ffffff;background:${accentColor};">
              Sahra-Al-Aman IT
            </div>
            <h1 style="margin:16px 0 8px;font-size:22px;color:#0f172a;">${title}</h1>
            ${preheader ? `<p style="margin:0;color:#475467;font-size:14px;">${preheader}</p>` : ''}
          </div>
          ${contentHtml}
          <p style="margin-top:32px;font-size:13px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:18px;">
            This is an automated message from Sahra-Al-Aman Information Technology (SAAIT). Please do not reply directly to this email.
          </p>
          <p style="margin:0;font-size:12px;color:#cbd5f5;">© ${year} Sahra-Al-Aman Information Technology</p>
        </td>
      </tr>
    </table>
  </body>
</html>
    `.trim();
  }

  private async sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
    if (!this.resend) {
      console.warn(`Email service not configured. Unable to send email to ${to}`);
      return;
    }

    // For testing: redirect all emails to TEST_EMAIL if set
    const testEmail = process.env.TEST_EMAIL;
    const recipientEmail = testEmail || to;
    const actualEmail = testEmail && testEmail !== to ? to : null;

    // Use Resend's test domain when in test mode to avoid domain verification issues
    const fromAddress = testEmail
      ? '"Sahra-Al-Aman Information Technology (SAAIT)" <onboarding@resend.dev>'
      : this.fromAddress;

    const { data, error } = await this.resend.emails.send({
      from: fromAddress,
      to: recipientEmail,
      subject: actualEmail ? `[TEST - Original: ${to}] ${subject}` : subject,
      html,
      text,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data?.id) {
      if (actualEmail) {
        console.log(`Email queued successfully (id: ${data.id}) to ${recipientEmail} (test mode - original: ${actualEmail})`);
      } else {
        console.log(`Email queued successfully (id: ${data.id}) to ${to}`);
      }
    }
  }

  /**
   * Send welcome email to newly created user
   */
  async sendWelcomeEmail(userData: WelcomeEmailData): Promise<void> {
    try {
      const isClient = userData.userType === 'CLIENT';
      const subject = isClient
        ? 'Welcome to Sahra-Al-Aman Information Technology (SAAIT) - Client Account Created'
        : 'Welcome to Sahra-Al-Aman Information Technology (SAAIT) - Your Account Has Been Created';

      const htmlContent = this.generateWelcomeEmailHtml(userData, isClient);
      const textContent = this.generateWelcomeEmailText(userData, isClient);

      await this.sendEmail(userData.email, subject, htmlContent, textContent);

      console.log(`Welcome email sent successfully to ${userData.email}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`Failed to send welcome email to ${userData.email}:`, errorMessage);
      if (errorStack) {
        console.error('Error stack:', errorStack);
      }
      // Don't throw error to avoid failing user creation if email fails
    }
  }

  /**
   * Send notification email to newly created client (no login credentials)
   */
  async sendClientNotificationEmail(clientName: string, clientEmail: string): Promise<void> {
    try {
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
      const loginUrl = `${baseUrl}/login`;

      const htmlContent = this.renderEmailTemplate(
        'Your client account is ready',
        `
          <p style="margin:0 0 16px;font-size:15px;">Hi ${clientName},</p>
          <p style="margin:0 0 16px;color:#475467;">
            Your organization can now raise requests, monitor SLA progress, and collaborate with the SAAIT delivery team in one place.
          </p>
          <div style="margin:0 0 18px;padding:16px;border:1px solid #e2e8f0;border-radius:10px;background-color:#f8fafc;">
            <p style="margin:0 0 8px;font-weight:600;color:#0f172a;">Quick actions</p>
            <ol style="margin:0;padding-left:18px;color:#475467;font-size:13px;line-height:1.6;">
              <li>Share the login link with key stakeholders: <span style="color:#2563eb;">${loginUrl}</span></li>
              <li>Let us know which teammates need accounts.</li>
              <li>Start submitting tickets—our engineers will keep you posted.</li>
            </ol>
          </div>
          <p style="margin:0;color:#475467;">Need assistance? Just reply to this email or reach your SAAIT account manager.</p>
        `,
        {
          preheader: 'Your organization now has access to the SAAIT ticketing workspace.',
          accentColor: '#2563eb',
        },
      );

      const textContent = `
Client Account Created

Hello ${clientName},

Your client account has been successfully created in Sahra-Al-Aman Information Technology (SAAIT) ticketing system.

You can access the SAAIT ticketing system at: ${loginUrl}

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
The Sahra-Al-Aman Information Technology (SAAIT) Team

---
This is an automated message. Please do not reply to this email.
If you didn't expect this email, please contact our support team immediately.
      `.trim();

      await this.sendEmail(
        clientEmail,
        'Client Account Created - Sahra-Al-Aman Information Technology (SAAIT)',
        htmlContent,
        textContent,
      );

      console.log(`Client notification email sent successfully to ${clientEmail}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`Failed to send client notification email to ${clientEmail}:`, errorMessage);
      if (errorStack) {
        console.error('Error stack:', errorStack);
      }
      // Don't throw error to avoid failing client creation if email fails
    }
  }



  /**
   * Generate HTML content for welcome email
   */
  private generateWelcomeEmailHtml(userData: WelcomeEmailData, isClient: boolean = false): string {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    let loginUrl = `${baseUrl}/login`;
    if (userData.password) {
      const encodedCreds = encodeCredentials(userData.email, userData.password);
      loginUrl = `${baseUrl}/login?creds=${encodeURIComponent(encodedCreds)}`;
    }

    const roleAccents: Record<string, string> = {
      ADMIN: '#ea580c',
      EMPLOYEE: '#0ea5e9',
      CLIENT: '#6366f1',
    };
    const accent = roleAccents[userData.userType] || '#2563eb';

    const detailRows = `
      <tr>
        <td style="font-size:13px;color:#64748b;">Email</td>
        <td style="font-size:13px;font-weight:600;color:#0f172a;text-align:right;">${userData.email}</td>
                            </tr>
                            <tr>
        <td style="font-size:13px;color:#64748b;">Role</td>
        <td style="font-size:13px;font-weight:600;color:#0f172a;text-align:right;">${userData.userType}</td>
                            </tr>
                            ${userData.password ? `
                            <tr>
        <td style="font-size:13px;color:#64748b;">Temporary password</td>
        <td style="font-size:13px;font-weight:600;color:#0f172a;text-align:right;">${userData.password}</td>
      </tr>` : ''}
    `;

    const content = `
      <p style="margin:0 0 16px;font-size:15px;color:#0f172a;">
        Hi <strong>${userData.name}</strong>, your ${userData.userType.toLowerCase()} workspace${isClient ? ' for your organization' : ''} is ready to go.
      </p>
      <div style="margin:0 0 20px;padding:18px;border:1px solid #e2e8f0;border-radius:10px;background:linear-gradient(135deg,rgba(37,99,235,0.04),rgba(14,165,233,0.05));">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${detailRows}
        </table>
      </div>
      <p style="margin:0 0 20px;">
        <a href="${loginUrl}" style="display:inline-block;padding:12px 26px;background:${accent};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
          Open ticketing workspace
        </a>
      </p>
      <div style="margin:0 0 16px;padding:14px 16px;border-radius:10px;background-color:#f8fafc;color:#0f172a;font-size:13px;line-height:1.5;">
        <strong style="display:block;margin-bottom:6px;">Tips:</strong>
        <ul style="margin:0;padding-left:18px; color:#475467;">
          <li>Bookmark the login link for quick access.</li>
          ${userData.password ? '<li>Change your temporary password after signing in.</li>' : '<li>Use your existing credentials to sign in.</li>'}
          <li>Update ticket statuses as work progresses.</li>
        </ul>
      </div>
    `;

    return this.renderEmailTemplate(
      'Welcome to SAAIT',
      content,
      {
        preheader: `Your ${userData.userType.toLowerCase()} account is ready.`,
        accentColor: accent,
      },
    );
  }

  /**
   * Generate plain text content for welcome email
   */
  private generateWelcomeEmailText(userData: WelcomeEmailData, isClient: boolean = false): string {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';

    // Create login URL with encoded credentials if password is provided
    let loginUrl = `${baseUrl}/login`;
    if (userData.password) {
      const encodedCreds = encodeCredentials(userData.email, userData.password);
      loginUrl = `${baseUrl}/login?creds=${encodeURIComponent(encodedCreds)}`;
    }

    return `
Welcome to Sahra-Al-Aman Information Technology (SAAIT)!

Hello ${userData.name},

Your ${isClient ? 'client' : 'team member'} account has been successfully created in Sahra-Al-Aman Information Technology (SAAIT) ticketing system.

Account Details:
- Email: ${userData.email}
- Account Type: ${userData.userType}
${userData.password ? `- Password: ${userData.password}` : ''}

${userData.password ?
  'Convenient Login: Use the link below and your credentials will be automatically filled in!\n' :
  ''
}

${userData.password ?
  'Security Note: Please change your password after your first login for enhanced security.\n' :
  ''
}

You can now access the SAAIT ticketing system at: ${loginUrl}

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
The Sahra-Al-Aman Information Technology (SAAIT) Team

---
This is an automated message. Please do not reply to this email.
If you didn't expect this email, please contact our support team immediately.
    `.trim();
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    fullName: string,
    resetToken: string
  ): Promise<void> {
    try {
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
      const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

      const subject = 'Password Reset Request - Sahra-Al-Aman Information Technology (SAAIT)';

      const htmlContent = this.generatePasswordResetEmailHtml(fullName, resetUrl);
      const textContent = this.generatePasswordResetEmailText(fullName, resetUrl);

      await this.sendEmail(email, subject, htmlContent, textContent);

      console.log(`Password reset email sent successfully to ${email}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`Failed to send password reset email to ${email}:`, errorMessage);
      if (errorStack) {
        console.error('Error stack:', errorStack);
      }
      throw error;
    }
  }

  private generatePasswordResetEmailHtml(fullName: string, resetUrl: string): string {
    const content = `
      <p style="margin:0 0 16px;">Hi ${fullName},</p>
      <p style="margin:0 0 16px;">
        A password reset was requested for your SAAIT account. Click the button below to choose a new password. The link expires in one hour.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background-color:#4338ca;color:#ffffff;text-decoration:none;border-radius:6px;">
          Reset password
                            </a>
                          </p>
      <p style="margin:0 0 16px;font-size:14px;color:#475467;">
        If the button doesn’t work, copy and paste this link into your browser:<br />
        <span style="word-break:break-all;color:#1d4ed8;">${resetUrl}</span>
      </p>
      <p style="margin:0;font-size:14px;color:#b45309;">
        Didn’t request this? You can ignore this message—your password stays the same.
      </p>
    `;

    return this.renderEmailTemplate(
      'Reset your SAAIT password',
      content,
      {
        preheader: 'Use the secure link to choose a new password (expires in 1 hour).',
        accentColor: '#4338ca',
      },
    );
  }

  private generatePasswordResetEmailText(fullName: string, resetUrl: string): string {
    return `
Password Reset Request - Sahra-Al-Aman Information Technology (SAAIT)

Hello ${fullName},

We received a request to reset your password. Click the link below to create a new password. This link will expire in 1 hour.

${resetUrl}

If you did not request a password reset, please ignore this email. Your password will remain unchanged.

If you have any questions or need assistance, please contact our support team.

Best regards,
Sahra-Al-Aman Information Technology (SAAIT) Team

---
This is an automated message. Please do not reply to this email.
This password reset link will expire in 1 hour for security reasons.
    `.trim();
  }

  /**
   * Send ticket creation notification email
   */
  async sendTicketCreatedEmail(
    assignedToEmail: string,
    assignedToName: string,
    ticketTitle: string,
    _ticketDescription: string | null, // Not used in email, kept for API compatibility
    raisedByName: string,
    projectName: string,
    _ticketId: string // Not used in email, kept for API compatibility
  ): Promise<void> {
    try {
      const subject = `New Ticket Assigned: ${ticketTitle}`;

      const htmlContent = this.generateTicketCreatedEmailHtml(
        assignedToName,
        ticketTitle,
        raisedByName,
        projectName
      );
      const textContent = this.generateTicketCreatedEmailText(
        assignedToName,
        ticketTitle,
        raisedByName,
        projectName
      );

      await this.sendEmail(assignedToEmail, subject, htmlContent, textContent);

      console.log(`Ticket creation email sent successfully to ${assignedToEmail}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`Failed to send ticket creation email to ${assignedToEmail}:`, errorMessage);
      if (errorStack) {
        console.error('Error stack:', errorStack);
      }
      // Don't throw error to avoid failing ticket creation if email fails
    }
  }

  private generateTicketCreatedEmailHtml(
    assignedToName: string,
    ticketTitle: string,
    raisedByName: string,
    projectName: string
  ): string {
    const content = `
      <p style="margin:0 0 16px;font-size:15px;">Hi ${assignedToName},</p>
      <p style="margin:0 0 16px;color:#475467;">A new ticket needs your attention in the <strong>${projectName}</strong> stream.</p>
      <div style="margin:0 0 18px;padding:16px;border:1px solid #e2e8f0;border-radius:10px;background-color:#f8fafc;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;color:#64748b;">Title</td>
            <td style="font-size:13px;font-weight:600;color:#0f172a;text-align:right;">${ticketTitle}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;">Project</td>
            <td style="font-size:13px;font-weight:600;color:#0f172a;text-align:right;">${projectName}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;">Raised by</td>
            <td style="font-size:13px;font-weight:600;color:#0f172a;text-align:right;">${raisedByName}</td>
          </tr>
        </table>
      </div>
      <p style="margin:0;color:#475467;">
        Please review the ticket details, acknowledge the assignment, and keep the status up to date so the requester can follow along.
      </p>
    `;

    return this.renderEmailTemplate(
      'New ticket assigned',
      content,
      {
        preheader: `${ticketTitle} was assigned to you in ${projectName}.`,
        accentColor: '#0d9488',
      },
    );
  }

  private generateTicketCreatedEmailText(
    assignedToName: string,
    ticketTitle: string,
    raisedByName: string,
    projectName: string
  ): string {
    return `
New Ticket Assigned - Sahra-Al-Aman Information Technology (SAAIT)

Hello ${assignedToName},

A new ticket has been assigned to you in the ${projectName} project.

Ticket Details:
- Title: ${ticketTitle}
- Project: ${projectName}
- Raised by: ${raisedByName}

If you have any questions about this ticket, please don't hesitate to reach out.

Best regards,
The Sahra-Al-Aman Information Technology (SAAIT) Team

---
This is an automated message. Please do not reply to this email.
    `.trim();
  }

  async testConnection(): Promise<boolean> {
    if (!this.resend) {
      console.warn('Resend client is not configured. Set RESEND_API_KEY to enable email sending.');
      return false;
    }

    try {
      const response = await this.resend.apiKeys.list({ limit: 1 });
      if (response.error) {
        console.error('Email service connection failed:', response.error.message);
        return false;
      }

      console.log('Email service connection verified with Resend API.');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Email service connection failed:', errorMessage);
      if (error instanceof Error && error.stack) {
        console.error('   Full error:', error.stack);
      }
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export types for use in other modules
export type { EmailUser, WelcomeEmailData };

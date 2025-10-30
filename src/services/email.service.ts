import nodemailer from 'nodemailer';
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

interface TicketData {
  id: string;
  title: string;
  descriptionMd: string;
  status: string;
  priority: string;
  type: string;
  dueDate?: string;
  reporterId: string;
  assigneeId?: string;
  projectId: string;
  clientId: string;
  createdAt: string;
  updatedAt: string;
}

interface TicketEmailData {
  ticket: TicketData;
  reporter?: EmailUser;
  assignee?: EmailUser;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Debug: Log SMTP configuration (without password)
    console.log('SMTP Configuration:');
    console.log('- Host:', process.env.SMTP_HOST || 'localhost (default)');
    console.log('- Port:', process.env.SMTP_PORT || '587 (default)');
    console.log('- User:', process.env.SMTP_USER || 'not set');
    console.log('- Pass:', process.env.SMTP_PASS ? '***set***' : 'not set');
    console.log('- From:', process.env.SMTP_FROM || 'not set');

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Send welcome email to newly created user
   */
  async sendWelcomeEmail(userData: WelcomeEmailData): Promise<void> {
    try {
      const isClient = userData.userType === 'CLIENT';
      const subject = isClient 
        ? 'Welcome to Our Ticketing System - Client Account Created'
        : 'Welcome to Our Ticketing System - Your Account Has Been Created';

      const htmlContent = this.generateWelcomeEmailHtml(userData, isClient);
      const textContent = this.generateWelcomeEmailText(userData, isClient);

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Ticketing System" <noreply@example.com>',
        to: userData.email,
        subject: subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`Welcome email sent successfully to ${userData.email}`);
    } catch (error) {
      console.error(`Failed to send welcome email to ${userData.email}:`, error);
      // Don't throw error to avoid failing user creation if email fails
    }
  }



  /**
   * Generate HTML content for welcome email
   */
  private generateWelcomeEmailHtml(userData: WelcomeEmailData, isClient: boolean = false): string {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    
    // Create login URL with encoded credentials if password is provided
    let loginUrl = `${baseUrl}/login`;
    if (userData.password) {
      const encodedCreds = encodeCredentials(userData.email, userData.password);
      loginUrl = `${baseUrl}/login?creds=${encodeURIComponent(encodedCreds)}`;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Ticketing System</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px; }
          .content { padding: 20px; background-color: #f9f9f9; border-radius: 5px; margin: 20px 0; }
          .credentials { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          .auto-login-note { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 10px; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Welcome to Our Ticketing System!</h1>
        </div>
        
        <div class="content">
          <h2>Hello ${userData.name},</h2>
          
          <p>Your ${isClient ? 'client' : 'team member'} account has been successfully created in our ticketing system.</p>
          
          <h3>Account Details:</h3>
          <div class="credentials">
            <strong>Email:</strong> ${userData.email}<br>
            <strong>Account Type:</strong> ${userData.userType}
            ${userData.password ? `<br><strong>Password:</strong> ${userData.password}` : ''}
          </div>
          
          ${userData.password ? 
            '<div class="auto-login-note"><strong>Convenient Login:</strong> Click the login button below and your credentials will be automatically filled in for you!</div>' : 
            ''
          }
          
          ${userData.password ? 
            '<p><strong>Security Note:</strong> Please change your password after your first login for enhanced security.</p>' : 
            ''
          }
          
          <p>You can now access the ticketing system using the link below:</p>
          
          <a href="${loginUrl}" class="button">${userData.password ? 'Login with Auto-Fill' : 'Login to System'}</a>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br>The Ticketing System Team</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>If you didn't expect this email, please contact our support team immediately.</p>
        </div>
      </body>
      </html>
    `;
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
Welcome to Our Ticketing System!

Hello ${userData.name},

Your ${isClient ? 'client' : 'team member'} account has been successfully created in our ticketing system.

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

You can now access the ticketing system at: ${loginUrl}

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
The Ticketing System Team

---
This is an automated message. Please do not reply to this email.
If you didn't expect this email, please contact our support team immediately.
    `.trim();
  }

  /**
   * Send ticket creation notification
   */
  async sendTicketCreatedEmail(data: TicketEmailData): Promise<void> {
    try {
      const recipients = this.getTicketEmailRecipients(data);
      
      for (const recipient of recipients) {
        const subject = `New Ticket Created: ${data.ticket.title}`;
        const htmlContent = this.generateTicketCreatedEmailHtml(data, recipient);
        const textContent = this.generateTicketCreatedEmailText(data, recipient);

        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || '"Ticketing System" <noreply@example.com>',
          to: recipient.email,
          subject: subject,
          text: textContent,
          html: htmlContent,
        });

        console.log(`Ticket creation email sent to ${recipient.email} for ticket ${data.ticket.id}`);
      }
    } catch (error) {
      console.error(`Failed to send ticket creation emails for ticket ${data.ticket.id}:`, error);
    }
  }

  /**
   * Send ticket update notification
   */
  async sendTicketUpdatedEmail(data: TicketEmailData): Promise<void> {
    try {
      const recipients = this.getTicketEmailRecipients(data);
      
      for (const recipient of recipients) {
        const subject = `Ticket Updated: ${data.ticket.title}`;
        const htmlContent = this.generateTicketUpdatedEmailHtml(data, recipient);
        const textContent = this.generateTicketUpdatedEmailText(data, recipient);

        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || '"Ticketing System" <noreply@example.com>',
          to: recipient.email,
          subject: subject,
          text: textContent,
          html: htmlContent,
        });

        console.log(`Ticket update email sent to ${recipient.email} for ticket ${data.ticket.id}`);
      }
    } catch (error) {
      console.error(`Failed to send ticket update emails for ticket ${data.ticket.id}:`, error);
    }
  }

  /**
   * Determine who should receive ticket notifications
   */
  private getTicketEmailRecipients(data: TicketEmailData): EmailUser[] {
    const recipients: EmailUser[] = [];
    
    // Always notify the assignee (if exists and different from reporter)
    if (data.assignee && data.assignee.id !== data.reporter?.id) {
      recipients.push(data.assignee);
    }
    
    // Always notify the reporter (if exists and different from assignee)
    if (data.reporter && data.reporter.id !== data.assignee?.id) {
      recipients.push(data.reporter);
    }
    
    return recipients;
  }

  /**
   * Generate HTML content for ticket creation email
   */
  private generateTicketCreatedEmailHtml(data: TicketEmailData, recipient: EmailUser): string {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    const ticketUrl = `${baseUrl}/tickets/${data.ticket.id}`;
    const isAssignee = recipient.id === data.ticket.assigneeId;
    const isReporter = recipient.id === data.ticket.reporterId;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Ticket Created</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px; }
          .content { padding: 20px; background-color: #f9f9f9; border-radius: 5px; margin: 20px 0; }
          .ticket-details { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          .priority { font-weight: bold; }
          .priority.P0 { color: #dc3545; }
          .priority.P1 { color: #fd7e14; }
          .priority.P2 { color: #ffc107; }
          .priority.P3 { color: #28a745; }
          .status { background-color: #6c757d; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎫 New Ticket Created</h1>
        </div>
        
        <div class="content">
          <h2>Hello ${recipient.name},</h2>
          
          <p>${isAssignee ? 'A new ticket has been assigned to you!' : 'A new ticket has been created.'}</p>
          
          <div class="ticket-details">
            <h3>${data.ticket.title}</h3>
            <p><strong>ID:</strong> ${data.ticket.id}</p>
            <p><strong>Type:</strong> ${data.ticket.type}</p>
            <p><strong>Priority:</strong> <span class="priority ${data.ticket.priority}">${data.ticket.priority}</span></p>
            <p><strong>Status:</strong> <span class="status">${data.ticket.status}</span></p>
            ${data.ticket.dueDate ? `<p><strong>Due Date:</strong> ${new Date(data.ticket.dueDate).toLocaleDateString()}</p>` : ''}
            ${data.reporter ? `<p><strong>Reporter:</strong> ${data.reporter.name}</p>` : ''}
            ${data.assignee ? `<p><strong>Assignee:</strong> ${data.assignee.name}</p>` : ''}
          </div>
          
          <h4>Description:</h4>
          <div style="background-color: white; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">
            ${data.ticket.descriptionMd.replace(/\n/g, '<br>')}
          </div>
          
          <p>Click the button below to view and work on this ticket:</p>
          
          <a href="${ticketUrl}" class="button">View Ticket</a>
          
          <p>Best regards,<br>The Ticketing System Team</p>
        </div>
        
        <div class="footer">
          <p>This is an automated notification. You're receiving this because you're ${isAssignee ? 'assigned to' : 'involved with'} this ticket.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for ticket creation email
   */
  private generateTicketCreatedEmailText(data: TicketEmailData, recipient: EmailUser): string {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    const ticketUrl = `${baseUrl}/tickets/${data.ticket.id}`;
    const isAssignee = recipient.id === data.ticket.assigneeId;

    return `
🎫 New Ticket Created

Hello ${recipient.name},

${isAssignee ? 'A new ticket has been assigned to you!' : 'A new ticket has been created.'}

Ticket Details:
- Title: ${data.ticket.title}
- ID: ${data.ticket.id}
- Type: ${data.ticket.type}
- Priority: ${data.ticket.priority}
- Status: ${data.ticket.status}
${data.ticket.dueDate ? `- Due Date: ${new Date(data.ticket.dueDate).toLocaleDateString()}` : ''}
${data.reporter ? `- Reporter: ${data.reporter.name}` : ''}
${data.assignee ? `- Assignee: ${data.assignee.name}` : ''}

Description:
${data.ticket.descriptionMd}

View ticket at: ${ticketUrl}

Best regards,
The Ticketing System Team

---
This is an automated notification. You're receiving this because you're ${isAssignee ? 'assigned to' : 'involved with'} this ticket.
    `.trim();
  }

  /**
   * Generate HTML content for ticket update email
   */
  private generateTicketUpdatedEmailHtml(data: TicketEmailData, recipient: EmailUser): string {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    const ticketUrl = `${baseUrl}/tickets/${data.ticket.id}`;
    const isAssignee = recipient.id === data.ticket.assigneeId;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ticket Updated</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ffc107; color: #212529; padding: 20px; text-align: center; border-radius: 5px; }
          .content { padding: 20px; background-color: #f9f9f9; border-radius: 5px; margin: 20px 0; }
          .ticket-details { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .changes { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          .change-item { margin: 5px 0; }
          .old-value { text-decoration: line-through; color: #dc3545; }
          .new-value { color: #28a745; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📝 Ticket Updated</h1>
        </div>
        
        <div class="content">
          <h2>Hello ${recipient.name},</h2>
          
          <p>A ticket ${isAssignee ? 'assigned to you' : 'you\'re involved with'} has been updated.</p>
          
          <div class="ticket-details">
            <h3>${data.ticket.title}</h3>
            <p><strong>ID:</strong> ${data.ticket.id}</p>
            <p><strong>Status:</strong> ${data.ticket.status}</p>
            <p><strong>Priority:</strong> ${data.ticket.priority}</p>
            <p><strong>Last Updated:</strong> ${new Date(data.ticket.updatedAt).toLocaleString()}</p>
          </div>
          
          ${data.changes && data.changes.length > 0 ? `
          <div class="changes">
            <h4>Changes Made:</h4>
            ${data.changes.map(change => `
              <div class="change-item">
                <strong>${change.field}:</strong> 
                <span class="old-value">${change.oldValue || 'None'}</span> → 
                <span class="new-value">${change.newValue || 'None'}</span>
              </div>
            `).join('')}
          </div>
          ` : ''}
          
          <p>Click the button below to view the updated ticket:</p>
          
          <a href="${ticketUrl}" class="button">View Ticket</a>
          
          <p>Best regards,<br>The Ticketing System Team</p>
        </div>
        
        <div class="footer">
          <p>This is an automated notification. You're receiving this because you're ${isAssignee ? 'assigned to' : 'involved with'} this ticket.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for ticket update email
   */
  private generateTicketUpdatedEmailText(data: TicketEmailData, recipient: EmailUser): string {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    const ticketUrl = `${baseUrl}/tickets/${data.ticket.id}`;
    const isAssignee = recipient.id === data.ticket.assigneeId;

    return `
📝 Ticket Updated

Hello ${recipient.name},

A ticket ${isAssignee ? 'assigned to you' : 'you\'re involved with'} has been updated.

Ticket: ${data.ticket.title}
ID: ${data.ticket.id}
Status: ${data.ticket.status}
Priority: ${data.ticket.priority}
Last Updated: ${new Date(data.ticket.updatedAt).toLocaleString()}

${data.changes && data.changes.length > 0 ? `
Changes Made:
${data.changes.map(change => `- ${change.field}: ${change.oldValue || 'None'} → ${change.newValue || 'None'}`).join('\n')}
` : ''}

View ticket at: ${ticketUrl}

Best regards,
The Ticketing System Team

---
This is an automated notification. You're receiving this because you're ${isAssignee ? 'assigned to' : 'involved with'} this ticket.
    `.trim();
  }

  /**
   * Test the email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email service connection verified successfully');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export types for use in other modules
export type { EmailUser, WelcomeEmailData, TicketData, TicketEmailData };
import nodemailer from 'nodemailer';
import { encodeCredentials } from '../utils/credentials';

interface EmailUser {
  id: string;
  email: string;
  name: string;
  userType: string;
  tenantId: string;
}

interface WelcomeEmailData extends EmailUser {
  password?: string;
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
      const encodedCreds = encodeCredentials(userData.email, userData.password, userData.tenantId);
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
      const encodedCreds = encodeCredentials(userData.email, userData.password, userData.tenantId);
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
export type { EmailUser, WelcomeEmailData };
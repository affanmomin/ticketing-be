"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const fs_1 = require("fs");
const path_1 = require("path");
const credentials_1 = require("../utils/credentials");
class EmailService {
    /**
     * Get logo URL for emails
     * Uses LOGO_URL env var if set, otherwise uses CID attachment (cid:logo)
     */
    getLogoUrl() {
        // If LOGO_URL is set in env, use it (preferred for production)
        if (process.env.LOGO_URL) {
            return process.env.LOGO_URL;
        }
        // Otherwise, use CID attachment (most reliable for email clients)
        return 'cid:logo';
    }
    /**
     * Get logo attachment for CID embedding
     * Returns undefined if LOGO_URL is set (no attachment needed)
     */
    getLogoAttachment() {
        // If LOGO_URL is set, no attachment needed
        if (process.env.LOGO_URL) {
            return undefined;
        }
        // Load logo buffer if not already loaded
        if (!this.logoBuffer) {
            try {
                // Try multiple possible paths (for both dev and production)
                const possiblePaths = [
                    (0, path_1.join)(__dirname, '../../saait-logo.png'), // From dist/services/
                    (0, path_1.join)(__dirname, '../saait-logo.png'), // From src/services/ (dev)
                    (0, path_1.join)(process.cwd(), 'saait-logo.png'), // From project root
                    // Fallback to JPG if PNG doesn't exist
                    (0, path_1.join)(__dirname, '../../saait-logo.jpg'),
                    (0, path_1.join)(__dirname, '../saait-logo.jpg'),
                    (0, path_1.join)(process.cwd(), 'saait-logo.jpg'),
                ];
                for (const logoPath of possiblePaths) {
                    try {
                        this.logoBuffer = (0, fs_1.readFileSync)(logoPath);
                        break;
                    }
                    catch (_a) {
                        // Try next path
                        continue;
                    }
                }
                if (!this.logoBuffer) {
                    console.warn('Logo file not found, emails will be sent without logo');
                    return undefined;
                }
            }
            catch (error) {
                console.warn('Logo file not found, using placeholder:', error instanceof Error ? error.message : String(error));
                return undefined;
            }
        }
        // Return CID attachment
        return [{
                filename: 'saait-logo.png',
                cid: 'logo',
                content: this.logoBuffer,
            }];
    }
    constructor() {
        this.logoBuffer = null;
        // Debug: Log SMTP configuration (without password)
        console.log('SMTP Configuration:');
        console.log('- Host:', process.env.SMTP_HOST || 'localhost (default)');
        console.log('- Port:', process.env.SMTP_PORT || '587 (default)');
        console.log('- User:', process.env.SMTP_USER || 'not set');
        console.log('- Pass:', process.env.SMTP_PASS ? '***set***' : 'not set');
        console.log('- From:', process.env.SMTP_FROM || 'not set');
        this.transporter = nodemailer_1.default.createTransport({
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
    sendWelcomeEmail(userData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const isClient = userData.userType === 'CLIENT';
                const subject = isClient
                    ? 'Welcome to Sahra-Al-Aman Information Technology (SAAIT) - Client Account Created'
                    : 'Welcome to Sahra-Al-Aman Information Technology (SAAIT) - Your Account Has Been Created';
                const htmlContent = this.generateWelcomeEmailHtml(userData, isClient);
                const textContent = this.generateWelcomeEmailText(userData, isClient);
                yield this.transporter.sendMail({
                    from: process.env.SMTP_FROM || '"Sahra-Al-Aman Information Technology (SAAIT)" <noreply@example.com>',
                    to: userData.email,
                    subject: subject,
                    text: textContent,
                    html: htmlContent,
                    attachments: this.getLogoAttachment(),
                });
                console.log(`Welcome email sent successfully to ${userData.email}`);
            }
            catch (error) {
                console.error(`Failed to send welcome email to ${userData.email}:`, error);
                // Don't throw error to avoid failing user creation if email fails
            }
        });
    }
    /**
     * Send notification email to newly created client (no login credentials)
     */
    sendClientNotificationEmail(clientName, clientEmail) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
                const loginUrl = `${baseUrl}/login`;
                const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Client Account Created - Sahra-Al-Aman Information Technology (SAAIT)</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #4c63d2 0%, #5a3d7a 100%); padding: 40px 20px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 640px; margin: 0 auto;">

            <!-- Spacer -->
            <tr>
              <td style="height: 20px;"></td>
            </tr>

            <!-- Main Card -->
            <tr>
              <td style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.15);">

                <!-- Header with Gradient -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 48px 40px; text-align: center;">
                      <img src="${this.getLogoUrl()}" alt="SAAIT Logo" style="width: 120px; height: auto; margin: 0 auto 20px; display: block; max-width: 120px;" />
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Account Created</h1>
                      <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 400;">Welcome to Sahra-Al-Aman Information Technology (SAAIT)</p>
                    </td>
                  </tr>
                </table>

                <!-- Content -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="padding: 48px 40px;">

                      <p style="margin: 0 0 24px 0; color: #2d3748; font-size: 16px; line-height: 1.7; font-weight: 400;">
                        Hello <strong style="color: #1a202c; font-weight: 600;">${clientName}</strong>,
                      </p>

                      <p style="margin: 0 0 32px 0; color: #4a5568; font-size: 15px; line-height: 1.7;">
                        Your client account has been successfully created in Sahra-Al-Aman Information Technology (SAAIT) ticketing system. You can now access the system to manage your tickets and collaborate with our team.
                      </p>

                      <!-- Info Card -->
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 32px 0; background-color: #f7fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <tr>
                          <td style="padding: 20px;">
                            <p style="margin: 0 0 12px 0; color: #718096; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                              What's Next?
                            </p>
                            <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6;">
                              Your account administrator will create user accounts for your team members. Once created, you'll receive login credentials via email.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <!-- Divider -->
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 32px 0;">
                        <tr>
                          <td style="height: 1px; background-color: #e2e8f0;"></td>
                        </tr>
                      </table>

                      <!-- Support -->
                      <p style="margin: 0 0 8px 0; color: #4a5568; font-size: 15px; line-height: 1.6;">
                        If you have any questions or need assistance, please don't hesitate to contact our support team.
                      </p>

                      <p style="margin: 24px 0 0 0; color: #2d3748; font-size: 15px; line-height: 1.6;">
                        Best regards,<br>
                        <span style="font-weight: 600; color: #1a202c;">Sahra-Al-Aman Information Technology (SAAIT) Team</span>
                      </p>

                    </td>
                  </tr>
                </table>

                <!-- Footer -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f7fafc; border-top: 1px solid #e2e8f0;">
                  <tr>
                    <td style="padding: 32px 40px; text-align: center;">
                      <img src="${this.getLogoUrl()}" alt="SAAIT Logo" style="width: 80px; height: auto; margin: 0 auto 16px; display: block; max-width: 80px; opacity: 0.7;" />
                      <p style="margin: 0 0 8px 0; color: #718096; font-size: 12px; line-height: 1.5;">
                        This is an automated message. Please do not reply to this email.
                      </p>
                      <p style="margin: 0; color: #a0aec0; font-size: 11px; line-height: 1.5;">
                        © ${new Date().getFullYear()} Sahra-Al-Aman Information Technology (SAAIT). All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <!-- Spacer -->
            <tr>
              <td style="height: 20px;"></td>
            </tr>

          </table>
        </body>
        </html>
      `;
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
                yield this.transporter.sendMail({
                    from: process.env.SMTP_FROM || '"Sahra-Al-Aman Information Technology (SAAIT)" <noreply@example.com>',
                    to: clientEmail,
                    subject: 'Client Account Created - Sahra-Al-Aman Information Technology (SAAIT)',
                    text: textContent,
                    html: htmlContent,
                    attachments: this.getLogoAttachment(),
                });
                console.log(`Client notification email sent successfully to ${clientEmail}`);
            }
            catch (error) {
                console.error(`Failed to send client notification email to ${clientEmail}:`, error);
                // Don't throw error to avoid failing client creation if email fails
            }
        });
    }
    /**
     * Generate HTML content for welcome email
     */
    generateWelcomeEmailHtml(userData, isClient = false) {
        const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
        // Create login URL with encoded credentials if password is provided
        let loginUrl = `${baseUrl}/login`;
        if (userData.password) {
            const encodedCreds = (0, credentials_1.encodeCredentials)(userData.email, userData.password);
            loginUrl = `${baseUrl}/login?creds=${encodeURIComponent(encodedCreds)}`;
        }
        const roleColors = {
            ADMIN: { bg: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', icon: '👑' },
            EMPLOYEE: { bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)', icon: '👨‍💼' },
            CLIENT: { bg: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', icon: '🏢' },
        };
        const roleInfo = roleColors[userData.userType] || {
            bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            icon: '👤',
        };
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Sahra-Al-Aman Information Technology (SAAIT)</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #4c63d2 0%, #5a3d7a 100%); padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 640px; margin: 0 auto;">

          <!-- Spacer -->
          <tr>
            <td style="height: 20px;"></td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.15);">

              <!-- Header with Gradient -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="background: ${roleInfo.bg}; padding: 48px 40px; text-align: center;">
                    <img src="${this.getLogoUrl()}" alt="SAAIT Logo" style="width: 120px; height: auto; margin: 0 auto 20px; display: block; max-width: 120px;" />
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Welcome Aboard!</h1>
                    <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 400;">Your account has been created</p>
                  </td>
                </tr>
              </table>

              <!-- Content -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 48px 40px;">

                    <p style="margin: 0 0 24px 0; color: #2d3748; font-size: 16px; line-height: 1.7; font-weight: 400;">
                      Hello <strong style="color: #1a202c; font-weight: 600;">${userData.name}</strong>,
                    </p>

                    <p style="margin: 0 0 32px 0; color: #4a5568; font-size: 15px; line-height: 1.7;">
                      Your <strong style="color: #2d3748;">${userData.userType}</strong> account has been successfully created${isClient ? ' for your organization' : ''}. You're all set to start managing tickets efficiently!
                    </p>

                    <!-- Account Details Card -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 32px 0; background-color: #f7fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                      <tr>
                        <td style="padding: 24px;">
                          <p style="margin: 0 0 16px 0; color: #718096; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                            Account Details
                          </p>
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="padding: 8px 0; color: #4a5568; font-size: 14px; font-weight: 500;">Email:</td>
                              <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600; text-align: right;">${userData.email}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #4a5568; font-size: 14px; font-weight: 500;">Role:</td>
                              <td style="padding: 8px 0; text-align: right;">
                                <span style="display: inline-block; padding: 4px 12px; background: ${roleInfo.bg}; color: #ffffff; border-radius: 12px; font-size: 12px; font-weight: 600;">${userData.userType}</span>
                              </td>
                            </tr>
                            ${userData.password ? `
                            <tr>
                              <td style="padding: 8px 0; color: #4a5568; font-size: 14px; font-weight: 500;">Password:</td>
                              <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600; text-align: right; font-family: 'Courier New', monospace;">${userData.password}</td>
                            </tr>
                            ` : ''}
                          </table>
                        </td>
                      </tr>
                    </table>

                    ${userData.password ? `
                    <!-- Auto-Login Notice -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 32px 0; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 8px; border-left: 4px solid #10b981;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6; font-weight: 500;">
                            <strong style="font-weight: 600;">✨ Quick Login:</strong> Click the button below and your credentials will be automatically filled in. No typing required!
                          </p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    <!-- CTA Button -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 32px 0;">
                      <tr>
                        <td align="center">
                          <a href="${loginUrl}" style="display: inline-block; background: ${roleInfo.bg}; color: #ffffff; text-decoration: none; padding: 16px 48px; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                            ${userData.password ? '🚀 Login with Auto-Fill' : '🔑 Access System'}
                          </a>
                        </td>
                      </tr>
                    </table>

                    ${userData.password ? `
                    <!-- Security Note -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 32px 0; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; border-left: 4px solid #f59e0b;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6; font-weight: 500;">
                            <strong style="font-weight: 600;">🔒 Security Recommendation:</strong> Please change your password after your first login for enhanced security.
                          </p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    <!-- Divider -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 32px 0;">
                      <tr>
                        <td style="height: 1px; background-color: #e2e8f0;"></td>
                      </tr>
                    </table>

                    <!-- Support -->
                    <p style="margin: 0 0 8px 0; color: #4a5568; font-size: 15px; line-height: 1.6;">
                      Need help? Our support team is here for you.
                    </p>

                    <p style="margin: 24px 0 0 0; color: #2d3748; font-size: 15px; line-height: 1.6;">
                      Best regards,<br>
                      <span style="font-weight: 600; color: #1a202c;">Sahra-Al-Aman Information Technology (SAAIT) Team</span>
                    </p>

                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f7fafc; border-top: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 32px 40px; text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #718096; font-size: 12px; line-height: 1.5;">
                      This is an automated message. Please do not reply to this email.
                    </p>
                    <p style="margin: 0; color: #a0aec0; font-size: 11px; line-height: 1.5;">
                      © ${new Date().getFullYear()} Sahra-Al-Aman Information Technology (SAAIT). All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Spacer -->
          <tr>
            <td style="height: 20px;"></td>
          </tr>

        </table>
      </body>
      </html>
    `;
    }
    /**
     * Generate plain text content for welcome email
     */
    generateWelcomeEmailText(userData, isClient = false) {
        const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
        // Create login URL with encoded credentials if password is provided
        let loginUrl = `${baseUrl}/login`;
        if (userData.password) {
            const encodedCreds = (0, credentials_1.encodeCredentials)(userData.email, userData.password);
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
            ''}

${userData.password ?
            'Security Note: Please change your password after your first login for enhanced security.\n' :
            ''}

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
    sendPasswordResetEmail(email, fullName, resetToken) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
                const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
                const subject = 'Password Reset Request - Sahra-Al-Aman Information Technology (SAAIT)';
                const htmlContent = this.generatePasswordResetEmailHtml(fullName, resetUrl);
                const textContent = this.generatePasswordResetEmailText(fullName, resetUrl);
                // For testing: send to test email if specified, otherwise use actual email
                const recipientEmail = process.env.TEST_EMAIL || email;
                const actualEmail = recipientEmail !== email ? email : null;
                yield this.transporter.sendMail({
                    from: process.env.SMTP_FROM || '"Sahra-Al-Aman Information Technology (SAAIT)" <noreply@example.com>',
                    to: recipientEmail,
                    subject: subject,
                    text: textContent,
                    html: htmlContent,
                    attachments: this.getLogoAttachment(),
                });
                if (actualEmail) {
                    console.log(`Password reset email sent to ${recipientEmail} (test mode - actual email: ${actualEmail})`);
                }
                else {
                    console.log(`Password reset email sent successfully to ${email}`);
                }
            }
            catch (error) {
                console.error(`Failed to send password reset email to ${email}:`, error);
                throw error;
            }
        });
    }
    generatePasswordResetEmailHtml(fullName, resetUrl) {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Sahra-Al-Aman Information Technology (SAAIT)</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #4c63d2 0%, #5a3d7a 100%); padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 640px; margin: 0 auto;">

          <!-- Spacer -->
          <tr>
            <td style="height: 20px;"></td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.15);">

              <!-- Header with Gradient -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 48px 40px; text-align: center;">
                    <img src="${this.getLogoUrl()}" alt="SAAIT Logo" style="width: 120px; height: auto; margin: 0 auto 20px; display: block; max-width: 120px;" />
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Password Reset</h1>
                    <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 400;">Secure your account</p>
                  </td>
                </tr>
              </table>

              <!-- Content -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 48px 40px;">

                    <p style="margin: 0 0 24px 0; color: #2d3748; font-size: 16px; line-height: 1.7; font-weight: 400;">
                      Hello <strong style="color: #1a202c; font-weight: 600;">${fullName}</strong>,
                    </p>

                    <p style="margin: 0 0 32px 0; color: #4a5568; font-size: 15px; line-height: 1.7;">
                      We received a request to reset your password. Click the button below to create a new secure password. This link will expire in <strong style="color: #2d3748;">1 hour</strong> for your security.
                    </p>

                    <!-- CTA Button -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 40px 0;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); transition: all 0.3s ease;">
                            Reset My Password
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Alternative Link Card -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 32px 0; background-color: #f7fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0 0 12px 0; color: #718096; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                            Or copy this link
                          </p>
                          <p style="margin: 0; padding: 12px; background-color: #ffffff; border-radius: 6px; border: 1px solid #e2e8f0;">
                            <a href="${resetUrl}" style="color: #667eea; text-decoration: none; font-size: 13px; font-family: 'Courier New', monospace; word-break: break-all; line-height: 1.6;">
                              ${resetUrl}
                            </a>
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Security Notice -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 32px 0; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; border-left: 4px solid #f59e0b;">
                      <tr>
                        <td style="padding: 20px;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="width: 32px; vertical-align: top; padding-right: 12px; font-size: 20px;">
                                ⚠️
                              </td>
                              <td>
                                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6; font-weight: 500;">
                                  <strong style="font-weight: 600;">Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged and no action is required.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Expiration Info -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 32px 0;">
                      <tr>
                        <td style="padding: 16px; background-color: #edf2f7; border-radius: 8px; text-align: center;">
                          <p style="margin: 0; color: #4a5568; font-size: 13px; line-height: 1.5;">
                            <strong style="color: #2d3748;">⏱️ Link expires in 1 hour</strong>
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 32px 0;">
                      <tr>
                        <td style="height: 1px; background-color: #e2e8f0;"></td>
                      </tr>
                    </table>

                    <!-- Support -->
                    <p style="margin: 0 0 8px 0; color: #4a5568; font-size: 15px; line-height: 1.6;">
                      Need help? Our support team is here for you.
                    </p>

                    <p style="margin: 24px 0 0 0; color: #2d3748; font-size: 15px; line-height: 1.6;">
                      Best regards,<br>
                      <span style="font-weight: 600; color: #1a202c;">Sahra-Al-Aman Information Technology (SAAIT) Team</span>
                    </p>

                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f7fafc; border-top: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 32px 40px; text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #718096; font-size: 12px; line-height: 1.5;">
                      This is an automated message. Please do not reply to this email.
                    </p>
                    <p style="margin: 0; color: #a0aec0; font-size: 11px; line-height: 1.5;">
                      © ${new Date().getFullYear()} Sahra-Al-Aman Information Technology (SAAIT). All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Spacer -->
          <tr>
            <td style="height: 20px;"></td>
          </tr>

        </table>
      </body>
      </html>
    `;
    }
    generatePasswordResetEmailText(fullName, resetUrl) {
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
    sendTicketCreatedEmail(assignedToEmail, assignedToName, ticketTitle, _ticketDescription, // Not used in email, kept for API compatibility
    raisedByName, projectName, _ticketId // Not used in email, kept for API compatibility
    ) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const subject = `New Ticket Assigned: ${ticketTitle}`;
                const htmlContent = this.generateTicketCreatedEmailHtml(assignedToName, ticketTitle, raisedByName, projectName);
                const textContent = this.generateTicketCreatedEmailText(assignedToName, ticketTitle, raisedByName, projectName);
                yield this.transporter.sendMail({
                    from: process.env.SMTP_FROM || '"Sahra-Al-Aman Information Technology (SAAIT)" <noreply@example.com>',
                    to: assignedToEmail,
                    subject: subject,
                    text: textContent,
                    html: htmlContent,
                    attachments: this.getLogoAttachment(),
                });
                console.log(`Ticket creation email sent successfully to ${assignedToEmail}`);
            }
            catch (error) {
                console.error(`Failed to send ticket creation email to ${assignedToEmail}:`, error);
                // Don't throw error to avoid failing ticket creation if email fails
            }
        });
    }
    generateTicketCreatedEmailHtml(assignedToName, ticketTitle, raisedByName, projectName) {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Ticket Assigned - Sahra-Al-Aman Information Technology (SAAIT)</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #4c63d2 0%, #5a3d7a 100%); padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 640px; margin: 0 auto;">

          <!-- Spacer -->
          <tr>
            <td style="height: 20px;"></td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.15);">

              <!-- Header with Gradient -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 48px 40px; text-align: center;">
                    <img src="${this.getLogoUrl()}" alt="SAAIT Logo" style="width: 120px; height: auto; margin: 0 auto 20px; display: block; max-width: 120px;" />
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">New Ticket Assigned</h1>
                    <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 400;">A new ticket has been assigned to you</p>
                  </td>
                </tr>
              </table>

              <!-- Content -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 48px 40px;">

                    <p style="margin: 0 0 24px 0; color: #2d3748; font-size: 16px; line-height: 1.7; font-weight: 400;">
                      Hello <strong style="color: #1a202c; font-weight: 600;">${assignedToName}</strong>,
                    </p>

                    <p style="margin: 0 0 32px 0; color: #4a5568; font-size: 15px; line-height: 1.7;">
                      A new ticket has been assigned to you in the <strong style="color: #2d3748;">${projectName}</strong> project.
                    </p>

                    <!-- Ticket Details Card -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 32px 0; background-color: #f7fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                      <tr>
                        <td style="padding: 24px;">
                          <p style="margin: 0 0 16px 0; color: #718096; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                            Ticket Details
                          </p>
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="padding: 8px 0; color: #4a5568; font-size: 14px; font-weight: 500;">Title:</td>
                              <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600; text-align: right;">${ticketTitle}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #4a5568; font-size: 14px; font-weight: 500;">Project:</td>
                              <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600; text-align: right;">${projectName}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #4a5568; font-size: 14px; font-weight: 500;">Raised by:</td>
                              <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600; text-align: right;">${raisedByName}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 32px 0;">
                      <tr>
                        <td style="height: 1px; background-color: #e2e8f0;"></td>
                      </tr>
                    </table>

                    <!-- Support -->
                    <p style="margin: 0 0 8px 0; color: #4a5568; font-size: 15px; line-height: 1.6;">
                      If you have any questions about this ticket, please don't hesitate to reach out.
                    </p>

                    <p style="margin: 24px 0 0 0; color: #2d3748; font-size: 15px; line-height: 1.6;">
                      Best regards,<br>
                      <span style="font-weight: 600; color: #1a202c;">Sahra-Al-Aman Information Technology (SAAIT) Team</span>
                    </p>

                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f7fafc; border-top: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 32px 40px; text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #718096; font-size: 12px; line-height: 1.5;">
                      This is an automated message. Please do not reply to this email.
                    </p>
                    <p style="margin: 0; color: #a0aec0; font-size: 11px; line-height: 1.5;">
                      © ${new Date().getFullYear()} Sahra-Al-Aman Information Technology (SAAIT). All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Spacer -->
          <tr>
            <td style="height: 20px;"></td>
          </tr>

        </table>
      </body>
      </html>
    `;
    }
    generateTicketCreatedEmailText(assignedToName, ticketTitle, raisedByName, projectName) {
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
    testConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.transporter.verify();
                console.log('Email service connection verified successfully');
                return true;
            }
            catch (error) {
                console.error('Email service connection failed:', error);
                return false;
            }
        });
    }
}
// Export singleton instance
exports.emailService = new EmailService();

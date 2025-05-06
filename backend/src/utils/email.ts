/**
 * Email templates for authentication flows
 */

/**
 * Generate a password reset email template
 * @param userName The user's name
 * @param resetToken The reset token or code
 * @param resetUrl The full URL for password reset
 * @returns HTML email content
 */
export const getPasswordResetEmailTemplate = (
  userName: string,
  resetToken: string,
  resetUrl: string
): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f9f9f9;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #fff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          background-color: #1976d2;
          padding: 20px 30px;
          color: white;
          font-size: 24px;
          font-weight: bold;
        }
        .content {
          padding: 30px;
        }
        .footer {
          background-color: #f5f5f5;
          padding: 15px 30px;
          font-size: 14px;
          color: #666;
          text-align: center;
        }
        .button {
          display: inline-block;
          background-color: #1976d2;
          color: white;
          text-decoration: none;
          padding: 12px 30px;
          border-radius: 4px;
          font-weight: bold;
          margin: 20px 0;
        }
        .token {
          background-color: #f5f5f5;
          padding: 10px 15px;
          border-radius: 4px;
          font-family: monospace;
          margin: 15px 0;
          font-size: 18px;
          letter-spacing: 1px;
          text-align: center;
        }
        .warning {
          font-size: 14px;
          color: #e53935;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          Password Reset Request
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>We received a request to reset your password. Use the link below to set a new password for your account.</p>
          <p>If you did not request a password reset, you can ignore this email or contact support if you have concerns.</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" style="display: inline-block; background-color:rgb(241, 81, 53); color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Reset Your Password</a>
          </div>
          
          <p>Alternatively, you can copy and paste the following URL into your browser:</p>
          <p style="word-break: break-all;"><a href="${resetUrl}">${resetUrl}</a></p>
          
          <p>Your reset token is:</p>
          <div class="token">${resetToken}</div>
          
          <p class="warning">This password reset link is only valid for 1 hour.</p>
          <p>Thanks,<br>The ServiceFix Team</p>


        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ServiceFix Support System. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate a password changed confirmation email template
 * @param userName The user's name
 * @returns HTML email content
 */
export const getPasswordChangedEmailTemplate = (userName: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Changed</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f9f9f9;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #fff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          background-color: #43a047;
          padding: 20px 30px;
          color: white;
          font-size: 24px;
          font-weight: bold;
        }
        .content {
          padding: 30px;
        }
        .footer {
          background-color: #f5f5f5;
          padding: 15px 30px;
          font-size: 14px;
          color: #666;
          text-align: center;
        }
        .warning {
          font-size: 14px;
          color: #e53935;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          Password Changed Successfully
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>Your password has been changed successfully.</p>
          <p>If you did not make this change, please contact support immediately as your account may have been compromised.</p>
          <p class="warning">If you did not initiate this password change, please contact our support team immediately.</p>
          <p>Thanks,<br>The ServiceFix Team</p>

          
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ServiceFix Support System. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;
}; 
const formData = require("form-data");
// console.log({formData})
const Mailgun = require("mailgun.js");
const mailgun = new Mailgun(formData);

let mailgunFunctions = {
  sendSignupVerification: (toEmail, otp, userName) => {
    console.log("Email:", toEmail);
    console.log("OTP:", otp);
    console.log("Full Name:", userName);

    mg.messages
      .create("devrv4.redtie.co", {
        from: "notification@redtie.co",
        to: [toEmail],
        subject: "TestStream email verification",
        text: "🎮 TestStream Signup Verification",
        html: ` 
        <html>
        <head>
          <title>Signup OTP</title>
          <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f9f9f9;
      margin: 0;
      padding: 0;
    }
    .container {
      padding: 20px;
      margin: 20px auto;
      max-width: 600px;
      border: 1px solid #dddddd;
      border-radius: 4px;
      background-color: #ffffff;
    }
    .header {
      text-align: center;
      padding: 20px;
      background-color: #007bff;
      color: #ffffff;
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
  }
  .header h1 {
      margin: 0;
      font-size: 24px;
  }
    .content {
      margin-bottom: 20px;
      font-size: 14px;
      color: #333333;
    }
    .otp {
      font-size: 16px;
      font-weight: bold;
      color: #1a73e8;
    }
    a {
      color: #1a73e8;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
        </head>
        <body>
        <div class="container">
        <div class="header">
        <h1>Welcome to TestStream</h1>
    </div>
    <div class="container" style="border: 1px solid #dddddd;">
    <div class="content">
    Hi <strong>${userName}</strong>,
    </div>
    <div class="content">
      Welcome to TestStream!
    </div>
    <div class="content">
      We're thrilled to have you on board. To get started and ensure your account is secure, please use the One-Time Password (OTP) below to verify your email address.
    </div>
    <div class="content">
    <strong>Your OTP</strong>: <span class="otp">${otp}</span>
    </div>
    <div class="content">
      Welcome aboard, and happy exploring!
    </div>
    <div class="content">
      Best regards,<br>
      Team TestStream
    </div>
  </div>
</body>
        </html>`
      })
      .then((msg) => console.log({ msg })) // logs response data
      .catch((err) => console.error({ err }));
  },
  sendPasswordResetEmail: (toEmail, resetLink) => {
    mg.messages
      .create("devrv4.redtie.co", {
        from: "notification@redtie.co",
        to: [toEmail],
        subject: "Password Reset Request",
        text: "Password Reset Request",
        html: `
        <html>
        <head>
          <title>Password Reset</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #101223;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #f6f5f5;
              padding: 20px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            .logo {
              text-align: center;
              margin-bottom: 20px;
            }
            .content {
              text-align: center;
              color: #666666;
              padding: 10px 0;
            }
            .note {
              color: #999999;
              font-size: 12px;
              margin-top: 10px;
            }
            .cta-btn {
              display: inline-block;
              margin-top: 20px;
              background-color: #007bff;
              color: #ffffff;
              text-decoration: none;
              padding: 10px 20px;
              border-radius: 5px;
            }
            .cta-btn:hover {
              background-color: #0056b3;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <!-- <img src="your_logo_url" alt="Logo"> -->
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You have requested to reset your password. Click the link below to reset your password:</p>
              <p><a href="${resetLink}" class="cta-btn">Reset Password</a></p>
              <p class="note">Note: This link is valid for only 5 minutes.</p>
              <p>If you did not request a password reset, please ignore this email.</p>
              <p>Best regards,</p>
              <p>TestStream</p>
            </div>
          </div>
        </body>
        </html>`
      })
      .then((msg) => console.log({ msg })) // logs response data
      .catch((err) => console.error({ err }));
  }
};

module.exports = mailgunFunctions;

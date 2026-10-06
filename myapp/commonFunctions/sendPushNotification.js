const admin = require("./firbase");

async function sendPushNotification(token, title, body, data) {
  const message = {
    notification: {
      title: title,
      body: body
    },
    data: data, // optional data payload
    token: token // FCM token of the recipient device
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Notification sent successfully:", response);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

module.exports = sendPushNotification;

const express = require("express");
const router = express.Router();
const axios = require("axios");

const CLIENT_ID = "d7df7607-2232-4792-a169-e1122d6ed234";
const CLIENT_SECRET = "31134232-8edd-477b-8558-526f7615e180";
const REDIRECT_URI = "http://localhost:9003/restreamapi/auth/restream/callback";

router.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "script-src 'self' 'nonce-unique123'");
  next();
});

// Step 1: Redirect user to Restream's authorization URL
// router.get("/auth/restream", (req, res) => {
//   const authUrl = `https://api.restream.io/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
//   console.log("authUrl", authUrl);
//   res.redirect(authUrl);
// });


  router.post("/exchange_token", async (req, res) => {
    console.log("hello");
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Authorization code is missing" });
  }

  try {
    const response = await axios.post("https://api.restream.io/oauth/token", {
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error exchanging token:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to get access token" });
  }
});

router.get("/auth/restream/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("Missing authorization code");
  }
  console.log("authCode", code);
  try {
    // const response = await axios.post("https://api.restream.io/oauth/token", {
    //   client_id: CLIENT_SECRET,
    //   client_secret: CLIENT_SECRET,
    //   grant_type: "authorization_code",
    //   code: authCode,
    //   redirect_uri: REDIRECT_URI
    // });
    const querystring = require("querystring");

    const verifyURl = `https://api.restream.io/oauth/token`;
    const params = querystring.stringify({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI
    });

    const tokenResponse = await axios.post(verifyURl, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    const { access_token } = tokenResponse.data;

    console.log("access_token", access_token);

    // res.send(`
    //   <script nonce="unique123">
    //     console.log("✅ Attempting to send streamData:", "${access_token}");

    //     if (window.parent) {
    //       setTimeout(() => {
    //         console.log("📩 Sending data to parent window...","${access_token}");
    //         window.parent.postMessage("${access_token}", "http://localhost:5173");
    //         window.close();
    //       }, 2000); // 2-second delay before closing
    //     } else {
    //       console.error("❌ Failed to communicate with parent window.");
    //       document.write("Failed to communicate with parent window.");
    //     }
    //   </script>
    // `);

    // res.setHeader("Content-Security-Policy", "script-src 'self' 'nonce-unique123';");

    // res.send(`
    //   <script nonce="unique123">
    //     console.log("✅ Received access token:", "${access_token}");

    //     if (window.opener) {
    //       window.opener.postMessage(${JSON.stringify(tokenResponse.data)}, "http://localhost:5173");
    //       window.close();
    //     } else {
    //       console.error("❌ Failed to communicate with parent window.");
    //     }
    //   </script>
    // `);

    // if (window.opener) {
    //   console.log("📩 Sending stream data to parent window...");
    //   window.opener.postMessage("${JSON.stringify(tokenResponse.data)}", "*");
    //   setTimeout(() => window.close(), 1000);
    // } else if (window.parent) {
    //   console.log("📩 Sending data using window.parent...");
    //   window.parent.postMessage("${JSON.stringify(tokenResponse.data)}", "*");
    //   setTimeout(() => window.close(), 1000);
    // } else {
    //   console.error("❌ Failed to communicate with parent window.");
    //   document.write("Failed to communicate with parent window.");
    // }

    res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ token: "${access_token}" }, "http://localhost:5173/streamhost");
            window.close();
          </script>
        </body>
      </html>
    `);

    // res.send(`
    //   <script nonce="unique123">

    //     if (window.parent) {
    //       console.log("📩 Sending stream data to parent window...");
    //       window.opener?.postMessage(${JSON.stringify(access_token)}, "*");
    //        console.log("📩 yes send...");
    //       setTimeout(() => window.close(), 1000); // Give time before closing
    //     } else {
    //       console.error("❌ Failed to communicate with parent window.");
    //       document.write("Failed to communicate with parent window.");
    //     }
    //   </script>
    // `);
  } catch (error) {
    console.error("Error getting token:", error.response?.data || error.message);
    res.status(500).send("Failed to get access token");
  }
});

//Step 2: Handle the callback from Restream
// router.get("/auth/restream/callback", async (req, res) => {
//   console.log("restream api");
//   const { code } = req.query;
//   console.log("code", code);
//   if (!code) {
//     return res.status(400).send("Authorization code is missing.");
//   }
//   try {
//     const querystring = require("querystring");

//     const verifyURl = `https://api.restream.io/oauth/token`;
//     const params = querystring.stringify({
//       grant_type: "authorization_code",
//       client_id: CLIENT_ID,
//       client_secret: CLIENT_SECRET,
//       code,
//       redirect_uri: REDIRECT_URI
//     });

//     const tokenResponse = await axios.post(verifyURl, params, {
//       headers: {
//         "Content-Type": "application/x-www-form-urlencoded"
//       }
//     });

//     console.log("token Response", tokenResponse.data);
//     const { access_token, refresh_token } = tokenResponse.data;
//     console.log("access_token", `Bearer ${access_token}`);

//     const response = await axios.get("https://api.restream.io/v2/user/streamKey", {
//       headers: {
//         Authorization: `Bearer ${access_token}`
//       }
//     });
//     const { streamKey } = response.data;

//     console.log("streamKey", streamKey);

//     const server_response = await axios.get("https://api.restream.io/v2/server/all", {
//       headers: {
//         Authorization: `Bearer ${access_token}`
//       }
//     });

//     console.log("server_response", server_response);

//     const channels_response = await axios.get(
//       "https://api.restream.io/v2/user/channel/all",
//       {
//         headers: {
//           Authorization: `Bearer ${access_token}`
//         }
//       }
//     );

//     //const { rtmpUrl } = server_response;
//     console.log("channels_response", channels_response.data);

//     const youtubeChannel = channels_response.data.find(
//       (channel) => channel.url.includes("youtube.com") || channel.url.includes("youtu.be")
//     );
//     //}
//     console.log("youtubeChannel", youtubeChannel);
//     const streamData = {
//       rtmp_url: youtubeChannel.url,
//       stream_key: streamKey
//     };

//     console.log("streamDetail", JSON.stringify(streamData));

//     res.setHeader("Content-Security-Policy", "script-src 'self' 'unsafe-inline'");

//     // res.send(`
//     //   <script nonce="unique123">
//     //     console.log("🔹 Sending streamData to parent:", ${JSON.stringify(streamData)});

//     //     if (window.opener) {
//     //       setTimeout(() => {
//     //         window.opener.postMessage(${JSON.stringify(streamData)}, "*");
//     //         console.log("✅ Message sent successfully");
//     //         window.close();
//     //       }, 2000); // ✅ Delay closing to ensure message is sent
//     //     } else {
//     //       console.error("❌ Failed to communicate with parent window.");
//     //       document.write("Failed to communicate with parent window.");
//     //     }
//     //   </script>
//     // `);

//     // res.send(`
//     //   <script nonce="unique123">
//     //     console.log("Sending data to parent window...",${JSON.stringify(streamData)});
//     //     if (window.parent) {

//     //      window.parent.postMessage(${JSON.stringify(streamData)}, "http://localhost:9003");
//     //       setTimeout(() => window.close(), 6000);
//     //     } else {
//     //       document.write("Failed to communicate with parent window.");
//     //     }
//     //   </script>
//     // `);

//     res.send(`
//       <script nonce="unique123">
//         console.log("✅ Attempting to send streamData:", ${JSON.stringify(streamData)});

//         if (window.parent) {
//           setTimeout(() => {
//             console.log("📩 Sending data to parent window...",${JSON.stringify(streamData)});
//             window.parent.postMessage(${JSON.stringify(streamData)}, "http://localhost:5173");
//             window.close();
//           }, 2000); // 2-second delay before closing
//         } else {
//           console.error("❌ Failed to communicate with parent window.");
//           document.write("Failed to communicate with parent window.");
//         }
//       </script>
//     `);

//     // res.send(`
//     //   <script>
//     //     if (window.opener) {
//     //       window.opener.postMessage(${JSON.stringify(streamData)}, "*");
//     //       setTimeout(() => window.close(), 500); // Ensure the popup closes
//     //     } else {
//     //       document.write("Failed to communicate with parent window.");
//     //     }
//     //   </script>
//     // `);
//   } catch (error) {
//     console.error("Error during OAuth flow:", error.response?.data || error.message);
//     res.status(500).send("OAuth flow failed.");
//   }
// });

module.exports = router;

const axios = require("axios");
const AWS = require("aws-sdk");
const secretsManager = new AWS.SecretsManager();

const callAPI = async (params) => {
  try {
    const apiUrl = "http://matrix.visualizze.com/stagingTestStreamapi/api.php";
    const response = await axios.get(apiUrl, {
      headers: {
        "Content-Type": "application/json",
        token:
          "c0590e6d48fef10c8489983798fc73782f34c4294978309c2e7b8ffbb6cc8792401f036fcdd2b03f5d074d1d4959fe44fc40708042ee5f3604421e5b9dfff8e8"
      },
      params: params
    });

    if (response.status >= 200 && response.status < 300) {
      if (params.action == "set_user_campaign_action") {
        const userId = params.user_id;
        const url = `https://dev-TestStream.ephrontech.com/rewards/individualpoints?userId=${userId}`;

        axios
          .get(url)
          .then(() => {
            axios
              .post(`https://dev-TestStream.ephrontech.com/rewards/transactionDetails1`)
              .then(() => {
                console.log("POST Response:");
              })
              .catch((postError) => {
                console.error("POST Error:", postError);
              });
          })
          .catch((error) => {
            console.error("Error:", error);
          });
      }

      return response.data;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error calling API:", error);
    return false;
  }
};

const airdrop2_campaign = async (params) => {
  try {
    const apiUrl =
      "https://dapp-server.bnbchain.world/api/v1/airdrop2-campaign/upload-user";
    const response = await axios.post(apiUrl, params, {
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (response.status >= 200 && response.status < 300) {
      console.log("airdrop2_campaign API call successful");
      return true;
    } else {
      console.error("airdrop2_campaign API call failed");
      return false;
    }
  } catch (error) {
    console.error("Error calling API:", error);
    return false;
  }
};

const getSecretValue = async (secretName) => {
  try {
    const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();

    if ("SecretString" in data) {
      return JSON.parse(data.SecretString);
    } else {
      let buff = Buffer.from(data.SecretBinary, "base64");
      return JSON.parse(buff.toString("ascii"));
    }
  } catch (error) {
    console.error("Error retrieving secret:", error);
    throw error;
  }
};

module.exports = { callAPI, airdrop2_campaign, getSecretValue };

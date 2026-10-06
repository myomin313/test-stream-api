const express = require("express");
const router = express.Router();
const { checkRequiredFields } = require("../commonFunctions/validate");
const {
  success,
  error,
  requiredParams,
  internalError,
  notFound
} = require("../commonFunctions/responses");
const UserModel = require("../models/userModel");
const streamcommentModel = require("../models/streamcommentModel");
const streamModel = require("../models/streamModel");
const gamestreamModel = require("../models/gameStreamModel");
const gameStreamMixingModel = require("../models/gameStreamMixingModel");
const gameStreamMixingStopModel = require("../models/gameStreamMixingStopModel");
const streamImage = require("../models/streamcommentImagesModel");
const gamesModel = require("../models/gamesModel");
var https = require("https");
const { generateToken04 } = require("../config/zegoServerAssistant");


const { callAPI, getSecretValue } = require("../commonFunctions/apihelper");
const config = require("../config");
const crypto = require("crypto");
const request = require("request");

const mongoose = require("mongoose");
const Stripe = require('stripe');

const serverSecret = process.env.SERVER_SECRETE;
const secretName = config.secretNames[config.env];
router.post("/create-payment-intent", async (req, res) => {
  const secretValue = await getSecretValue(secretName);
  console.log("create-payment-intent", req.body);
  console.log({ secretValue });
  const stripe = Stripe(secretValue?.STRIPE_SECRET_KEY);
  try {
    let requiredFields = ["userId", "amount"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const { userId, amount } = req.body;
      console.log("userId", userId);
      let userInfo = await UserModel.findOne({ _id: userId }).exec();
      if (userInfo) {

        try {
          const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'usd',
            payment_method_types: ['card'],
            metadata: {
              userId: userId,  // Add the user ID here
              // customField: 'any-other-data' // You can add other metadata too
            }
          });

          res.send({ clientSecret: paymentIntent.client_secret });
        } catch (error) {
          res.status(500).send({ error: error.message });
        }

      } else {
        let result = error("user not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/webhook", async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      console.log('Payment succeeded:', event.data.object);
      break;
    case 'payment_intent.payment_failed':
      console.log('Payment failed:', event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).send('Received');
});


module.exports = router;

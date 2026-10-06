require("dotenv").config();
const express = require("express");
const path = require("path");
const router = express.Router();
const fs = require("fs");
const mongoose = require("mongoose");
const AWS = require("aws-sdk");
const kms = new AWS.KMS({ region: "us-west-1" });
const { checkRequiredFields } = require("../commonFunctions/validate");
const {
  success,
  error,
  requiredParams,
  internalError,
  notFound
} = require("../commonFunctions/responses");
const UserModel = require("../models/userModel");
const ProductModel = require("../models/productModel");
const { CartModel } = require("../models/cartModel");
const { paymentModel } = require("../models/paymentModel");
const commissionModel = require("../models/commissionModel");
const { Types } = require("mongoose");
const {
  createProduct,
  createPaymentToken,
  updateProductAvailability
} = require("../commonFunctions/xsolloPayments");
const {
  authentication,
  authentication_email_exists
} = require("../commonFunctions/functions");
const { Web3 } = require("web3");
const providerUrl = "https://data-seed-prebsc-1-s1.bnbchain.org:8545";
// const providerUrl = 'https://bsc-testnet-dataseed.bnbchain.org';
const web3 = new Web3(providerUrl);
const axios = require("axios");
var https = require("https");
const contractABI = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../lib/artifacts/contractABI.json"), "utf8")
);
const { callAPI, getSecretValue } = require("../commonFunctions/apihelper");
const config = require("../config");

const secretName = config.secretNames[config.env];

router.get("/", (req, res) => {
  console.log("received from product file");
  const valcheck = feesCalculations(55.5, 10.9, 5);
  console.log("valcheck", valcheck);
  res.sendStatus(200);
});

router.post("/create", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(
    server
  );
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("received from product/create", req.body);

  try {
    let requiredFields = ["userId", "productName"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const {
        userId,
        productName,
        productCategory = "",
        productKeywords = "",
        productImages = [],
        productThumnail = [],
        productVideos,
        price = "",
        currencyType = "",
        availableStock = "",
        minimumOrder = "",
        description = "",
        variation = "",
        modelUrl = "",
        assetImages = [],
        productType,
        itemType
        // mint_tokenIds = []
      } = req.body;

      console.log({ modelUrl });

      let productStatus = req.body.productStatus || "";
      console.log({ productStatus });

      let userInfo = await UserModel.findOne({ _id: userId }, "role").exec();

      if (userInfo) {
        let { role } = userInfo;

        if (role === "creator") {
          const productOwner = userId;

          let productInfo = {
            productName,
            productCategory,
            productKeywords,
            productImages,
            productThumnail,
            productVideos,
            price,
            currencyType,
            availableStock,
            minimumOrder,
            description,
            variation,
            productOwner,
            modelUrl,
            assetImages,
            productType,
            itemType
            // mint_tokenIds
          };

          console.log(productInfo);

          if (productStatus != "") {
            productInfo["productStatus"] = productStatus;
          }

          const newProduct = new ProductModel(productInfo);

          const savedProduct = await newProduct.save();
          let result = success("product creation success", {
            productId: savedProduct._id
          });

          if (productInfo["productStatus"] && productInfo["productStatus"] == "live") {
            console.log("product status is live");

            let xsolloParams = {
              _id: savedProduct._id,
              productName: productName,
              description: description,
              price: price,
              currency: currencyType,
              imageUrl: productImages[0]
            };

            let xsolloProductCreation = await createProduct(xsolloParams);

            console.log("product creation at xsollo", {
              xsolloProductCreation
            });
          }

          return res.json(result);
        } else {
          console.log("You are not authorized to create product");
          let result = error(
            "You are not authorized to create product",
            "not_authorized"
          );
          return res.json(result);
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

async function decryptPrivateKey(encryptedPrivateKeyBase64) {
  const params = {
    CiphertextBlob: Buffer.from(encryptedPrivateKeyBase64, "base64")
  };

  try {
    const data = await kms.decrypt(params).promise();
    const decryptedPrivateKey = data.Plaintext.toString("utf-8");
    console.log("Decrypted Private Key:", decryptedPrivateKey);
    return decryptedPrivateKey;
  } catch (error) {
    console.error("Error decrypting the private key:", error);
    throw error;
  }
}

async function feesCalculations(assetvalue, gasfees, transferfees) {
  let commission = await commissionModel
    .findOne({ status: "1" }, "commission_percentage")
    .exec();
  console.log("feesCalculations", commission.commission_percentage);
  let TestStream_commission = parseFloat(commission.commission_percentage);
  var fees = (TestStream_commission / 100) * assetvalue;
  var final_amount =
    parseFloat(fees) +
    parseFloat(assetvalue) +
    parseFloat(gasfees) +
    parseFloat(transferfees);
  console.log("final_amount", final_amount);
  return final_amount;
}

router.post("/mint", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(
    server
  );
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    console.log("/mint");

    let checkFields = ["userId", "productId", "to", "uri"];
    let isRequired = checkRequiredFields(checkFields, req.body);
    console.log("req.body", req.body);
    console.log("", { isRequired });
    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    } else {
      let userId = req.body.userId;
      let productId = req.body.productId;
      let to = req.body.to;
      let uris = req.body.uri;
      let findQuery = { _id: userId };
      const user = await UserModel.findOne(findQuery).exec();
      if (user) {
        const contractAddress = user.contractAddress;
        console.log("contractAddress", contractAddress);

        const walletaddress = user.walletAddress;
        console.log("walletaddress", walletaddress);

        const encrypt_privatekey = user.walletPrivateKey;
        console.log("encrypt_privatekey", encrypt_privatekey);

        const userId = user._id;
        console.log("userId", userId);

        const decrypt_key = await decryptPrivateKey(encrypt_privatekey);
        console.log("decrypt_key", decrypt_key);

        if (contractAddress) {
          res.json(success("Minting initiated"));
          mintNFTsInBackground(
            to,
            uris,
            walletaddress,
            contractAddress,
            decrypt_key,
            productId,
            userId
          );

          //     const mintResults = await mintNFT(to, uris, walletaddress, contractAddress, decrypt_key);
          //     console.log("mintResults", mintResults);
          //     if (mintResults) {
          //         let result = success('NFTs minted successfully', { tokenIds: mintResults });
          //         return res.json(result);
          //     } else {
          //         return res.json(internalError());
          //     }
          // } else {
          //     return res.json(internalError('Contract address not found'));
          // }
        } else {
          return res.json(internalError("User not found"));
        }
      }
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

async function mintNFTsInBackground(
  to,
  uris,
  account,
  contractAddress,
  decrypt_key,
  productId,
  userId
) {
  try {
    const results = await mintNFT(to, uris, account, contractAddress, decrypt_key);
    const count = results.length;

    for (let i = 0; i < count; i++) {
      const params = {
        action: "set_user_campaign_action",
        user_id: userId,
        campaign_action_id: "T_MINT_CP",
        campaign_id: "BINANCE_L3_2024"
      };
      const apiCallSuccess = await callAPI(params);
      console.log(`API call ${i + 1}/${count} success: ${apiCallSuccess}`);
    }

    // Filter out null results (failed mintings)
    const successfulResults = results.filter((result) => result !== null);

    if (successfulResults.length > 0) {
      // Extract tokenIds and transactionHashes from successful results
      const tokenIds = successfulResults.map((result) => result.tokenId);
      const transactionHashes = successfulResults.map((result) => result.transactionHash);

      // Update the product with the minting results
      const updatedProduct = await ProductModel.findOneAndUpdate(
        { _id: productId, productOwner: userId }, // Ensure you're updating the correct product
        {
          $push: {
            mint_tokenIds: {
              $each: tokenIds.map((tokenId) => ({
                tokenId,
                transactionHash: transactionHashes[tokenIds.indexOf(tokenId)]
              }))
            }
          }
        },
        { new: true }
      );
      const secretValue = await getSecretValue(secretName);
      let mintdata = await updatedProduct.toObject();
      let postData = JSON.stringify(mintdata);

      const options = {
        hostname: secretValue.SOCKET_DOMAIN,
        port: secretValue.SOCKET_PORT,
        path: "/mintingresponse",
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      };

      const reqs = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        // Process the response data when it ends
        res.on("end", () => {
          console.log(data);
        });
      });

      // Handle errors
      reqs.on("error", (error) => {
        console.error("Error making HTTPS request:", error);
      });

      // Write the request body
      reqs.write(postData);

      // End the request
      reqs.end();

      // console.log('Product updated with minting results:', updatedProduct);
    } else {
      console.log("No successful minting results");
    }
  } catch (error) {
    console.error("Error minting NFTs in the background:", error);
  }
}

async function mintNFT(to, uris, account, contractAddress, decrypt_key) {
  try {
    const contractInstance = new web3.eth.Contract(contractABI, contractAddress);
    const gasPrice = await web3.eth.getGasPrice();
    let results = [];

    for (const uri of uris) {
      let retry = true;
      while (retry) {
        try {
          const nonce = await web3.eth.getTransactionCount(account);
          console.log("mintNFT_nonce", nonce.toString());
          const data = contractInstance.methods.safeMint(to, uri).encodeABI();

          const txObject = {
            nonce: nonce,
            from: account,
            to: contractAddress,
            gasPrice: gasPrice,
            data: data
          };
          console.log("txObject", {
            ...txObject,
            nonce: txObject.nonce.toString(),
            gasPrice: txObject.gasPrice.toString()
          });

          const signedTx = await web3.eth.accounts.signTransaction(txObject, decrypt_key);
          const result = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
          const enhancedResult = {
            ...result,
            nonce: nonce.toString(),
            gasPrice: gasPrice.toString(),
            cumulativeGasUsed: result.cumulativeGasUsed.toString(),
            blockNumber: result.blockNumber.toString(),
            transactionIndex: result.transactionIndex.toString(),
            gasUsed: result.gasUsed.toString(),
            effectiveGasPrice: result.effectiveGasPrice.toString()
          };

          console.log("mintNFT_result", enhancedResult);

          let tokenId = null;
          for (const log of result.logs) {
            try {
              const decodedLog = web3.eth.abi.decodeLog(
                [
                  { type: "address", name: "from", indexed: true },
                  { type: "address", name: "to", indexed: true },
                  { type: "uint256", name: "tokenId", indexed: true }
                ],
                log.data,
                log.topics.slice(1)
              );

              if (decodedLog && decodedLog.to === to) {
                tokenId = decodedLog.tokenId;
                break;
              }
            } catch (decodeError) {
              console.error("Error decoding log:", decodeError);
            }
          }

          if (tokenId !== null && tokenId !== undefined) {
            results.push({
              tokenId: tokenId.toString(),
              transactionHash: result.transactionHash
            });
          } else {
            console.error("Transfer event not found in the transaction receipt");
            results.push(null);
          }

          retry = false; // Exit retry loop if successful
        } catch (error) {
          if (error.message.includes("nonce too low")) {
            console.log("Nonce too low, retrying...");
            // Wait for a short period before retrying
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            console.error("Error minting NFT:", error);
            return null;
          }
        }
      }
    }
    return results;
  } catch (error) {
    console.error("Error minting NFT:", error);
    return null;
  }
}

router.get("/Mint_transaction", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(
    server
  );
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    console.log("/Mint_transaction");

    let checkFields = ["productId"];

    let isRequired = checkRequiredFields(checkFields, req.query);
    console.log({ isRequired });

    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    } else {
      const { productId } = req.query;

      console.log("productId", productId);

      if (!productId) {
        return res.status(400).json({ error: "Product ID is required" });
      }

      // Check if the productId is a valid ObjectId
      const validObjectId = mongoose.Types.ObjectId.isValid(productId);
      console.log("validObjectId", validObjectId);

      if (!validObjectId) {
        return res.status(400).json({ error: "Invalid product ID" });
      }

      // Create an ObjectId instance correctly
      const productObjectId = new Types.ObjectId(productId);
      console.log("productObjectId", productObjectId);

      const product = await ProductModel.findById(productObjectId);
      console.log("product", product);
      if (!product) {
        let errorresult = error("Product not found");
        return res.json(errorresult);
      }

      const transactionHashes = product.mint_tokenIds.map(
        (token) => `https://testnet.bscscan.com/tx/${token.transactionHash}`
      );
      let result = success("Mint Transaction Hash", { transactionHashes });
      console.log("transactionHashes", { hash: transactionHashes });

      return res.json(result);
    }
  } catch (err) {
    console.error("Error fetching transaction hashes:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/walletTransfer", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(
    server
  );
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  const secretValue = await getSecretValue(secretName);
  try {
    console.log("/walletTransfer");
    let checkFields = ["userId", "amount"];
    let isRequired = checkRequiredFields(checkFields, req.body);
    console.log("", { isRequired });
    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    } else {
      let userId = req.body.userId;
      let recipientAddress = secretValue.MASTER_WALLET;
      let amount = req.body.amount;

      let findQuery = { _id: userId };
      const user = await UserModel.findOne(findQuery).exec();
      if (user) {
        const contractAddress = user.contractAddress;
        console.log("contractAddress", contractAddress);

        const walletAddress = user.walletAddress;
        console.log("walletAddress", walletAddress);

        const encryptedPrivateKey = user.walletPrivateKey;
        console.log("encryptedPrivateKey", encryptedPrivateKey);

        const privateKey = await decryptPrivateKey(encryptedPrivateKey);
        console.log("privateKey", privateKey);

        // Create transaction object
        const tx = {
          from: walletAddress,
          to: recipientAddress,
          value: web3.utils.toWei(amount, "ether"),
          gas: 21000,
          gasPrice: await web3.eth.getGasPrice()
        };

        // Sign the transaction
        const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);

        // Send the transaction
        web3.eth
          .sendSignedTransaction(signedTx.rawTransaction)
          .on("receipt", (receipt) => {
            console.log("Transaction receipt", receipt);
            // Convert BigInt to string for JSON serialization
            const serializedReceipt = JSON.parse(
              JSON.stringify(receipt, (key, value) =>
                typeof value === "bigint" ? value.toString() : value
              )
            );
            return res.json({ success: true, receipt: serializedReceipt });
          })
          .on("error", (error) => {
            console.error("Transaction error", error);
            return res.status(500).json({ success: false, error: error.message });
          });
      } else {
        return res.status(404).json({ success: false, message: "User not found" });
      }
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// router.post('/transfer', async (req, res) => {
//   var server = { request: req, res: res };
//   let authenticate = await authentication(
//     server
//   );
//   if (authenticate.status_code == 0) {
//     let result = error(authenticate.message, error);
//     return res.json(result);
//   }
//   try {
//     console.log('/transfer');

//     let checkFields = [
//       'userId',
//       'to',
//       'tokenId'
//     ];
//     let isRequired = checkRequiredFields(checkFields, req.body);
//     console.log("", { isRequired });
//     if (isRequired) {
//       console.log('send required fields response');
//       let response = requiredParams(isRequired);
//       console.log(response);
//       return res.json(response);
//     } else {
//       let userId = req.body.userId;
//       let to = req.body.to;
//       let tokenId = req.body.tokenId;
//       let productId = req.body.productId;
//       let findQuery = { _id: userId };

//       const user = await UserModel.findOne(findQuery).exec();
//       if (user) {
//         const contractAddress = user.contractAddress;
//         console.log('contractAddress', contractAddress);

//         const walletAddress = user.walletAddress;
//         console.log("walletAddress", walletAddress);

//         const encryptedPrivateKey = user.walletPrivateKey;
//         console.log("encryptedPrivateKey", encryptedPrivateKey);

//         const decryptKey = await decryptPrivateKey(encryptedPrivateKey);
//         console.log('decryptKey', decryptKey);

//         if (contractAddress) {
//           const transferResult = await transferNFT(walletAddress, to, tokenId, contractAddress, decryptKey);
//           console.log("transferResult", transferResult);

//           // const updatepurchasedetails = await hyperIddetails.findOneAndUpdate({ userId: userId }, { $push: { purchaseDetails: { count: Object.keys(transferResult).length, transactionhash: transferResult.transactionHash, tokenId: tokenId } } }, { new: true });

//           if (transferResult) {
//             await ProductModel.updateOne(
//               { _id: productId, 'mint_tokenIds.tokenId': tokenId },
//               {
//                 $set: {
//                   'mint_tokenIds.$.sold': true,
//                   'mint_tokenIds.$.transactionHash': transferResult.transactionHash
//                 }
//               }
//             ).exec();

//             const productcount = await ProductModel.findOne({ _id: productId }).exec();
//             const soldCount = productcount.mint_tokenIds.filter(token => token.sold).length;
//             console.log('soldCount', soldCount);
//             // Update the soldStock field
//             await ProductModel.updateOne(
//               { _id: productId },
//               {
//                 $set: {
//                   soldStock: soldCount
//                 }
//               }
//             ).exec();

//             await ProductModel.updateOne(
//               { _id: productId },
//               {
//                 $push: {
//                   transfer_hash: {
//                     tokenId: tokenId,
//                     transactionHash: transferResult.transactionHash
//                   }
//                 }
//               }
//             ).exec();

//             let result = success('NFT transferred successfully', { transactionHash: transferResult.transactionHash, tokenId: tokenId });

//             // const updatepurchasedetails = await hyperIddetails.findOneAndUpdate({ userId:userId }, { $push: { purchaseDetails: { count: Object.keys(transferResult).length, transactionhash: transferResult.transactionHash, tokenId: tokenId } } }, { new: true });

//             // console.log("**********",userId,Object.keys(transferResult).length,transferResult.transactionHash,tokenId);

//             const sellerwalletaddress = user.walletAddress;

//             const product = await ProductModel.findOne({ _id: productId });
//             console.log("product", product);
//             const price = product.price;

//             const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd');
//             const bnbPrice = response.data.binancecoin.usd;

//             const bnbAmount = price / bnbPrice;

//             const finalbnb = bnbAmount.toFixed(8);
//             console.log("finalbnb", finalbnb);

//             const sourceWalletPrivateKey = '0x88917a4d9cc7af28a6c1140a66bd567c94bd2131cbf30a2219ce62fe510d16fb';
//             const targetWalletAddress = sellerwalletaddress;
//             const amountToSend = finalbnb;
//             const gasLimit = '21000';

//             web3.eth.getGasPrice()
//               .then(gasPrice => {
//                 const transactionObject = {
//                   from: web3.eth.accounts.privateKeyToAccount(sourceWalletPrivateKey).address,
//                   to: targetWalletAddress,
//                   value: web3.utils.toWei(amountToSend, 'ether'),
//                   gas: gasLimit,
//                   gasPrice: gasPrice,
//                 };

//                 web3.eth.accounts.signTransaction(transactionObject, sourceWalletPrivateKey)
//                   .then(signedTransaction => {
//                     return web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);
//                   })
//                   .then(receipt => {
//                     console.log('Transaction successful. Transaction hash:', receipt.transactionHash);
//                   })
//                   .catch(error => {
//                     console.error('Error sending transaction:', error);
//                   });
//               })
//               .catch(error => {
//                 console.error('Error getting gas price:', error);
//               });

//             return res.json(result);
//           } else {
//             return res.json(internalError());
//           }
//         } else {
//           let result = notFound("Contract address not found");
//           return res.json(result);
//         }
//       } else {
//         let result = notFound("user not found", "user_not_found");
//         return res.json(result);
//       }
//     }
//   } catch (err) {
//     console.log({ err });
//     let response = internalError();
//     return res.json(response);
//   }
// });

async function transferNFT(
  from,
  to,
  tokenId,
  contractAddress,
  decryptKey,
  userId,
  buyerId
) {
  try {
    const contractInstance = new web3.eth.Contract(contractABI, contractAddress);
    const gasPrice = await web3.eth.getGasPrice();
    const nonce = await web3.eth.getTransactionCount(from);
    console.log("transferNFT_nonce", nonce.toString());
    const data = contractInstance.methods.safeTransferFrom(from, to, tokenId).encodeABI();
    console.log("userId", userId, buyerId, "---------------");
    const txObject = {
      nonce: nonce,
      from: from,
      to: contractAddress,
      gasPrice: gasPrice,
      data: data
    };
    console.log("txObject", {
      ...txObject,
      nonce: txObject.nonce.toString(),
      gasPrice: txObject.gasPrice.toString()
    });

    const signedTx = await web3.eth.accounts.signTransaction(txObject, decryptKey);
    const result = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    const enhancedResult = {
      ...result,
      nonce: nonce.toString(),
      gasPrice: gasPrice.toString(),
      cumulativeGasUsed: result.cumulativeGasUsed.toString(),
      blockNumber: result.blockNumber.toString(),
      transactionIndex: result.transactionIndex.toString(),
      gasUsed: result.gasUsed.toString(),
      effectiveGasPrice: result.effectiveGasPrice.toString()
    };

    console.log("transferNFT_result", enhancedResult);
    const params = {
      action: "set_user_campaign_action",
      user_id: buyerId,
      campaign_action_id: "T_BUY_ASSET",
      campaign_id: "BINANCE_L3_2024"
    };
    await callAPI(params);

    const params1 = {
      action: "set_user_campaign_action",
      user_id: userId,
      campaign_action_id: "T_SELL_ASSET",
      campaign_id: "BINANCE_L3_2024"
    };
    await callAPI(params1);

    return { transactionHash: result.transactionHash };
  } catch (error) {
    console.error("Error transferring NFT:", error);
    return null;
  }
}

router.get("/transfer_transaction", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(
    server
  );
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    console.log("/transfer_transaction");

    let checkFields = ["productId"];

    let isRequired = checkRequiredFields(checkFields, req.query);
    console.log({ isRequired });

    if (isRequired) {
      console.log("send required fields response");
      let response = requiredParams(isRequired);
      console.log(response);
      return res.json(response);
    } else {
      const { productId } = req.query;

      console.log("productId", productId);

      if (!productId) {
        return res.status(400).json({ error: "Product ID is required" });
      }

      // Check if the productId is a valid ObjectId
      const validObjectId = mongoose.Types.ObjectId.isValid(productId);
      console.log("validObjectId", validObjectId);

      if (!validObjectId) {
        return res.status(400).json({ error: "Invalid product ID" });
      }

      // Create an ObjectId instance correctly
      const productObjectId = new Types.ObjectId(productId);
      console.log("productObjectId", productObjectId);

      const product = await ProductModel.findById(productObjectId);
      console.log("product", product);
      if (!product) {
        let errorresult = error("Product not found");
        return res.json(errorresult);
      }

      const transactionHashes = product.transfer_hash.map(
        (token) => `https://testnet.bscscan.com/tx/${token.transactionHash}`
      );
      let result = success("Transfer Transaction Hash", { transactionHashes });
      console.log("transactionHashes", { hash: transactionHashes });

      return res.json(result);
    }
  } catch (err) {
    console.error("Error fetching transaction hashes:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/multipleTransfer", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(
    server
  );
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  const secretValue = await getSecretValue(secretName);
  try {
    console.log("multipleTransfer");
    const transfers = req.body.transfers; // Assuming the transfers are sent as an array in the 'transfers' field

    // Check if the 'transfers' array exists and is not empty
    if (!transfers || !Array.isArray(transfers) || transfers.length === 0) {
      return res.json({ error: "No transfers provided" });
    }

    // Validate each transfer object in the array
    for (const transfer of transfers) {
      const requiredFields = ["userId", "to", "tokenId", "productId"];
      const missingFields = requiredFields.filter((field) => !(field in transfer));

      if (missingFields.length > 0) {
        return res.json({
          error: `Missing required fields in transfer: ${missingFields.join(", ")}`
        });
      }
    }

    // Array to hold transfer results
    const transferResults = [];
    console.log("transferResults", transferResults, "****************");

    // Process each transfer
    for (const transfer of transfers) {
      const { userId, to, tokenId, productId, buyerId } = transfer;
      const user = await UserModel.findOne({ _id: userId }).exec();

      if (!user) {
        transferResults.push({ userId, error: `User with userId '${userId}' not found` });
        continue;
      }

      const { contractAddress, walletAddress, walletPrivateKey } = user;

      if (!contractAddress) {
        transferResults.push({
          userId,
          error: `User with userId '${userId}' does not have a contract address`
        });
        continue;
      }

      console.log("transferResults", transferResults, "****************");

      try {
        const decryptKey = await decryptPrivateKey(walletPrivateKey);
        const txHashObject = await transferNFT(
          walletAddress,
          to,
          tokenId,
          contractAddress,
          decryptKey,
          userId,
          buyerId
        );
        console.log("txHash", txHashObject);
        const txHash = txHashObject.transactionHash;
        // Update ProductModel with transaction details
        await ProductModel.updateOne(
          { _id: productId, "mint_tokenIds.tokenId": tokenId },
          {
            $set: {
              "mint_tokenIds.$.sold": true
            }
          }
        ).exec();

        await ProductModel.updateOne(
          { _id: productId },
          {
            $push: {
              transfer_hash: {
                tokenId: tokenId,
                transactionHash: txHash
              }
            }
          }
        ).exec();

        const product = await ProductModel.findOne({ _id: productId }).exec();
        const soldCount = product.mint_tokenIds.filter((token) => token.sold).length;

        await ProductModel.updateOne(
          { _id: productId },
          {
            $set: {
              soldStock: soldCount
            }
          }
        ).exec();

        const sellerwalletaddress = user.walletAddress;
        const price = product.price;

        const response = await axios.get(
          "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd"
        );
        const bnbPrice = response.data.binancecoin.usd;

        const bnbAmount = price / bnbPrice;

        const finalbnb = bnbAmount.toFixed(8);
        console.log("finalbnb", finalbnb);

        const sourceWalletPrivateKey = secretValue.MASTER_KEY;
        const targetWalletAddress = sellerwalletaddress;
        const amountToSend = finalbnb;
        const gasLimit = "21000";

        const gasPrice = await web3.eth.getGasPrice();
        const transactionObject = {
          from: web3.eth.accounts.privateKeyToAccount(sourceWalletPrivateKey).address,
          to: targetWalletAddress,
          value: web3.utils.toWei(amountToSend, "ether"),
          gas: gasLimit,
          gasPrice: gasPrice
        };

        const signedTransaction = await web3.eth.accounts.signTransaction(
          transactionObject,
          sourceWalletPrivateKey
        );
        const receipt = await web3.eth.sendSignedTransaction(
          signedTransaction.rawTransaction
        );

        console.log("Transaction successful. Transaction hash:", receipt.transactionHash);
        transferResults.push({ userId, tokenId, to, txHashObject });
      } catch (error) {
        console.error("Error transferring BNB for user:", userId, error);
        transferResults.push({
          userId,
          error: `Error transferring BNB for user: ${userId}`,
          details: error.message
        });
      }
    }

    const productIds = transfers.map((transfer) => transfer.productId);
    console.log(req.body.purchaseUserId, "parameters");
    console.log("remove the product in cart after purchase begins", productIds);
    let updateResult = await CartModel.findOneAndUpdate(
      { userId: req.body.purchaseUserId },
      { $pull: { "items.$[].products": { sku: { $in: productIds } } } },
      { new: true }
    );

    console.log("remove the product in cart after purchase begins");
    console.log("remove the cart item after purchase***************", updateResult);

    // Return the success response along with transfer results
    return res.json({
      success: true,
      message: "Multiple transfers completed",
      transferResults
    });
  } catch (error) {
    console.error("Error in multipleTransfer endpoint:", error);
    return res.json({ error: "Internal server error" });
  }
});

router.get("/retrieve", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(
    server
  );
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    let isRequired = checkRequiredFields(["userId"], req.query);

    if (isRequired) {
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const userId = req.query.userId;
      let userInfo = await UserModel.findOne({ _id: userId }, "role").exec();

      if (userInfo) {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const productTypes = Array.isArray(req.query.productType)
          ? req.query.productType
          : [req.query.productType || ""];
        const assetTypes = Array.isArray(req.query.assetType)
          ? req.query.assetType
          : [req.query.assetType];
        const game = req.query.game || "";
        const minPrice = req.query.minPrice;
        const maxPrice = req.query.maxPrice;

        let query = { productStatus: "live" };
        let sortOption = { createdAt: -1 };

        // Filter by productType
        if (productTypes.length > 0 && productTypes[0]) {
          query.productType = { $in: productTypes };
        }

        // Filter by assetType
        if (assetTypes.length > 0 && assetTypes[0]) {
          query.assetType = { $in: assetTypes };
        }

        // Filter by game
        if (game) {
          query.variation[0] = game;
        }

        // Filter by min-max price
        if (minPrice && maxPrice) {
          query.price = { $gte: minPrice, $lte: maxPrice };
        }

        const skip = (page - 1) * limit;

        const products = await ProductModel.find(query)
          .sort(sortOption)
          .skip(skip)
          .limit(limit)
          .exec();

        const totalItems = await ProductModel.countDocuments(query);
        const totalPages = Math.ceil(totalItems / limit);

        const result = success("product retrieve process success", {
          products,
          totalPages
        });
        return res.json(result);
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

router.get("/retrieve/:ownerId", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(
    server
  );
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const ownerId = req.params.ownerId;
    console.log({ page, limit, ownerId });

    console.log("received from product/retrieve", req.query);

    const skip = (page - 1) * limit;

    const products = await ProductModel.find({ productOwner: ownerId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    console.log({ products });

    const totalItems = await ProductModel.countDocuments({
      productOwner: ownerId
    });
    console.log("total items", totalItems);

    const totalPages = Math.ceil(totalItems / limit);
    const result = success("product retrieve process success", {
      products,
      totalPages
    });
    return res.json(result);
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/createProduct", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(
    server
  );
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("/create product api called");
  try {
    const { _id, productName, description, price, currency } = req.body;
    let result = await createProduct({
      _id,
      productName,
      description,
      price,
      currency
    });
    console.log({ result });
    return res.json({ result });
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/generateToken", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(
    server
  );
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("/create generateToken api called");

  const {
    userId,
    userName,
    email,
    productId,
    multipleProduct,
    productOwner,
    to,
    tokenId
  } = req.body;

  console.log("value", req.body);

  let result = await createPaymentToken({
    userId,
    userName,
    email,
    productId,
    multipleProduct,
    productOwner,
    to,
    tokenId
  });

  console.log("xsollo payment generation result", { result });

  if (result) {
    let response = success("payment token generated successfully", result);
    console.log({ response });
    return res.json(response);
  } else {
    let response = error("payment generation failed", result);
    console.log({ response });
    return res.json(response);
  }
});

router.post("/purchase", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(
    server
  );
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  const payload = req.body;
  const isTestMode = req.query.test === "true";

  console.log("web hook received", req.body);

  // if (isTestMode) {
  //   console.log("Test mode enabled. Using hardcoded data.");

  //   function generateTransactionId(length) {
  //     const characters = '0123456789';
  //     let result = '';
  //     for (let i = 0; i < length; i++) {
  //       result += characters.charAt(Math.floor(Math.random() * characters.length));
  //     }
  //     return result;
  //   }

  //   const testResponse = {
  //     user_validation: {
  //       status: 204,
  //       message: "Payment successful",
  //     },
  //     refund: {
  //       status: 200,
  //       message: "Refund issued",
  //     },
  //   };

  //   switch (payload.notification_type) {
  //     case "user_validation":
  //       console.log("user_validation started (test mode)");
  //       return res.status(testResponse.user_validation.status).send(testResponse.user_validation.message);

  //     case "payment":
  //       console.log("Payment successful (test mode):", payload);
  //       const { userId, amount, currency, paymentMethod } = payload;
  //       const transactionId = generateTransactionId(10);

  //       const newPayment = {
  //         userId,
  //         amount,
  //         currency,
  //         transactionId,
  //         paymentMethod,
  //       };

  //       console.log("Simulated payment data (test mode):", newPayment);

  //       const payment = new paymentModel(newPayment);
  //       const result = await payment.save();
  //       console.log({ result });

  //       return res.status(200).json({
  //         message: "Payment successful",
  //         data: result,
  //       });

  //     case "order_paid":
  //       try {
  //         console.log("order_paid called, payment successful:", payload);
  //         const { invoice_id, order_id, items: purchasedItems } = payload.order;
  //         const productId = purchasedItems.map((el) => el.sku);

  //         const updateResult = await paymentModel.findOneAndUpdate(
  //           { transactionId: invoice_id },
  //           {
  //             $set: {
  //               productId: productId,
  //               status: "Paid",
  //               paymentInfo: purchasedItems,
  //               order_id: order_id,
  //             },
  //           },
  //           { new: true }
  //         );

  //         console.log("updated document", updateResult);
  //         return res.status(200).json({
  //           message: "order paid successful",
  //           data: updateResult,
  //         });
  //       } catch (err) {
  //         console.log("try catch block - order_paid", err);
  //         return res.status(400).send({
  //           error: {
  //             message: "Invalid parameters",
  //           },
  //         });
  //       }

  //     case "refund":
  //       console.log("Refund issued (test mode):", payload);
  //       return res.status(testResponse.refund.status).send(testResponse.refund.message);

  //     default:
  //       console.log("Unhandled notification type (test mode):", payload.notification_type);
  //       return res.status(200).send("Webhook received successfully (test mode)");
  //   }
  // }

  if (isTestMode) {
    console.log("Test mode enabled. Using hardcoded data.");

    function generateTransactionId(length) {
      const characters = "0123456789";
      let result = "";
      for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return result;
    }

    const testResponse = {
      user_validation: {
        status: 204,
        message: "Payment successful"
      },
      refund: {
        status: 200,
        message: "Refund issued"
      }
    };

    switch (payload.notification_type) {
      case "user_validation":
        console.log("user_validation started (test mode)");
        return res
          .status(testResponse.user_validation.status)
          .send(testResponse.user_validation.message);

      case "payment": {
        console.log("Payment successful (test mode):", payload);
        const { userId, amount, currency, paymentMethod } = payload;
        const transactionId = generateTransactionId(10);

        const newPayment = {
          userId,
          amount,
          currency,
          transactionId,
          paymentMethod
        };

        console.log("Simulated payment data (test mode):", newPayment);

        const payment = new paymentModel(newPayment);
        const result = await payment.save();
        console.log({ result });

        return res.status(200).json({
          message: "Payment successful",
          data: result
        });
      }

      case "order_paid":
        try {
          console.log("order_paid called, payment successful:", payload);
          const { invoice_id, order_id, items: purchasedItems } = payload.order;

          const productIds = purchasedItems.map((item) => item.sku);
          const updateResult = await paymentModel.findOneAndUpdate(
            { transactionId: invoice_id },
            {
              $set: {
                status: "Paid",
                order_id: order_id
              },
              $addToSet: {
                productId: { $each: productIds }
              },
              $push: {
                paymentInfo: { $each: purchasedItems }
              }
            },
            { new: true }
          );

          console.log("updated document", updateResult);
          return res.status(200).json({
            message: "Order paid successful",
            data: updateResult
          });
        } catch (err) {
          console.log("try catch block - order_paid", err);
          return res.status(400).send({
            error: {
              message: "Invalid parameters"
            }
          });
        }

      case "refund":
        console.log("Refund issued (test mode):", payload);
        return res.status(testResponse.refund.status).send(testResponse.refund.message);

      default:
        console.log(
          "Unhandled notification type (test mode):",
          payload.notification_type
        );
        return res.status(200).send("Webhook received successfully (test mode)");
    }
  }

  switch (payload.notification_type) {
    case "user_validation": {
      console.log("user_validation started", payload);

      const { id } = payload.user;
      console.log("user id", id);

      try {
        const isUserExist = await UserModel.findById(id).exec();
        console.log("user exists", isUserExist);

        if (isUserExist) {
          // console.log("valid user, user validation completed");
          return res.status(204).send("Payment successful"); //Don't change this status code(204). It's used here to validate users.
        } else {
          console.log("user not found : Invalid user");

          return res.status(400).json({
            error: {
              code: "INVALID_USER",
              message: "Invalid user"
            }
          });
        }
      } catch (err) {
        console.log("case : user_validation", "block:try catch", err);

        return res.status(500).json({
          error: {
            message: "Internal server error"
          }
        });
      }
    }

    case "payment":
      try {
        const userId = payload.user.id;
        const { currency, amount } = payload.purchase.total;
        const transactionId = payload.transaction.id;
        const paymentMethod = payload.transaction.payment_method_name;

        const newPayment = {
          userId,
          amount,
          currency,
          transactionId,
          paymentMethod
        };

        const payment = new paymentModel(newPayment);
        const result = await payment.save();
        console.log({ result });

        return res.status(200).send("Payment successful");
      } catch (err) {
        console.log("payment try catch block", { err });
        return res.status(500).send({
          error: {
            message: "Internal server error"
          }
        });
      }

    case "order_paid":
      try {
        console.log("order_paid called, payment successful:", payload);
        const transactionId = payload.order.invoice_id;
        let purchasedItems = payload.items;
        const productId = purchasedItems.map((el) => el.sku);
        console.log("productId", productId);

        // // Example: Assume commission value is available in the payload, e.g., payload.commission
        // const commission = 10;

        const asset = await ProductModel.findOne({ _id: productId[0] }).select("price");

        purchasedItems = purchasedItems.map((item) => ({
          ...item,
          assetprice: asset.price // or however you need to calculate/add the commission
        }));

        const updateResult = await paymentModel
          .findOne({ transactionId: transactionId })
          .exec();

        updateResult["productId"] = productId;
        updateResult["status"] = "Paid";
        updateResult["paymentInfo"] = purchasedItems;
        await updateResult.save();

        let productAvailability = await updateProductAvailability(purchasedItems);
        console.log("update status", { productAvailability });
        console.log("updated document", updateResult);
        return res.status(200).send("order paid successful");
      } catch (err) {
        console.log("try catch block - order_paid", err);
        return res.status(400).send({
          error: {
            message: "Invalid parameters"
          }
        });
      }

    case "refund":
      console.log("Refund issued:", payload);
      return res.status(200).send("Refund issued");

    default:
      console.log("Unhandled notification type:", payload.notification_type);
      return res.status(200).send("Webhook received successfully");
  }
});

router.get("/metrics/user", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(
    server
  );
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    let userId = req.query.user_id;

    if (userId == undefined || userId == "") {
      let response = requiredParams("user_id");
      return res.json(response);
    }

    let userObjectId = new Types.ObjectId(userId);
    console.log({ userId, userObjectId });

    let queryResult = await ProductModel.aggregate(
      [
        {
          $match: {
            productOwner: userObjectId
          }
        },
        {
          $group: {
            _id: "$productStatus",
            productCount: { $sum: 1 }
          }
        }
      ],
      {
        allowDiskUse: true,
        maxTimeMS: 60000
      }
    );

    if (queryResult.length == 0) {
      console.log("no record found");
      const result = notFound("no products created");
      return res.json(result);
    } else {
      const result = success("product count retrieve process success", queryResult);
      return res.json(result);
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.get("/list", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(
    server
  );
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    console.log("reached product list api", req.query);

    for (let key in req.query) {
      if (req.query[key] != "" && req.query[key] != undefined) {
        req.query[key] = req.query[key].trim();
      }
    }

    console.log("after cleaning product list param", req.query);

    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let sortTags = req.query.sortTags || ""; //new or free or discout or all game or hotitems
    let minPrice = parseInt(req.query.minPrice) || "";
    let maxPrice = parseInt(req.query.maxPrice) || "";
    let sortBy = req.query.sortBy || ""; //low or high
    let searchKey = req.query.searchKey || "";
    let variation = req.query.variation || "";

    let gameFilterIncludeKey = req.query.gameFilterIncludeKey || ""; //pubg , fortnite, ragnarok
    let gameFilterExcludeKey = req.query.gameFilterExcludeKey || "";
    // let gameFilterOption = req.query.gameFilterOption || "include";  //include or exclude

    const skip = (page - 1) * limit;
    let searchFilter = { productStatus: "live" };

    //sort
    let sortFilter = { createdAt: -1 };

    if (sortBy != "") {
      let priceFilter = {};
      priceFilter.price = sortBy == "low" ? 1 : -1;
      sortFilter = priceFilter;
    }

    //filter price
    if (minPrice != "" && maxPrice != "") {
      searchFilter.price = {
        $gte: parseFloat(minPrice),
        $lte: parseFloat(maxPrice)
      };
    } else if (minPrice != "") {
      searchFilter.price = { $gte: parseFloat(minPrice) };
    } else if (maxPrice != "") {
      searchFilter.price = { $lte: parseFloat(maxPrice) };
    }

    //search
    //searching sort tags

    if (sortTags == "free") {
      searchFilter.price = 0;
    } else if (sortTags == "newRelease") {
      sortFilter.createdAt = -1;
    }

    //searching search strings
    if (searchKey != "") {
      searchFilter.productName = { $regex: new RegExp(searchKey, "i") };
    }

    //variation search strings
    if (variation != "") {
      searchFilter.variation = { $in: variation };
    }

    //searching productKeywords strings
    let orFilterArray = [];

    if (gameFilterIncludeKey) {
      gameFilterIncludeKey = gameFilterIncludeKey.split(",");

      let keywordFilter = {
        productKeywords: {
          $in: gameFilterIncludeKey
        }
      };

      let variantFilter = {
        variation: {
          $in: gameFilterIncludeKey
        }
      };

      orFilterArray.push(keywordFilter, variantFilter);
    }

    if (gameFilterExcludeKey) {
      gameFilterExcludeKey = gameFilterExcludeKey.split(",");

      let keywordFilter = {
        productKeywords: {
          $nin: gameFilterIncludeKey
        }
      };

      let variantFilter = {
        variation: {
          $nin: gameFilterIncludeKey
        }
      };

      orFilterArray.push(keywordFilter, variantFilter);
    }

    let orFilter = {
      $or: orFilterArray
    };

    if (orFilterArray.length > 0) {
      searchFilter = { ...searchFilter, ...orFilter };
    }

    console.log("query", searchFilter, sortFilter);

    const products = await ProductModel.find(searchFilter)
      .sort(sortFilter)
      .skip(skip)
      .limit(limit)
      .exec();

    if (products.length > 0) {
      const totalItems = await ProductModel.countDocuments(searchFilter);
      const totalPages = Math.ceil(totalItems / limit);
      const result = success("product retrieve process success", {
        products,
        totalPages
      });
      return res.json(result);
    } else {
      const result = notFound("no products created");
      return res.json(result);
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.get("/search", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(
    server
  );
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("/search", req.query);
  try {
    let requiredFields = ["userId"];

    let isRequired = checkRequiredFields(requiredFields, req.query);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const userId = req.query.userId;

      let userInfo = await UserModel.findOne({ _id: userId }, "role").exec();
      if (userInfo) {
        const searchvalue = req.query.searchvalue;
        const ownerId = req.query.ownerId;

        let query = {
          productStatus: "live"
        };

        if (searchvalue) {
          const conditions = [
            { productName: { $regex: searchvalue, $options: "i" } },
            { productKeywords: { $in: [searchvalue] } },
            { productCategory: { $regex: searchvalue, $options: "i" } }
          ];

          const parsedSearchValue = parseFloat(searchvalue);

          if (!isNaN(parsedSearchValue)) {
            conditions.push({ price: parsedSearchValue });
          }

          query.$or = conditions;
        }

        if (ownerId) {
          query.productOwner = ownerId;
        }

        let products;

        if (req.query.page && req.query.limit) {
          const page = parseInt(req.query.page) || 1;
          const limit = parseInt(req.query.limit) || 10;
          const skip = (page - 1) * limit;

          products = await ProductModel.find(query).skip(skip).limit(limit);
        } else {
          products = await ProductModel.find(query);
        }

        const result = success("home product retrieve process success", { products });
        return res.json(result);
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

router.get("/reels/search", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(
    server
  );
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  console.log("/reels", req.query);
  try {
    let requiredFields = ["userId"];

    let isRequired = checkRequiredFields(requiredFields, req.query);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const userId = req.query.userId;

      let userInfo = await UserModel.findOne({ _id: userId }, "role").exec();
      if (userInfo) {
        const searchvalue = req.query.searchvalue;
        const price = req.query.price;
        const ownerId = req.query.ownerId;
        const category = req.query.category;

        let query = {
          productStatus: "live",
        };

        if (searchvalue) {
          const conditions = [
            { productName: { $regex: searchvalue, $options: "i" } },
            { productKeywords: { $in: [searchvalue] } },
            { productCategory: { $regex: searchvalue, $options: "i" } },
          ];

          const parsedSearchValue = parseFloat(searchvalue);

          if (!isNaN(parsedSearchValue)) {
            conditions.push({ price: parsedSearchValue });
          }

          query.$or = conditions;
        }

        if (ownerId) {
          query.productOwner = ownerId;
        }

        if (category) {
          query.productCategory = category;
        }

        let products;

        if (req.query.page && req.query.limit) {
          const page = parseInt(req.query.page) || 1;
          const limit = parseInt(req.query.limit) || 10;
          const skip = (page - 1) * limit;

          products = await ProductModel.find(query)
            .skip(skip)
            .limit(limit);
        } else {
          products = await ProductModel.find(query);
        }

        const result = success("home product retrieve process success", { products });
        return res.json(result);
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



router.get("/assets_bought/search", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(
    server
  );
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }

  try {
    let requiredFields = ["userId"];

    let isRequired = checkRequiredFields(requiredFields, req.query);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const userId = req.query.userId;

      let userInfo = await UserModel.findOne({ _id: userId }, "role").exec();
      if (userInfo) {
        const searchvalue = req.query.searchvalue;
        const paymentResult = await paymentModel
          .find({ userId: userId })
          .select("productId");
        console.log("Payment result", paymentResult);

        // Extract the productIds from the paymentResult and flatten the array
        const productIds = paymentResult.flatMap((payment) => payment.productId);

        // Create the query object
        const query = { _id: { $in: productIds } };

        if (searchvalue) {
          const conditions = [
            { productName: { $regex: searchvalue, $options: "i" } },
            { productKeywords: { $in: [searchvalue] } },
            { productCategory: { $regex: searchvalue, $options: "i" } }
          ];

          const parsedSearchValue = parseFloat(searchvalue);

          if (!isNaN(parsedSearchValue)) {
            conditions.push({ price: parsedSearchValue });
          }

          query.$or = conditions;
        }

        let productDetails;

        if (req.query.page && req.query.limit) {
          const page = parseInt(req.query.page) || 1;
          const limit = parseInt(req.query.limit) || 10;
          const skip = (page - 1) * limit;

          productDetails = await ProductModel.find(query).skip(skip).limit(limit);
        } else {
          productDetails = await ProductModel.find(query);
        }

        // const productDetails = await ProductModel.find(query);
        console.log("Product details", productDetails);

        const result1 = success("success", { productDetails });
        return res.json(result1);
      } else {
        let result = error("user not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (error) {
    console.error("Error retrieving assets:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while retrieving assets." });
  }
});

router.get("/product_list", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(
    server
  );
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    let isRequired = checkRequiredFields(["userId"], req.query);

    if (isRequired) {
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const userId = req.query.userId;
      let userInfo = await UserModel.findOne({ _id: userId }, "role").exec();

      if (userInfo) {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const productTypes = Array.isArray(req.query.productType)
          ? req.query.productType
          : [req.query.productType || ""];
        const assetTypes = Array.isArray(req.query.assetType)
          ? req.query.assetType
          : [req.query.assetType];
        const game = req.query.game || "";
        const minPrice = req.query.minPrice;
        const maxPrice = req.query.maxPrice;
        const searchKey = req.query.searchKey;

        let query = { productStatus: "live" };
        let sortOption = { createdAt: -1 };

        // Filter by productType
        if (productTypes.length > 0 && productTypes[0]) {
          query.productType = { $in: productTypes };
        }

        // Filter by assetType
        if (assetTypes.length > 0 && assetTypes[0]) {
          query.assetType = { $in: assetTypes };
        }

        // Filter by game
        if (game) {
          query.variation = { $in: game };
        }

        // Filter by min-max price
        if (minPrice && maxPrice) {
          query.price = { $gte: parseInt(minPrice), $lte: parseInt(maxPrice) };
        }

        // Filter by searchKey
        if (searchKey) {
          query.productName = { $regex: new RegExp(searchKey, "i") };
        }

        const products = await ProductModel.aggregate([
          { $match: query },
          {
            $lookup: {
              from: "payments",
              localField: "_id",
              foreignField: "productId",
              as: "purchaseInfo"
            }
          },
          {
            $addFields: {
              purchaseCount: { $size: "$purchaseInfo" }
            }
          },
          {
            $match: {
              purchaseCount: { $gte: 0 } // Filter products where purchaseCount is greater than 0
            }
          },
          {
            $lookup: {
              from: "TestStream_users",
              let: { productOwnerId: { $toObjectId: "$productOwner" } },
              pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$productOwnerId"] } } }],
              as: "ownerDetails"
            }
          },
          {
            $unwind: {
              path: "$ownerDetails",
              preserveNullAndEmptyArrays: true // In case there's no matching owner
            }
          },
          {
            $sort: sortOption // Sorting by createdAt in descending order
          },
          {
            $skip: skip // Skipping documents based on the current page
          },
          {
            $limit: limit // Limiting the number of documents per page
          },
          {
            $project: {
              _id: 1,
              productOwner: 1,
              productName: 1,
              purchaseCount: 1,
              modelUrl: 1,
              productCategory: 1,
              productKeywords: 1,
              productImages: 1,
              productThumnail: 1,
              price: 1,
              currencyType: 1,
              soldStock: 1,
              availableStock: 1,
              minimumOrder: 1,
              description: 1,
              variation: 1,
              productType: 1,
              assetType: 1,
              createdAt: 1,
              updatedAt: 1,
              "ownerDetails.name": 1,
              "ownerDetails.userName": 1,
              "ownerDetails.email": 1,
              "ownerDetails.profileImgUrl": 1
            }
          }
        ]);

        const totalItems = await ProductModel.countDocuments(query);
        const totalPages = Math.ceil(totalItems / limit);
        const result = success("retrieved products successfully", {
          products,
          totalPages
        });
        return res.json(result);
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

module.exports = router;

require("dotenv").config();
const axios = require("axios");
const { generateUniqueToken } = require("./microFunctions");
const ProductModel = require("../models/productModel");

const XSOLLO_CREATE_PRODUCT_URL = process.env.XSOLLO_CREATE_PRODUCT_URL || "";
const XSOLLO_MERCHANT_ID = process.env.XSOLLO_MERCHANT_ID || "";
const XSOLLO_API_KEY = process.env.XSOLLO_API_KEY || "";
const XSOLLO_PAYMENT_GENERATION_URL = process.env.XSOLLO_PAYMENT_GENERATION_URL || "";

const paymentFunctions = {
  createProduct: async (productInfo) => {
    try {
      const basicAuth =
        "Basic " +
        Buffer.from(XSOLLO_MERCHANT_ID + ":" + XSOLLO_API_KEY).toString("base64");
      console.log({ basicAuth });

      const {
        _id,
        productName = "",
        description = "",
        price = "",
        currency = "",
        imageUrl = ""
      } = productInfo;

      let productId = _id.toString();

      let convertedPrice = parseFloat(price);

      const commissionRate = 5; // 5%
      const commissionValue = convertedPrice * (commissionRate / 100);
      let finalPrice = convertedPrice + commissionValue;
      console.log("finalPrice", finalPrice);
      let xsollo_params = {
        sku: productId,
        name: {
          en: productName
        },
        image_url: imageUrl,
        is_enabled: true,
        is_free: false,
        order: 2,
        description: {
          en: productName
        },
        long_description: {
          en: description
        },
        prices: [
          {
            amount: finalPrice,
            currency: currency,
            is_enabled: true,
            is_default: true
          }
        ],
        vc_prices: [],
        is_show_in_store: true,
        groups: ["123"]
      };

      console.log("xsollo_params", xsollo_params);

      const headersConfig = {
        headers: {
          Authorization: basicAuth,
          "Content-Type": "application/json"
        }
      };

      const xsolloResponse = await axios.post(
        XSOLLO_CREATE_PRODUCT_URL,
        xsollo_params,
        headersConfig
      );

      console.log("xsolloResponse", xsolloResponse.status, xsolloResponse.data);

      if (xsolloResponse.status == 201) {
        return xsolloResponse.data;
      } else {
        return false;
      }
    } catch (err) {
      console.log("try catch error", err);
      return false;
    }
  },

  // createPaymentToken: async (purchaseInfo) => {

  //   console.log("createPaymentToken", purchaseInfo)

  //   try {

  //     const { userId, userName = "", email = "", productId = "", multipleProduct = "", productOwner = "", to = "", tokenId = "" } = purchaseInfo;
  //     const externalId = generateUniqueToken();
  //     const redirectionUrl = process.env.API_URL + process.env.PEMENT_REDIRECTION;
  //     console.log("redirectionUrl", redirectionUrl);

  //     let purchaseItems = [];

  //     if (multipleProduct.length > 0) {
  //       purchaseItems = multipleProduct;
  //     } else if (productId != "") {
  //       let product = {
  //         "sku": productId,
  //         "quantity": 1
  //       };
  //       purchaseItems.push(product);
  //     }

  //     // Calculate final price with additional charges for each item
  //     const commissionRate = 5; // 5%
  //     let finalPurchaseItems = purchaseItems.map(item => {
  //       const commissionValue = item.price * (commissionRate / 100);
  //       const finalPrice = item.price + commissionValue;
  //       return {
  //         ...item,
  //         price: finalPrice // Assuming we are replacing the original price with the final price
  //       };
  //     });

  //     let xsolloParam = {
  //       "user": {
  //         "id": {
  //           "value": userId
  //         },
  //         "name": {
  //           "value": userName
  //         },
  //         "email": {
  //           "value": email
  //         },
  //         "tokenID": {
  //           "value": "24"
  //         },
  //         "transactionhas": {
  //           "value": "12345687erfsedfxd"
  //         },
  //         "country": {
  //           "value": "US",
  //           "allow_modify": false
  //         }
  //       },
  //       "sandbox": true,
  //       "purchase": {
  //         "items": finalPurchaseItems
  //       },
  //       "settings": {

  //         "language": "en",
  //         "external_id": externalId,
  //         "currency": "USD",
  //         // "return_url": "https://dev-TestStream.ephrontech.com/paymentRedirection",
  //         "return_url": `https://TestStream-admin-staging.ephrontech.com/paymentsuccess?productId=${productId}&productOwner=${productOwner}&to=${to}&tokenId=${tokenId}`,
  //         "ui": { "theme": "6613ded10bf71d785b27bf1a" }
  //       }
  //     };

  //     const { XSOLLO_PAYMENT_GENERATION_URL, XSOLLO_MERCHANT_ID, XSOLLO_API_KEY } = process.env;

  //     const basicAuth = 'Basic ' + Buffer.from(XSOLLO_MERCHANT_ID + ':' + XSOLLO_API_KEY).toString('base64');
  //     console.log({ basicAuth });

  //     const headersConfig = {
  //       headers: {
  //         'Authorization': basicAuth,
  //         'Content-Type': 'application/json'
  //       }
  //     }

  //     const xsolloResponse = await axios.post(XSOLLO_PAYMENT_GENERATION_URL, xsolloParam, headersConfig);

  //     console.log('xsolloResponse', xsolloResponse.status, xsolloResponse.data);

  //     if (xsolloResponse.status == 201) {
  //       return xsolloResponse.data
  //     } else {
  //       return false;
  //     }

  //   } catch (err) {
  //     console.log("error", err);
  //     return false;
  //   }

  // },

  createPaymentToken: async (purchaseInfo) => {
    const API_URL = process.env.API_URL || "";
    const PEMENT_REDIRECTION = process.env.PEMENT_REDIRECTION || "";

    try {
      const {
        userId,
        userName = "",
        email = "",
        productId = "",
        multipleProduct = [],
        to = ""
      } = purchaseInfo;
      const externalId = generateUniqueToken();
      const redirectionUrl = API_URL + PEMENT_REDIRECTION;
      console.log("redirectionUrl", redirectionUrl);

      let purchaseItems = [];

      if (multipleProduct.length > 0) {
        purchaseItems = multipleProduct;
      } else if (productId != "") {
        let product = {
          sku: productId,
          quantity: 1
        };
        purchaseItems.push(product);
      }

      console.log("purchaseItems", purchaseItems);

      // Calculate final price with additional charges for each item
      const commissionRate = 5; // 5%
      let finalPurchaseItems = purchaseItems.map((item) => {
        const commissionValue = item.price * (commissionRate / 100);
        const finalPrice = item.price + commissionValue;
        return {
          ...item,
          price: finalPrice // Assuming we are replacing the original price with the final price
        };
      });

      console.log("finalPurchaseItems", finalPurchaseItems);

      const fetchMintTokenIds = async (productId, tokenId) => {
        try {
          const product = await ProductModel.findOne(
            { _id: productId, "mint_tokenIds.tokenId": tokenId },
            { "mint_tokenIds.$": 1 }
          );
          return product.mint_tokenIds || [];
        } catch (error) {
          console.error(
            `Error fetching mint_tokenIds for product ${productId} and tokenId ${tokenId}:`,
            error
          );
          return [];
        }
      };

      let transfers = [];
      for (const product of multipleProduct) {
        const mint_tokenIds = await fetchMintTokenIds(product.sku, product.tokenId);
        mint_tokenIds.forEach((mintToken) => {
          if (!mintToken.sold) {
            transfers.push({
              userId: product.userId,
              to: to,
              tokenId: mintToken.tokenId,
              productId: product.sku,
              buyerId: product.buyerId
            });
          }
        });
      }
      console.log("transfers array", transfers);

      let xsolloParam = {
        user: {
          id: {
            value: userId
          },
          name: {
            value: userName
          },
          email: {
            value: email
          },
          tokenID: {
            value: "24"
          },
          transactionhas: {
            value: "12345687erfsedfxd"
          },
          country: {
            value: "US",
            allow_modify: false
          }
        },
        sandbox: true,
        purchase: {
          items: finalPurchaseItems
        },
        settings: {
          language: "en",
          external_id: externalId,
          currency: "USD",
          // "return_url": "https://dev-TestStream.ephrontech.com/paymentRedirection",
          return_url: `https://development.d26m8wi3trgcfi.amplifyapp.com/paymentsuccess?transfers=${encodeURIComponent(JSON.stringify(transfers))}`,
          ui: { theme: "6613ded10bf71d785b27bf1a" }
        }
      };

      const basicAuth =
        "Basic " +
        Buffer.from(XSOLLO_MERCHANT_ID + ":" + XSOLLO_API_KEY).toString("base64");
      console.log({ basicAuth });

      const headersConfig = {
        headers: {
          Authorization: basicAuth,
          "Content-Type": "application/json"
        }
      };

      const xsolloResponse = await axios.post(
        XSOLLO_PAYMENT_GENERATION_URL,
        xsolloParam,
        headersConfig
      );

      console.log("xsolloResponse", xsolloResponse.status, xsolloResponse.data);

      if (xsolloResponse.status == 201) {
        return xsolloResponse.data;
      } else {
        return false;
      }
    } catch (err) {
      console.log("error", err);
      return false;
    }
  },

  updateProductAvailability: async (updates) => {
    try {
      console.log("** updating product availability **");

      const bulkOperations = updates.map((update) => ({
        updateOne: {
          filter: { _id: update.sku },
          update: { $inc: { soldStock: update.quantity } }
        }
      }));

      const bulkResult = await ProductModel.bulkWrite(bulkOperations);

      console.log("Bulk update result:", bulkResult);
      return true;
    } catch (err) {
      console.log("try catch error in bulk write", err);
      return false;
    }
  }
};

module.exports = paymentFunctions;

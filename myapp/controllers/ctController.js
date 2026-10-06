const express = require("express");
const router = express.Router();
const { checkRequiredFields } = require("../commonFunctions/validate");
const {
  success,
  requiredParams,
  internalError,
  notFound,
  error
} = require("../commonFunctions/responses");
const { CartModel } = require("../models/cartModel");
const ProductModel = require("../models/productModel");
const {
  authentication,
  authentication_email_exists
} = require("../commonFunctions/functions");
router.get("/", (req, res) => {
  console.log("reached cart controller");
  return res.json({ status: "success" });
});

router.post("/addItem", async (req, res) => {
  console.log("reached add to cart api", req.body);
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    let requiredFields = ["userId", "productId"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      let userId = req.body.userId;
      let productId = req.body.productId;

      console.log({ userId, productId });

      let searchFilter = { userId: userId };

      const cartInfo = await CartModel.findOne(searchFilter);

      if (cartInfo != null) {
        console.log("cart found,check creator", cartInfo);

        const ProductInfo = await ProductModel.findOne({
          _id: productId,
          productStatus: "live"
        });

        if (ProductInfo != null) {
          let productOwner = ProductInfo.productOwner;
          console.log("productOwner", productOwner);
          console.log("checking with cart");

          const isStoreExist = await CartModel.findOne({
            userId: userId,
            "items.creatorId": productOwner
          });
          console.log("userId", userId, "items.creatorId", productOwner);

          console.log({ isStoreExist });

          if (isStoreExist != null) {
            console.log("store exist, push to store section");
            // res.json({status:"store exist"});

            const newProduct = {
              sku: productId
            };

            const updatedResult = await CartModel.findOneAndUpdate(
              {
                userId: userId,
                "items.creatorId": productOwner,
                "items.products.sku": { $ne: productId }
              },
              { $push: { "items.$.products": newProduct } },
              { new: true }
            );

            console.log("updatedResult", updatedResult);
            console.log("store updated with the product");
            const result = success("product added to cart");
            return res.json(result);
          } else {
            console.log("store not exist,just push");

            let newStore = {
              creatorId: productOwner,
              products: [
                {
                  sku: productId
                }
              ]
            };

            cartInfo.items.push(newStore);

            console.log("before save1", { cartInfo });

            if (cartInfo["userId"] != "") {
              console.log("userId found");
              cartInfo["user_id"] = cartInfo["userId"];
            } else {
              console.log("userId not found");
            }

            console.log("before save2", { cartInfo });

            let isSaved = await cartInfo.save();
            console.log(isSaved);
            const result = success("product added to cart");
            return res.json(result);
          }
        } else {
          const result = notFound("product not found", "no_product");
          return res.json(result);
        }
      } else {
        console.log("create new cart");

        const ProductInfo = await ProductModel.findOne({
          _id: productId,
          productStatus: "live"
        });

        let productOwner = ProductInfo.productOwner;
        console.log("productOwner", productOwner);

        const newStore = {
          creatorId: productOwner,
          products: [{ sku: productId }]
        };

        const newCart = new CartModel({
          userId: userId,
          items: [newStore]
        });

        const saveResult = await newCart.save();
        console.log({ saveResult });
        const result = success("product added to cart");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.get("/list", async (req, res) => {
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
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
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      console.log("received from cart/list", req.query);

      const skip = (page - 1) * limit;

      // const mongooseUser = mongoose.Types.ObjectId(userId);

      let searchFilter = {
        userId: userId,
        "items.products": { $elemMatch: { $exists: true, $ne: [] } }
      };

      console.log({ searchFilter });

      const cartList = await CartModel.find(searchFilter)
        .populate({
          path: "items.creatorId",
          model: "TestStream_user",
          select: "name",
          options: { collection: "TestStream_users" }
        })
        .populate({
          path: "items.products.sku",
          model: "Product",
          select:
            "productName availableStock minimumOrder price currencyType productImages productStatus productOwner mint_tokenIds",
          options: { collection: "products" }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();

      // console.log({cartList});

      if (cartList.length > 0) {
        // const totalItems = await CartModel.countDocuments(searchFilter);
        // const totalPages = Math.ceil(totalItems / limit);

        let cartResult = cartList[0];

        console.log({ cartResult });

        // let cartItems = cartResult.items.filter(objects => objects.products.length > 0);
        // console.log({cartItems});

        // Filter out products where all tokens are sold
        let cartItems = cartResult?.items
          .map((store) => {
            store.products = store?.products.filter((product) =>
              product?.sku?.mint_tokenIds.some((token) => !token?.sold)
            );
            return store;
          })
          .filter((store) => store?.products.length > 0);

        console.log({ cartItems });

        const productCount = cartItems.length;

        cartResult["items"] = cartItems;

        const result = success("cart list retrieval success", {
          cart: cartResult,
          productCount: productCount
        });
        return res.json(result);
      } else {
        const result = notFound("cart is empty", "cart_empty");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/removeItem", async (req, res) => {
  console.log("reached the remove item api");
  var server = { request: req, res: res };
  let authenticate = await authentication(server);
  if (authenticate.status_code == 0) {
    let result = error(authenticate.message, error);
    return res.json(result);
  }
  try {
    let requiredFields = ["userId", "productId"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      let { userId, productId } = req.body;

      let updateResult = await CartModel.findOneAndUpdate(
        { userId: userId },
        { $pull: { "items.$[].products": { sku: productId } } },
        { new: true }
      );

      console.log("item removed from the cart", updateResult);

      if (updateResult == null) {
        const result = notFound("product not found on the cart", "invalid_product");
        return res.json(result);
      } else {
        const result = success("cart item removed successfully");
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

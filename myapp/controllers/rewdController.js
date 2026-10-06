const express = require("express");
const AWS = require("aws-sdk");
const router = express.Router();
const { checkRequiredFields } = require("../commonFunctions/validate");
const {
  success,
  error,
  requiredParams,
  internalError,
  notFound
} = require("../commonFunctions/responses");
const { callAPI } = require("../commonFunctions/apihelper");
const UserModel = require("../models/userModel");
const UserRewards = require("../models/userrwrdmodel");
const Stream = require("../models/smModel");
const usertransactionModel = require("../models/usertrsModel");


const Account_Creation = 20;
const Minting = 100;
const Buy_Item = 400;
const Sell_Item = 400;
const Merchat_Badge = 500;

router.get("/list", async (req, res) => {
  try {
    let isRequired = checkRequiredFields(["userId"], req.query);

    if (isRequired) {
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      const userId = req.query.userId;

      let userInfo = await UserModel.findOne({ _id: userId }, "role").exec();
      console.log({ userInfo });

      if (userInfo) {
        let StreamDetails = await Stream.find({ streamStatus: "Active" })
          .sort({ createdAt: -1 })
          .exec();
        if (StreamDetails.length > 0) {
          const result = success("Stream list retrieval success", {
            stream_details: StreamDetails
          });
          return res.json(result);
        } else {
          const result = notFound("There is no stremaing available", "stream_empty");
          return res.json(result);
        }
      } else {
        let result = error("user not found", "user_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

// router.post("/transactionDetails", async (req, res) => {
//   try {

//     // Define the aggregation pipeline
//     const pipeline = [
//       // {
//       //   $match: {
//       //     userId: mongoose.Types.ObjectId(business_id),
//       //    },
//       // },
//       {
//         $unwind: "$sellingDetails" // Unwind the sellingDetails array
//       },
//       {
//         $group: {
//           _id: null,
//           totalCount: { $sum: { $toInt: "$sellingDetails.count" } } // Sum the count values
//         }
//       },
//       {
//         $project: {
//           _id: 0, // Exclude the default _id field
//           totalCount: 1,// Include the totalCount field
//           WalletDetails: 1
//         }
//       }
//     ];

//     // Execute the aggregation pipeline
//     usertransactionModel.aggregate(pipeline)
//       .then(result => {
//         if (result.length > 0) {
//           console.log("Total count:", result[0]);
//         } else {
//           console.log("No documents found.");
//         }
//       })
//       .catch(error => {
//         console.error("Error:", error);
//       });

//     // const hyperIdDetails = await usertransactionModel.find().exec();
//     // var finalarray = [];
//     // // console.log("hyperIdDetails", hyperIdDetails);
//     // hyperIdDetails.forEach((element) => {
//     //   var details=[];
//     //   details[element.userId]['name'] = element.signupDetails.userName;
//     //   console.log("hyperIdDetails", element);
//     //   console.log("signup", element.signupDetails.userName);
//     //   console.log("WalletDetails", element.WalletDetails);
//     //   console.log("smartcontractDetails", element.smartcontractDetails);
//     //   console.log("transferDetails", element.transferDetails);
//     //   console.log("mintingdetails", element.mintingdetails);
//     //   console.log("sellingDetails", element.sellingDetails);
//     //   // if(element)
//     // });
//     // const result = success("HyperId Details", hyperIdDetails);
//     // return res.json(result);

//   } catch (err) {
//     console.log({ err });
//     let response = internalError();
//     return res.json(response);
//   }
// });

router.get("/transactionDetails", async (req, res) => {
  // let page = parseInt(req.body.page) || 1;
  // let limit = parseInt(req.body.limit) || 10;
  // let sortBy = req.body.sortBy || ""; //low or high
  // let searchKey = req.body.searchKey || "";
  // const skip = (page - 1) * limit;
  // if (searchKey != "") {
  //   searchFilter.productName = { $regex: new RegExp(searchKey, "i") };
  // }
  try {
    const pipeline = [
      // { $skip: skip },
      {
        $project: {
          userId: 1,
          transferTotal: {
            $cond: {
              if: { $isArray: "$transferDetails" },
              then: {
                $sum: {
                  $map: {
                    input: "$transferDetails",
                    as: "td",
                    in: { $toInt: "$$td.count" }
                  }
                }
              },
              else: 0 // If transferDetails is not an array, set total to 0
            }
          },
          sellingTotal: {
            $cond: {
              if: { $isArray: "$sellingDetails" },
              then: {
                $sum: {
                  $map: {
                    input: "$sellingDetails",
                    as: "sd",
                    in: { $toInt: "$$sd.count" }
                  }
                }
              },
              else: 0 // If sellingDetails is not an array, set total to 0
            }
          },
          mintingdetails: {
            $cond: {
              if: { $isArray: "$mintingdetails" },
              then: {
                $sum: {
                  $map: {
                    input: "$mintingdetails",
                    as: "md",
                    in: { $toInt: "$$md.count" }
                  }
                }
              },
              else: 0 // If sellingDetails is not an array, set total to 0
            }
          },
          signupDetails: "$signupDetails",
          WalletDetails: "$WalletDetails",
          smartcontractDetails: "$smartcontractDetails"
        }
      }
      // {
      //   $limit: limit // Limit the results to 10 documents
      // }
    ];
    console.log("pipeline", pipeline);
    usertransactionModel
      .aggregate(pipeline)
      .then((result) => {
        if (result.length > 0) {
          let finalResult = [];
          console.log("Transaction Details:", result);
          if (result.length != 0) {
            let i = 0;
            result.forEach((element) => {
              i++;
              var common_value = 0;
              var points = 0;
              if (JSON.stringify(element.signupDetails) != "{}") {
                points = points + Account_Creation;
                common_value = common_value + 1;
              }

              if (element.mintingdetails != 0) {
                points = points + element.mintingdetails * Minting;
                common_value = common_value + 1;
              }
              if (element.transferTotal != 0) {
                points = points + element.transferTotal * Buy_Item;
                common_value = common_value + 1;
              }
              if (element.sellingTotal != 0) {
                points = points + element.sellingTotal * Sell_Item;
                common_value = common_value + 1;
              }

              if (common_value >= 2) {
                points = points + Merchat_Badge;
              }
              var user = {
                Rank: i,
                Name: element.signupDetails?.name
                  ? element.signupDetails?.name
                  : element.signupDetails.userName,
                "TestStream Points Earned": points
              };
              // var user = { "Rank": i, "Name": (element.signupDetails?.name ? element.signupDetails?.name : element.signupDetails.userName), "TestStream Points Earned": points }
              // var user = { "userID": element.userId, "name": (element.signupDetails?.name ? element.signupDetails?.name : element.signupDetails.userName), "points": points, "minting_points": mintingdetails_value, "buying_points": transferTotal_value, "selling_points": sellingTotal_value, "signup_points": singnup }
              console.log("user", user);
              finalResult.push(user);
            });
          }
          finalResult.sort((a, b) => b.points - a.points);
          // const filteredResult = finalResult.filter(user => user.name === "Viky123");
          // var finalresponse = { "data": finalResult, "totalPages": finalResult?.length };
          var finalresponse = finalResult;

          res.json(finalresponse);
        } else {
          console.log("No documents found.");
          res.status(404).json({ message: "No documents found." });
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal server error" });
      });
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.status(500).json(response);
  }
});
router.post("/transactionDetail", async (req, res) => {
  try {
    const pipeline = [
      {
        $project: {
          userId: 1,
          transferTotal: {
            $cond: {
              if: { $isArray: "$transferDetails" },
              then: {
                $sum: {
                  $map: {
                    input: "$transferDetails",
                    as: "td",
                    in: { $toInt: "$$td.count" }
                  }
                }
              },
              else: 0 // If transferDetails is not an array, set total to 0
            }
          },
          sellingTotal: {
            $cond: {
              if: { $isArray: "$sellingDetails" },
              then: {
                $sum: {
                  $map: {
                    input: "$sellingDetails",
                    as: "sd",
                    in: { $toInt: "$$sd.count" }
                  }
                }
              },
              else: 0 // If sellingDetails is not an array, set total to 0
            }
          },
          mintingdetails: {
            $cond: {
              if: { $isArray: "$mintingdetails" },
              then: {
                $sum: {
                  $map: {
                    input: "$mintingdetails",
                    as: "md",
                    in: { $toInt: "$$md.count" }
                  }
                }
              },
              else: 0 // If sellingDetails is not an array, set total to 0
            }
          },
          signupDetails: "$signupDetails",
          WalletDetails: "$WalletDetails",
          smartcontractDetails: "$smartcontractDetails"
        }
      }
      // {
      //   $limit: limit // Limit the results to 10 documents
      // }
    ];
    // console.log("pipeline", pipeline);
    usertransactionModel
      .aggregate(pipeline)
      .then((result) => {
        if (result.length > 0) {
          let finalResult = [];
          // console.log("Transaction Details:", result);
          if (result.length != 0) {
            let i = 0;
            result.forEach((element) => {
              i++;
              var common_value = 0;
              var points = 0;
              // console.log("element", element);
              if (JSON.stringify(element.signupDetails) != "{}") {
                points = points + Account_Creation;
                common_value = common_value + 1;
              }

              if (element.mintingdetails != 0) {
                points = points + element.mintingdetails * Minting;
                common_value = common_value + 1;
              }
              // if (element.mintingdetails != 0) {
              //   points = points + (element.mintingdetails * Minting);
              //   common_value = common_value + 1;
              // }
              if (element.transferTotal != 0) {
                points = points + element.transferTotal * Buy_Item;
                common_value = common_value + 1;
              }
              if (element.sellingTotal != 0) {
                points = points + element.sellingTotal * Sell_Item;
                common_value = common_value + 1;
              }

              if (common_value >= 2) {
                points = points + Merchat_Badge;
              }
              var user = {
                rank: i,
                name: element.signupDetails?.name
                  ? element.signupDetails?.name
                  : element.signupDetails.userName,
                points: points
              };
              console.log("user", user);
              finalResult.push(user);
            });
          }
          finalResult.sort((a, b) => b.points - a.points);
          // const filteredResult = finalResult.filter(user => user.name === "Viky123");
          var finalresponse = {
            draw: req.body.draw,
            recordsFiltered: finalResult?.length,
            recordsTotal: finalResult?.length,
            data: finalResult
          };
          // var finalresponse = finalResult;

          console.log("finalresponse", finalresponse);

          res.json(finalresponse);
        } else {
          console.log("No documents found.");
          res.status(404).json({ message: "No documents found." });
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal server error" });
      });
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.status(500).json(response);
  }
});

router.post("/transactionDetails1", async (req, res) => {
  try {
    const pipeline = [
      // { $skip: skip },
      {
        $project: {
          userId: 1,
          transferTotal: {
            $cond: {
              if: { $isArray: "$transferDetails" },
              then: {
                $sum: {
                  $map: {
                    input: "$transferDetails",
                    as: "td",
                    in: { $toInt: "$$td.count" }
                  }
                }
              },
              else: 0 // If transferDetails is not an array, set total to 0
            }
          },
          sellingTotal: {
            $cond: {
              if: { $isArray: "$sellingDetails" },
              then: {
                $sum: {
                  $map: {
                    input: "$sellingDetails",
                    as: "sd",
                    in: { $toInt: "$$sd.count" }
                  }
                }
              },
              else: 0 // If sellingDetails is not an array, set total to 0
            }
          },
          mintingdetails: {
            $cond: {
              if: { $isArray: "$mintingdetails" },
              then: {
                $sum: {
                  $map: {
                    input: "$mintingdetails",
                    as: "md",
                    in: { $toInt: "$$md.count" }
                  }
                }
              },
              else: 0 // If sellingDetails is not an array, set total to 0
            }
          },
          signupDetails: "$signupDetails",
          WalletDetails: "$WalletDetails",
          smartcontractDetails: "$smartcontractDetails",
          points: "$points"
        }
      }
      // {
      //   $limit: limit // Limit the results to 10 documents
      // }
    ];

    usertransactionModel
      .aggregate(pipeline)
      .then((result) => {
        if (result.length > 0) {
          let finalResult = [];
          if (result.length != 0) {
            result.forEach(async (element) => {
              var mintingdetails_value = 0;
              var transferTotal_value = 0;
              var sellingTotal_value = 0;
              var singnup = 0;
              if (JSON.stringify(element.signupDetails) != "{}") {
                singnup = Account_Creation;
              }

              if (element.mintingdetails != 0) {
                mintingdetails_value = element.mintingdetails * Minting;
              }
              if (element.transferTotal != 0) {
                transferTotal_value = element.transferTotal * Buy_Item;
              }
              if (element.sellingTotal != 0) {
                sellingTotal_value = element.sellingTotal * Sell_Item;
              }
              var user = {
                userID: element.userId,
                name: element.signupDetails?.name
                  ? element.signupDetails?.name
                  : element.signupDetails.userName,
                points: element.points,
                minting_points: mintingdetails_value,
                buying_points: transferTotal_value,
                selling_points: sellingTotal_value,
                signup_points: singnup
              };

              finalResult.push(user);
            });
          }
          finalResult.sort((a, b) => b.points - a.points);
          let currentRank = 1;
          for (let i = 0; i < finalResult.length; i++) {
            currentRank = i + 1;
            finalResult[i].rank = currentRank;
          }

          const bulkOps = finalResult.map((user) => {
            return {
              updateOne: {
                filter: { userID: user.userID },
                update: { $set: user },
                upsert: true
              }
            };
          });

          UserRewards.bulkWrite(bulkOps)
            .then(() => {
              res.json(finalResult);
            })
            .catch((bulkWriteError) => {
              console.error("Error during bulk write:", bulkWriteError);
              res.status(500).json({
                error: "Internal server error while upserting sorted transactions"
              });
            });
        } else {
          console.log("No documents found.");
          res.status(404).json({ message: "No documents found." });
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal server error" });
      });
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.status(500).json(response);
  }
});

router.get("/leaderboard", async (req, res) => {
  console.log("Received query parameters:", req.query);

  try {
    const searchValue = req.query.searchvalue;
    const page = parseInt(req.query.page, 10) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit, 10) || 10; // Default to 10 items per page if not provided

    console.log("Search Value:", searchValue);
    console.log("Page:", page);
    console.log("Limit:", limit);

    let query = {};

    if (searchValue && searchValue.trim() !== "") {
      const searchValueNumber = parseInt(searchValue, 10);
      const isNumber = !isNaN(searchValueNumber);
      console.log("Is search value a number:", isNumber);

      query = {
        $or: [{ name: { $regex: searchValue, $options: "i" } }]
      };

      if (isNumber) {
        query.$or.push({ points: searchValueNumber });
      }
    }

    const skip = (page - 1) * limit; // Calculate the number of documents to skip

    UserRewards.find(query)
      .select("name points rank")
      .skip(skip)
      .limit(limit)
      .then((results) => {
        console.log("Search results:", results);
        const result = success("Stream list retrieval success", results);
        return res.json(result);
      })
      .catch((error) => {
        console.error("Error during search:", error);
        let response = internalError();
        return res.json(response);
      });
  } catch (err) {
    console.log("Caught error:", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/leaderboards", async (req, res) => {
  console.log("Received query parameters:", req.query);

  try {
    const searchValue = req.body.search?.value || "";
    const page = parseInt(req.body.page, 10) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.body.length, 10) || 10; // Default to 10 items per page if not provided

    console.log("Search Value:", searchValue);
    console.log("Page:", page);
    console.log("Limit:", limit);

    let query = {};

    if (searchValue && searchValue.trim() !== "") {
      const searchValueNumber = parseInt(searchValue, 10);
      const isNumber = !isNaN(searchValueNumber);
      console.log("Is search value a number:", isNumber);

      query = {
        $or: [{ name: { $regex: searchValue, $options: "i" } }]
      };

      if (isNumber) {
        query.$or.push({ points: searchValueNumber });
      }
    }

    const skip = (page - 1) * limit; // Calculate the number of documents to skip
    const totalItems = await UserRewards.countDocuments(query);
    console.log("totalItems", totalItems);
    UserRewards.find(query)
      .select("-_id name points rank")
      .skip(skip)
      .limit(limit)
      .sort({ rank: -1 })
      .then((results) => {
        console.log("Search results:", results);
        let finalResult = [];
        if (results.length != 0) {
          results.forEach((element) => {
            console.log("element", element);
            var user = { rank: element.rank, name: element.name, points: element.points };
            finalResult.push(user);
          });
        }
        var finalresponse = {
          draw: req.body.draw,
          recordsTotal: results?.length,
          recordsFiltered: totalItems,
          data: finalResult
        };
        // // const result = success("Stream list retrieval success", results);
        console.log("finalresponse", finalresponse);
        return res.json(finalresponse);
      })
      .catch((error) => {
        console.error("Error during search:", error);
        let response = internalError();
        return res.json(response);
      });
  } catch (err) {
    console.log("Caught error:", err);
    let response = internalError();
    return res.json(response);
  }
});

router.get("/points", async (req, res) => {
  try {
    const result = await usertransactionModel.find();

    if (result.length === 0) {
      return res.status(404).json({ message: "No documents found." });
    }

    for (const element of result) {
      const userId = element.userId;

      const params = {
        action: "get_user_profile",
        user_id: userId
      };

      try {
        const apiResponse = await callAPI(params);

        const updatedData = apiResponse.data;

        console.log(updatedData[0].campaign_xp);

        await usertransactionModel.updateOne(
          { userId: userId },
          { $set: { points: updatedData[0].campaign_xp } }
        );
      } catch (apiError) {
        console.error(`Error calling API for userId ${userId}:`, apiError);
      }
    }

    // Return a success response
    return res.json({ message: "Documents updated successfully." });
  } catch (error) {
    // Handle any errors that occur during the fetch or update operations
    console.error("Error fetching user transactions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/individualpoints", async (req, res) => {
  try {
    const userId = req.query.userId;

    const params = {
      action: "get_user_profile",
      user_id: userId
    };

    try {
      console.log("params", params);
      const apiResponse = await callAPI(params);

      const updatedData = apiResponse.data;

      // console.log("apiResponse", updatedData[0].campaign_xp);

      // return false;
      await usertransactionModel.updateOne(
        { userId: userId },
        { $set: { points: updatedData[0].campaign_xp } }
      );
    } catch (apiError) {
      console.error(`Error calling API for userId ${userId}:`, apiError);
    }

    // Return a success response
    return res.json({ message: "Documents updated successfully." });
  } catch (error) {
    // Handle any errors that occur during the fetch or update operations
    console.error("Error fetching user transactions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

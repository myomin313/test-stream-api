require("dotenv").config();
const express = require("express");
const router = express.Router();
const {
  fileExport,
  ImageDetails,
  fileExport_chat
} = require("../commonFunctions/fileupload");
const {
  success,
  error,
  internalError,
  requiredParams
} = require("../commonFunctions/responses");
const { createCanvas, loadImage } = require("canvas");
var imageThumbnail = require("image-thumbnail");
const FormData = require("form-data");
const axios = require("axios");
const AWS = require("aws-sdk");
const path = require("path");

const StreamImagesModel = require("../models/streamcommentImagesModel");
const ProductModel = require("../models/productModel");

const PINATA_API_KEY = process.env.PINATA_API_KEY || "";
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY || "";
const PINATA_UPLOAD_ENDPOINT = process.env.PINATA_UPLOAD_ENDPOINT || "";


let s3fileurl = "";
let bucketName = "";



router.get("/", (req, res) => {
  console.log("reached endpoint /file");
  return res.json({ status: "file upload api" });
});

router.post("/upload", async (req, res) => {
  console.log("single file upload api called ", req.files);
  try {
    if (req.files) {
      console.log("start :", new Date(Date.now()));
      let file = req.files.document;
      let response = await fileExport(file);
      console.log({ response });
      if (response.status == "success") {
        let { Location, key } = response.result;
        let result = { Location, key };
        console.log("end :", new Date(Date.now()));
        let finalRes = success("file upload success", result);
        return res.json(finalRes);
      } else {
        let result = error("file upload failed", "file_upload_error");
        return res.json(result);
      }
    } else {
      console.log("file not available");
      let response = requiredParams(["document"]);
      return res.json(response);
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

router.post("/reelsUpload", async (req, res) => {
  console.log("single file upload api called ", req.files);
  try {
    if (req.files) {
      console.log("start :", new Date(Date.now()));
      let file = req.files.document;
      let response = await fileExport(file);
      console.log({ response });
      if (response.status == "success") {
        let { Location, key } = response.result;
        let result = { Location, key };
        console.log("end :", new Date(Date.now()));
        let finalRes = success("file upload success", result);
        return res.json(finalRes);
      } else {
        let result = error("file upload failed", "file_upload_error");
        return res.json(result);
      }
    } else {
      console.log("file not available");
      let response = requiredParams(["document"]);
      return res.json(response);
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

router.post("/upload_chat", async (req, res) => {
  console.log("single file upload api called ", req.files);
  try {
    if (req.files) {
      console.log("start :", new Date(Date.now()));
      let file = req.files.document;
      let response = await fileExport_chat(file);
      console.log({ response });
      if (response.status == "success") {
        let { Location, key } = response.result;
        let streamImg = new StreamImagesModel({
          url: Location,
          key: key,
          userId: req?.body?.userID
        });
        let streamImgresult = await streamImg.save();
        let result = { Location, key };
        console.log("end :", new Date(Date.now()));
        // let streamImg = new StreamImages({
        //   url: Location,
        //   key: key,
        //   userId: req?.body?.userID
        // });
        // let streamImgresult = await streamImg.save();
        console.log("streamImgresult", streamImgresult);
        let finalRes = success("file upload success", result);
        return res.json(finalRes);
      } else {
        let result = error("file upload failed", "file_upload_error");
        return res.json(result);
      }
    } else {
      console.log("file not available");
      let response = requiredParams(["document"]);
      return res.json(response);
    }
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

// const PINATA_API_KEY = process.env.PINATA_API_KEY;
// const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
// const PINATA_UPLOAD_ENDPOINT = process.env.PINATA_UPLOAD_ENDPOINT;

const watermarkColor = "#000000";
const watermarkSize = 10;
const watermarkXPercent = 0.5;
const watermarkYPercent = 0.9;
const watermarkOpacity = 0.05;

async function addWatermark(buffer, watermarkText) {
  try {
    console.log("watermarkText", watermarkText);
    console.log("welcome to try block");
    const image = await loadImage(buffer);
    console.log("image", image);
    const canvas = createCanvas(image.width, image.height);
    console.log("canvas", canvas);
    const ctx = canvas.getContext("2d");
    console.log("ctx", ctx);

    ctx.drawImage(image, 0, 0);
    ctx.font = `${watermarkSize}px`;
    ctx.fillStyle = watermarkColor;
    ctx.globalAlpha = watermarkOpacity;

    const watermarkX = Math.floor(image.width * watermarkXPercent);
    console.log("watermarkX", watermarkX);
    const watermarkY = Math.floor(image.height * watermarkYPercent);
    console.log("watermarkY", watermarkY);
    ctx.fillText(watermarkText, watermarkX, watermarkY);
    ctx.globalAlpha = 1.0;

    return canvas.toBuffer();
  } catch (error) {
    console.error("Error in addWatermark:", error);
    throw error;
  }
}

router.post("/asset_upload", async (req, res) => {
  try {
    if (req.files && req.body.count) {
      console.log("is available");
      let file = req.files.file;
      console.log("file", file);
      let count = parseInt(req.body.count, 10);
      console.log("count", count);

      const uploadedFiles = [];
      for (let i = 0; i < count; i++) {
        console.log("Inside the loop");
        const currentTimeUnixTimestamp = Math.floor(Date.now() / 1000) + i;
        console.log("currentTimeUnixTimestamp", currentTimeUnixTimestamp);
        const watermarkText = currentTimeUnixTimestamp.toString();
        console.log("watermarkText", watermarkText);

        // Ensure the buffer is correctly handled
        const watermarkedBuffer = await addWatermark(file.data, watermarkText);
        console.log("watermarkedBuffer created");

        const uniqueFilename = `${file.name.split(".")[0]}_${Date.now()}_${i}.${file.name.split(".")[1]}`;
        console.log("uniqueFilename", uniqueFilename);

        const formData = new FormData();
        formData.append("file", watermarkedBuffer, {
          filename: uniqueFilename,
          contentType: file.mimetype
        });

        const headers = {
          "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY
        };

        const response = await axios.post(PINATA_UPLOAD_ENDPOINT, formData, { headers });

        if (response.status === 200) {
          uploadedFiles.push(`https://ipfs.io/ipfs/${response.data.IpfsHash}`);
        } else {
          console.error("Failed to upload file to Pinata:", response.data);
          return res.status(500).json({ message: "Failed to upload file to Pinata" });
        }
      }
      let result = success("file upload success", { Location: uploadedFiles });
      return res.json(result);
    } else {
      return res.json({ File: " Files or count not provided" });
    }
  } catch (err) {
    console.log(err);
    return res.json({ message: "Internal server error" });
  }
});

router.post("/upload/multiple", async (req, res) => {
  console.log("file upload api called");

  try {
    let files = req.files.document;

    let totalImageUploads = [];
    let totalImageUploadedthumbnail = [];
    let finalUploadedDetails = [];

    files = Array.isArray(files) ? files : [files];

    console.log("file fileoperation", files);

    for (let file of files) {
      let response = await fileExport(file);
      console.log({ response });
      if (response.status == "success") {
        console.log("testing", response.result);
        var url = response.result.Location;
        console.log("url", response.result.Location);
        const filename = url.split("/").pop();
        // Extract extension using path module
        const extension = path.extname(filename);
        console.log("extension", extension);
        if (
          extension.toLowerCase().trim() === ".jpeg" ||
          extension.toLowerCase().trim() === ".jpg" ||
          extension.toLowerCase().trim() === ".png"
        ) {
          var imgsize = await ImageDetails(url);
          let percentageratio;
          console.log("imgsize", imgsize);
          if (imgsize.width < 5000 && imgsize.width > 4000) {
            percentageratio = { percentage: 35 };
          } else if (imgsize.width < 4000 && imgsize.width > 3000) {
            percentageratio = { percentage: 36 };
          } else if (imgsize.width < 3000 && imgsize.width > 2000) {
            percentageratio = { percentage: 38 };
          } else if (imgsize.width < 2000 && imgsize.width > 1000) {
            percentageratio = { percentage: 40 };
          } else if (imgsize.width < 1000 && imgsize.width > 999) {
            percentageratio = { percentage: 45 };
          } else if (imgsize.width < 999 && imgsize.width > 500) {
            percentageratio = { percentage: 50 };
          } else if (imgsize.width < 500 && imgsize.width > 300) {
            percentageratio = { percentage: 55 };
          } else if (imgsize.width < 300 && imgsize.width > 200) {
            percentageratio = { percentage: 100 };
          } else if (imgsize.width < 200 && imgsize.width > 100) {
            percentageratio = { percentage: 100 };
          } else {
            percentageratio = { percentage: 100 };
          }
          var thumbnail_file_path = "thumbnail/" + response.result.key;
          console.log("percentageratio", percentageratio);
          imageThumbnail({ uri: url }, percentageratio)
            .then((thumbnailBuffer) => {
              // Thumbnail buffer is available here
              console.log("Thumbnail created:", thumbnailBuffer);

              var plaindbstfile = thumbnailBuffer;

              const poparams = {
                Bucket: bucketName,
                Key: thumbnail_file_path,
                // ContentType: contentType,
                ACL: "public-read",
                Body: plaindbstfile
              };
              s3.putObject(poparams, function (poerr, podata) {
                if (poerr) {
                  // logger.log(poerr);
                  // console.log("putObject error: ", poerr);
                  // error.max_size(server);
                  return;
                } else {
                  console.log("putObject Buffer", podata);
                }
              });
            })
            .catch((err) => {
              console.error("Error creating thumbnail:", err);
            });
          var thumbnailurl = s3fileurl + bucketName + "/" + thumbnail_file_path;
          totalImageUploadedthumbnail.push(thumbnailurl);
        }

        let { Location } = response.result;
        totalImageUploads.push(Location);
      }
    }
    finalUploadedDetails.push(totalImageUploads);
    finalUploadedDetails.push(totalImageUploadedthumbnail);
    console.log("totalImageUploadedthumbnail", totalImageUploadedthumbnail);
    console.log("finalUploadedDetails", finalUploadedDetails);
    let finalRes = success("file upload success", finalUploadedDetails);
    return res.json(finalRes);
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

router.post("/upload/multiple_thumb", async (req, res) => {
  console.log("file upload api called");

  try {
    let totalImageUploads = [];
    let totalImageUploadedthumbnail = [];
    let finalUploadedDetails = [];

    const products = await ProductModel.find({ productStatus: "live" })
      .select("productImages productThumnail productOwner")
      .exec();
    console.log("products", products);
    products.forEach(async (element) => {
      let totalImageUploadedthumbnail = [];
      console.log("Images", element.productImages[0]);
      var url = element.productImages[0];
      console.log("url", url);
      const filename = url.split("/").pop();
      console.log("filename", filename);
      const extension = path.extname(filename);
      console.log("extension", extension);
      if (
        extension.toLowerCase().trim() === ".jpeg" ||
        extension.toLowerCase().trim() === ".jpg" ||
        extension.toLowerCase().trim() === ".png"
      ) {
        var imgsize = await ImageDetails(url);
        let percentageratio;
        console.log("imgsize", imgsize);
        if (imgsize.width < 5000 && imgsize.width > 4000) {
          percentageratio = { percentage: 25 };
        } else if (imgsize.width < 4000 && imgsize.width > 3000) {
          percentageratio = { percentage: 25 };
        } else if (imgsize.width < 3000 && imgsize.width > 2000) {
          percentageratio = { percentage: 30 };
        } else if (imgsize.width < 2000 && imgsize.width > 1000) {
          percentageratio = { percentage: 35 };
        } else if (imgsize.width < 1000 && imgsize.width > 999) {
          percentageratio = { percentage: 50 };
        } else if (imgsize.width < 999 && imgsize.width > 500) {
          percentageratio = { percentage: 45 };
        } else if (imgsize.width < 500 && imgsize.width > 300) {
          percentageratio = { percentage: 90 };
        } else if (imgsize.width < 300 && imgsize.width > 200) {
          percentageratio = { percentage: 100 };
        } else if (imgsize.width < 200 && imgsize.width > 100) {
          percentageratio = { percentage: 100 };
        } else {
          percentageratio = { percentage: 100 };
        }
        const timestampInMillis = Date.now();
        var thumbnail_file_path =
          "thumbnail/" + element.productOwner + "/" + timestampInMillis + extension;
        console.log("thumbnail_file_pat123h", thumbnail_file_path);
        console.log("percentageratio123", percentageratio);

        console.log("Timestamp in Milliseconds:", timestampInMillis);
        imageThumbnail({ uri: url }, percentageratio)
          .then((thumbnailBuffer) => {
            // Thumbnail buffer is available here
            console.log("Thumbnail created:", thumbnailBuffer);

            var plaindbstfile = thumbnailBuffer;
            console.log("plaindbstfile", plaindbstfile);
            const poparams = {
              Bucket: bucketName,
              Key: thumbnail_file_path,
              ACL: "public-read",
              Body: plaindbstfile
            };
            console.log("poparams", poparams);
            s3.putObject(poparams, function (poerr, podata) {
              if (poerr) {
                return;
              } else {
                console.log("putObject Buffer", podata);
              }
            });
          })
          .catch((err) => {
            console.error("Error creating thumbnail:", err);
          });
        var thumbnailurl = s3fileurl + bucketName + "/" + thumbnail_file_path;
        totalImageUploadedthumbnail.push(thumbnailurl);
        console.log("totalImageUploadedthumbnail", totalImageUploadedthumbnail);
        const filter = { _id: element?._id };
        const update = {
          productThumnail: totalImageUploadedthumbnail
        };
        await ProductModel.findOneAndUpdate(filter, update);
      }
    });

    finalUploadedDetails.push(totalImageUploads);
    finalUploadedDetails.push(totalImageUploadedthumbnail);
    console.log("totalImageUploadedthumbnail", totalImageUploadedthumbnail);
    console.log("finalUploadedDetails", finalUploadedDetails);
    // await sleep(1500); // Sleep for 1 second
  } catch (err) {
    console.log({ err });
    let response = internalError();
    return res.json(response);
  }
});

// async function compressAndUploadImage(originalImagePath, objectKey) {
//   try {
//     // Read the image using Sharp
//     const imageData = await sharp(originalImagePath)
//       .jpeg({ quality: 80 }) // Adjust quality as needed (1-100)
//       .toBuffer();

//     // Create a PutObjectCommand object
//     const putObjectCommand = new PutObjectCommand({
//       Bucket: bucketName,
//       Key: objectKey,
//       Body: imageData,
//       ContentType: "image/jpeg" // Adjust based on image format
//     });

//     // Upload the compressed image to S3
//     await s3Client.send(putObjectCommand);
//     console.log(`Image uploaded to S3: ${objectKey}`);
//   } catch (error) {
//     console.error(error);
//   }
// }

module.exports = router;

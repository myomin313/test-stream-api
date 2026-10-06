const express = require("express");
const router = express.Router();
const ffmpegPath = '/usr/local/bin/ffmpeg';  // Set the correct path to ffmpeg
const ffmpeg = require('fluent-ffmpeg');
const axios = require("axios");
ffmpeg.setFfmpegPath(ffmpegPath);
const sharp = require('sharp');
console.log({ ffmpeg });
const fs = require('fs');
const { checkRequiredFields } = require("../commonFunctions/validate");
const {
  success,
  error,
  requiredParams,
  internalError
} = require("../commonFunctions/responses");
const { fileExport_game, ImageDetails } = require("../commonFunctions/fileupload");
var imageThumbnail = require("image-thumbnail");
const UserModel = require("../models/userModel");
const gamesModel = require("../models/gmsModel");
const streamModel = require("../models/smModel");
const path = require("path");
const AWS = require("aws-sdk");

const config = require("../config");
const { callAPI, getSecretValue } = require("../commonFunctions/apihelper");
const bucketNames = "TestStream-staging-bucket";
const s3fileurl = "";
const secretName = config.secretNames[config.env];

const downloadFromS3 = async (key, downloadPath, bucketName) => {
  const secretValue = await getSecretValue(secretName);
  const bucket = secretValue.S3_BUCKET;
  const keys = decodeURIComponent(key);
  console.log({ keys });
  const params = { Bucket: bucket, Key: keys };
  console.log({ params });
  const file = fs.createWriteStream(downloadPath);
  return new Promise((resolve, reject) => {
    s3.getObject(params)
      .createReadStream()
      .pipe(file)
      .on('finish', () => resolve(downloadPath))
      .on('error', (err) => reject(err));
  });
};

const processVideo = async (inputPath, outputPath, thumbnailPath, bucketName) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      // Video compression (set bitrate and quality)
      .videoBitrate('800k')
      .size('1280x720') // Resize video to 720p
      .output(outputPath)

      // Thumbnail generation at 5 seconds
      .on('end', () => resolve({ outputPath, thumbnailPath }))
      .on('error', (err) => reject(err))
      .screenshots({
        timestamps: ['5'],
        filename: path.basename(thumbnailPath),
        folder: path.dirname(thumbnailPath),
        size: '400x400',
      });
  });
};

const uploadToS3 = async (filePath, key, bucketName) => {
  const secretValue = await getSecretValue(secretName);
  const bucket = secretValue.S3_BUCKET;
  const params = {
    Bucket: bucket,
    Key: key,
    Body: fs.createReadStream(filePath),
    ACL: 'public-read'
  };
  return s3.upload(params).promise();
};

function getBucketNameFromS3Url(url) {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname === 's3.amazonaws.com') {
      // Format 1
      return url.split('/')[3];
    } else if (urlObj.hostname.includes('s3.amazonaws.com')) {
      // Format 2
      return urlObj.hostname.split('.s3.amazonaws.com')[0];
    } else if (urlObj.hostname.includes('.s3.') && urlObj.hostname.endsWith('.amazonaws.com')) {
      // Format 3
      return urlObj.hostname.split('.s3.')[0];
    } else if (urlObj.hostname.startsWith('s3.') && urlObj.hostname.endsWith('.amazonaws.com')) {
      // Format 4
      return url.split('/')[3];
    }

    return null;
  } catch (error) {
    console.error('Error parsing S3 URL:', error);
    return null;
  }
}
router.post("/stream/details", async (req, res) => {
  try {
    let requiredFields = ["streamingId", "userId"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const { userId, streamingId } = req.body;
      console.log("userId", userId);
      let streamInfo = await streamModel.findOne({ _id: streamingId }).exec();
      console.log({ streamInfo });
      let userInfo = await UserModel.findOne({ _id: userId }, "role").exec();
      console.log("streamInfos", streamInfo?.video);
      let checkdata = getBucketNameFromS3Url(streamInfo?.video);
      console.log({ checkdata });
      const fileName = streamInfo?.video.split('/').pop();
      const s3VideoKey = fileName;
      const fileCheck = streamInfo?.video.split('/').pop();
      console.log({ fileName });
      console.log({ fileCheck });
      const compressedKey = "reel_stag/" + streamingId + "/compressed_files/" + fileName;
      const thumbnailKey = "reel_stag/" + streamingId + "/thumbnail/thumbnail.jpg";
      const s3url = "https://TestStream-staging-bucket.s3.us-west-1.amazonaws.com/reel_stag/" + fileCheck;
      console.log({ s3url });
      // try {
      //   // Download input file
      //   const inputParams = {
      //     Bucket: bucketName,
      //     Key: s3VideoKey
      //   };
      //   const inputData = await s3.getObject(inputParams).promise();

      //   // Generate thumbnail (works best with image files)
      //   const thumbnailBuffer = await sharp(inputData.Body)
      //     .resize(320, 240, {
      //       fit: sharp.fit.inside,
      //       withoutEnlargement: true
      //     })
      //     .toBuffer();

      //   // Upload thumbnail
      //   const thumbnailParams = {
      //     Bucket: outputBucket,
      //     Key: streamingId + `thumbnails/${s3VideoKey.split('/').pop()}.jpg`,
      //     Body: thumbnailBuffer,
      //     ContentType: 'image/jpeg'
      //   };
      //   await s3.upload(thumbnailParams).promise();
      //   console.log({ thumbnailParams });
      //   return thumbnailParams.Key;
      // } catch (error) {
      //   console.error('Error processing thumbnail:', error);
      //   throw error;
      // }

      const localVideoPath = '/tmp/input-video.mp4';
      const localCompressedPath = '/tmp/compressed-video.mp4';
      const localThumbnailPath = '/tmp/thumbnail.jpg';


      if (userInfo) {
        if (streamInfo) {
          try {
            console.log('Downloading video from S3...');
            await downloadFromS3(s3VideoKey, localVideoPath, checkdata);

            console.log('Compressing video and generating thumbnail...');
            await processVideo(localVideoPath, localCompressedPath, localThumbnailPath, checkdata);

            console.log('Uploading compressed video...');
            let video_url = await uploadToS3(localCompressedPath, compressedKey, checkdata);
            console.log({ video_url });
            console.log('Uploading thumbnail image...');
            let thubnail_url = await uploadToS3(localThumbnailPath, thumbnailKey, checkdata);
            console.log({ thubnail_url });
            // console.log('Video compression and thumbnail generation completed successfully.');
            const filter = { _id: streamingId };
            let streamModelval = {
              video_url: video_url?.Location,
              thumbnail_url: thubnail_url?.Location,
              video: s3url
            };
            await streamModel.findOneAndUpdate(filter, streamModelval);
          } catch (error) {
            console.error('Error processing video:', error);
          } finally {
            // Clean up temporary files
            fs.unlinkSync(localVideoPath);
            fs.unlinkSync(localCompressedPath);
            fs.unlinkSync(localThumbnailPath);
          }
          let results = success("stream details", { stream_details: streamInfo });
          return res.json(results);
        } else {
          let result = error("streaming id not found", "streming_id_not_found");
          return res.json(result);
        }
      } else {
        let result = error("user id not found", "user_id_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/compress", async (req, res) => {
  try {
    let requiredFields = ["stream_id"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const { game_id } = req.body;
      let gameInfo = await gamesModel.findOne({ _id: game_id }).exec();
      if (gameInfo) {
        const filter = { _id: game_id };
        if (!req.files || req.files.length === 0) {
          let gamesModelval = {
            game_status: "0"
          };
          await gamesModel.findOneAndUpdate(filter, gamesModelval);
          let results = success("game details deleted", "");
          return res.json(results);
        }
      } else {
        let result = error("game id not found", "game_id_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/thumbnail", async (req, res) => {
  const secretValue = await getSecretValue(secretName);
  const bucket = secretValue.S3_BUCKET;
  console.log({ bucket });
  const videoUrl = req.body.videoUrl;
  const bucketName = bucketNames;
  var keypath;
  if (config.env === "development") {
    keypath = "reels_dev";
  } else if (config.env === "staging") {
    keypath = "reel_stag";
  } else if (config.env === "production") {
    keypath = "reels_production";
  }
  // const thumbnailKey = "reel_stag/" + streamingId + "/thumbnail/thumbnail.jpg";
  const thumbnailKey = keypath + "/thumbnails/thumbnail.jpg"; // Key (path) for the thumbnail in S3

  try {
    // Download the video locally (if it's a remote URL)
    // const videoPath = path.join(__dirname, "temp_video.mp4");
    const videoPath = path.join("/tmp", "temp_video.mp4");
    const outputPath = `/tmp/thumb-${Date.now()}.jpg`;
    const response = await axios({
      url: videoUrl,
      method: "GET",
      responseType: "stream",
    });

    const writer = fs.createWriteStream(videoPath);
    response.data.pipe(writer);

    writer.on("finish", () => {
      const thumbnailPath = path.join("/tmp", "thumbnail.jpg");
      // const thumbnailPath = path.join("/tmp", "thumbnail.jpg");
      ffmpeg(videoPath)
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          // reject(err);
        })
        .screenshots({
          timestamps: ['00:00:01'], // Take screenshot at 1 second
          filename: 'thumbnail.jpg', // Ensure consistent filename
          folder: path.dirname(thumbnailPath), // Match the folder
          size: '320x240'
        })
        .on('end', async () => {
          console.log('Thumbnail generated successfully');
          const fileStream = fs.createReadStream(thumbnailPath);

          // Upload the thumbnail to S3
          const params = {
            Bucket: bucket,
            Key: thumbnailKey,
            Body: fileStream,
            ContentType: "image/jpeg", // MIME type
            ACL: 'public-read'
          };

          try {
            const uploadResult = await s3.upload(params).promise();
            console.log("Thumbnail uploaded to S3:", uploadResult.Location);

            // Send the S3 URL as the response
            let results = success("stream details", {
              message: "Thumbnail created and uploaded to S3",
              thumbnailUrl: uploadResult.Location,
            });
            return res.json(results);
          } catch (err) {
            console.error("Error uploading to S3:", err);
            res.status(500).send("Failed to upload thumbnail to S3");
          } finally {
            // Clean up temporary files
            fs.unlinkSync(videoPath);
            fs.unlinkSync(thumbnailPath);
          }
        });

      // ffmpeg(videoPath)
      //   .on('error', (err) => {
      //     console.error('FFmpeg error:', err);
      //     reject(err);
      //   })
      //   .screenshots({
      //     timestamps: ['00:00:01'], // Take screenshot at 1 second
      //     filename: path.basename(outputPath),
      //     folder: path.dirname(outputPath),
      //     size: '320x240'
      //   })
      //   .on('end', async () => {
      //     console.log('Thumbnail generated successfully');
      //     const fileStream = fs.createReadStream(thumbnailPath);

      //     // Upload the thumbnail to S3
      //     const params = {
      //       Bucket: bucketName,
      //       Key: thumbnailKey,
      //       Body: fileStream,
      //       ContentType: "image/jpeg", // MIME type
      //     };

      //     try {
      //       const uploadResult = await s3.upload(params).promise();
      //       console.log("Thumbnail uploaded to S3:", uploadResult.Location);

      //       // Send the S3 URL as the response
      //       res.json({
      //         message: "Thumbnail created and uploaded to S3",
      //         thumbnailUrl: uploadResult.Location,
      //       });
      //     } catch (err) {
      //       console.error("Error uploading to S3:", err);
      //       res.status(500).send("Failed to upload thumbnail to S3");
      //     } finally {
      //       // Clean up temporary files
      //       fs.unlinkSync(videoPath);
      //       fs.unlinkSync(thumbnailPath);
      //     }
      //   });

    });

    writer.on("error", (err) => {
      console.error("Error downloading video:", err);
      res.status(500).send("Failed to download video");
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("An error occurred");
  }
});

router.post("/create", async (req, res) => {
  try {
    let requiredFields = ["game_name"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const { game_name, description } = req.body;
      if (!req.files || req.files.length === 0) {
        let result = error("No files uploaded.", "no_files");
        return res.json(result);
      } else {
        let file = req.files.file;
        let response = await fileExport_game(file);
        console.log({ response });
        if (response.status == "success") {
          var url = response.result.Location;
          const filename = url.split("/").pop();
          const extension = path.extname(filename);
          if (
            extension.toLowerCase().trim() === ".jpeg" ||
            extension.toLowerCase().trim() === ".jpg" ||
            extension.toLowerCase().trim() === ".png"
          ) {
            var imgsize = await ImageDetails(url);
            let percentageratio;
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
            var thumbnail_file_path = "game_thumbnail/" + response.result.key;
            imageThumbnail({ uri: url }, percentageratio)
              .then((thumbnailBuffer) => {
                var plaindbstfile = thumbnailBuffer;
                const poparams = {
                  Bucket: bucketName,
                  Key: thumbnail_file_path,
                  ACL: "public-read",
                  Body: plaindbstfile
                };
                s3.putObject(poparams, function (poerr, podata) {
                  if (poerr) {
                    // logger.log(poerr);
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
            const secretValue = await getSecretValue(secretName);
            var thumbnailurl = secretValue.S3_BUCKET_URL + thumbnail_file_path;
            let gamesModelval = new gamesModel({
              game_name: game_name,
              description: description,
              file_url: url,
              thumbnail_url: thumbnailurl
            });
            let streamresult = await gamesModelval.save();
            let results = success("game details added", streamresult);
            return res.json(results);
          }
        }
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/update", async (req, res) => {
  try {
    let requiredFields = ["game_name", "game_id"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const { game_name, description, game_id } = req.body;
      let gameInfo = await gamesModel.findOne({ _id: game_id }).exec();
      if (gameInfo) {
        const filter = { _id: game_id };
        if (!req.files || req.files.length === 0) {
          let gamesModelval = {
            game_name: game_name,
            description: description
          };
          let streamresult = await gamesModel.findOneAndUpdate(filter, gamesModelval);
          let results = success("game details updated", streamresult);
          return res.json(results);
        } else {
          let file = req.files.file;
          let response = await fileExport_game(file);
          if (response.status == "success") {
            var url = response.result.Location;
            const filename = url.split("/").pop();
            const extension = path.extname(filename);
            if (
              extension.toLowerCase().trim() === ".jpeg" ||
              extension.toLowerCase().trim() === ".jpg" ||
              extension.toLowerCase().trim() === ".png"
            ) {
              var imgsize = await ImageDetails(url);
              let percentageratio;
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
              var thumbnail_file_path = "game_thumbnail/" + response.result.key;
              console.log("percentageratio", percentageratio);
              imageThumbnail({ uri: url }, percentageratio)
                .then((thumbnailBuffer) => {
                  var plaindbstfile = thumbnailBuffer;
                  const poparams = {
                    Bucket: bucketName,
                    Key: thumbnail_file_path,
                    ACL: "public-read",
                    Body: plaindbstfile
                  };
                  s3.putObject(poparams, function (poerr, podata) {
                    if (poerr) {
                      // logger.log(poerr);
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
              let gamesModelval = {
                game_name: game_name,
                description: description,
                file_url: url,
                thumbnail_url: thumbnailurl
              };
              let streamresult = await gamesModel.findOneAndUpdate(filter, gamesModelval);
              let results = success("game details updated", streamresult);
              return res.json(results);
            }
          }
        }
      } else {
        let result = error("game id not found", "game_id_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/delete", async (req, res) => {
  try {
    let requiredFields = ["game_id"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const { game_id } = req.body;
      let gameInfo = await gamesModel.findOne({ _id: game_id }).exec();
      if (gameInfo) {
        const filter = { _id: game_id };
        if (!req.files || req.files.length === 0) {
          let gamesModelval = {
            game_status: "0"
          };
          await gamesModel.findOneAndUpdate(filter, gamesModelval);
          let results = success("game details deleted", "");
          return res.json(results);
        }
      } else {
        let result = error("game id not found", "game_id_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/game_details", async (req, res) => {
  try {
    let requiredFields = ["userId"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const { userId } = req.body;
      console.log("userId", userId);
      let gameifo = await gamesModel.find({ game_status: "1" }).exec();
      let userInfo = await UserModel.findOne({ _id: userId }, "role").exec();
      if (userInfo) {
        if (gameifo) {
          let results = success("game details", { game_details: gameifo });
          return res.json(results);
        } else {
          let result = error("game details not found", "streming_details_not_found");
          return res.json(result);
        }
      } else {
        let result = error("user id not found", "user_id_not_found");
        return res.json(result);
      }
    }
  } catch (err) {
    console.log("try catch error", err);
    let response = internalError();
    return res.json(response);
  }
});

router.post("/individual_game_details", async (req, res) => {
  try {
    let requiredFields = ["userId", "game_id"];

    let isRequired = checkRequiredFields(requiredFields, req.body);

    if (isRequired) {
      console.log("param missing, send required fields response");
      let response = requiredParams(isRequired);
      return res.json(response);
    } else {
      // return res.json({status:'success'});
      const { userId, game_id } = req.body;
      console.log("userId", userId);
      let gameInfo = await gamesModel.findOne({ _id: game_id }).exec();
      let userInfo = await UserModel.findOne({ _id: userId }, "role").exec();
      if (userInfo) {
        if (gameInfo) {
          let results = success("game details", { game_details: gameInfo });
          return res.json(results);
        } else {
          let result = error("game details not found", "streming_details_not_found");
          return res.json(result);
        }
      } else {
        let result = error("user id not found", "user_id_not_found");
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

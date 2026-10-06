const AWS = require("aws-sdk");


const { callAPI, airdrop2_campaign, getSecretValue } = require("../commonFunctions/apihelper");
const config = require("../config");
const secretName = config.secretNames[config.env];
const request = require("request");
const sizeOf = require("image-size");



let fileOperations = {
  fileExport: async (files) => {
    const secretValue = await getSecretValue(secretName);
    const bucketName = secretValue?.S3_BUCKET;
    try {
      console.log("files", files);

      let fileSplit = files.name.split(".");
      let fileName = fileSplit[0]?.replace(/\s+/g, '-') + "-" + Date.now();
      let content = files.data;
      let fileExtension = fileSplit[1].toLowerCase().trim();
      let contentType = "application/octet-stream";

      console.log({ files, fileName, content, fileExtension });

      if (fileExtension === "png") {
        contentType = "image/png";
      } else if (fileExtension === "jpeg" || fileExtension === "jpg") {
        contentType = "image/jpeg";
      } else if (fileExtension === "mp4") {
        contentType = "video/mp4";
      }

      console.log({ contentType });

      const params = {
        Bucket: bucketName,
        Key: `${fileName}.${fileExtension}`,
        ContentType: contentType,
        ACL: "public-read",
        Body: content
      };

      const res = await s3.upload(params).promise();

      if (res.ETag != "" || res.ETag != undefined) {
        console.log("fileUpload success");
        let result = {
          status: "success",
          result: res
        };
        return result;
      } else {
        console.log("file upload failed");
        let result = { status: "error" };
        return result;
      }
    } catch (err) {
      console.log("try and catch", { err });
      let result = { status: "error" };
      return result;
    }
  },
  fileExport_chat: async (files) => {
    try {
      const secretValue = await getSecretValue(secretName);
      const bucketName = secretValue?.S3_BUCKET;
      console.log("files", files);
      let fileSplit = files.name.split(".");
      let fileName = fileSplit[0] + "-" + Date.now();
      let content = files.data;
      let fileExtension = fileSplit[1].toLowerCase().trim();
      let contentType = "application/octet-stream";

      console.log({ files, fileName, content, fileExtension });

      if (fileExtension === "png") {
        contentType = "image/png";
      } else if (fileExtension === "jpeg" || fileExtension === "jpg") {
        contentType = "image/jpeg";
      } else if (fileExtension === "mp4") {
        contentType = "video/mp4";
      }

      console.log({ contentType });

      const params = {
        Bucket: bucketName,
        Key: "reals_chat/" + `${fileName}.${fileExtension}`,
        ContentType: contentType,
        ACL: "public-read",
        Body: content
      };

      const res = await s3.upload(params).promise();

      if (res.ETag != "" || res.ETag != undefined) {
        console.log("fileUpload success");
        let result = {
          status: "success",
          result: res
        };
        return result;
      } else {
        console.log("file upload failed");
        let result = { status: "error" };
        return result;
      }
    } catch (err) {
      console.log("try and catch", { err });
      let result = { status: "error" };
      return result;
    }
  },
  admin_profile: async (files) => {
    try {
      const secretValue = await getSecretValue(secretName);
      const bucketName = secretValue?.S3_BUCKET;
      console.log("files", files);

      let fileSplit = files.name.split(".");
      let fileName = fileSplit[0] + "-" + Date.now();
      let content = files.data;
      let fileExtension = fileSplit[1].toLowerCase().trim();
      let contentType = "application/octet-stream";

      console.log({ files, fileName, content, fileExtension });

      if (fileExtension === "png") {
        contentType = "image/png";
      } else if (fileExtension === "jpeg" || fileExtension === "jpg") {
        contentType = "image/jpeg";
      } else if (fileExtension === "mp4") {
        contentType = "video/mp4";
      }

      console.log({ contentType });

      const params = {
        Bucket: bucketName,
        Key: "admin_profile/" + `${fileName}.${fileExtension}`,
        ContentType: contentType,
        ACL: "public-read",
        Body: content
      };

      const res = await s3.upload(params).promise();

      if (res.ETag != "" || res.ETag != undefined) {
        console.log("fileUpload success");
        let result = {
          status: "success",
          result: res
        };
        return result;
      } else {
        console.log("file upload failed");
        let result = { status: "error" };
        return result;
      }
    } catch (err) {
      console.log("try and catch", { err });
      let result = { status: "error" };
      return result;
    }
  },
  fileExport_game: async (files) => {
    try {
      console.log("files", files);
      const secretValue = await getSecretValue(secretName);
      const bucketName = secretValue?.S3_BUCKET;
      let fileSplit = files.name.split(".");
      let fileName = fileSplit[0] + "-" + Date.now();
      let content = files.data;
      let fileExtension = fileSplit[1].toLowerCase().trim();
      let contentType = "application/octet-stream";

      console.log({ files, fileName, content, fileExtension });

      if (fileExtension === "png") {
        contentType = "image/png";
      } else if (fileExtension === "jpeg" || fileExtension === "jpg") {
        contentType = "image/jpeg";
      } else if (fileExtension === "mp4") {
        contentType = "video/mp4";
      }

      console.log({ contentType });

      const params = {
        Bucket: bucketName,
        Key: "games/" + `${fileName}.${fileExtension}`,
        ContentType: contentType,
        ACL: "public-read",
        Body: content
      };

      const res = await s3.upload(params).promise();

      if (res.ETag != "" || res.ETag != undefined) {
        console.log("fileUpload success");
        let result = {
          status: "success",
          result: res
        };
        return result;
      } else {
        console.log("file upload failed");
        let result = { status: "error" };
        return result;
      }
    } catch (err) {
      console.log("try and catch", { err });
      let result = { status: "error" };
      return result;
    }
  },
  fileImport: async (params) => {
    try {
      const secretValue = await getSecretValue(secretName);
      const bucketName = secretValue?.S3_BUCKET;
      let Bucket = params.Bucket;
      let Key = params.Key;

      const res = await s3.getObject({ Bucket, Key }).promise();
      if (res.ETag != "" || res.ETag != undefined) {
        console.log("fileDownload success");
        console.log({ res });
        let result = {
          status: "success",
          result: res.Body
        };
        return result;
      } else {
        console.log("file upload failed");
        let result = { status: "error" };
        return result;
      }
    } catch (err) {
      console.log("try and catch", { err });
      let result = { status: "error" };
      return result;
    }
  },
  ImageDetails: async (url) => {
    return new Promise((resolve, reject) => {
      // Fetch the image from the URL
      request.get(url, { encoding: null }, (error, response, body) => {
        if (error) {
          reject(error);
        } else {
          try {
            // Extract the dimensions of the image
            const dimensions = sizeOf(body);
            resolve(dimensions);
          } catch (err) {
            reject(err);
          }
        }
      });
    });
  }
};

module.exports = fileOperations;

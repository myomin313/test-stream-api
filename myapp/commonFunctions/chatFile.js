const AWS = require("aws-sdk");

const request = require("request");
const sizeOf = require("image-size");

const bucketName = "TestStream-staging-bucket";

const getFileExtension = (filename) => {
  const match = filename.match(/\.([0-9a-z]+)(?:[?#]|$)/i);
  // const match = filename.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
  return match ? match[1] : null; // returns the extension, or null if none found
};

let fileUploatChat = {
  chatFileExport: async (files) => {
    try {
      console.log("files", files.name);
      let splitFile = files.name.split(".").pop();

      const fileExtension = getFileExtension(files.name).toLowerCase().trim();

      console.log("files", fileExtension);

      let fileName = splitFile[0] + "-" + Date.now();
      console.log(fileName);
      let content = files.data;

      let contentType = "application/octet-stream";

      if (fileExtension === "png") {
        contentType = "image/png";
      } else if (fileExtension === "jpeg" || fileExtension === "jpg") {
        contentType = "image/jpeg";
      } else if (fileExtension === "mp4") {
        contentType = "video/mp4";
      } else if (fileExtension === "csv") {
        contentType = "application/csv";
      } else if (fileExtension === "pdf") {
        contentType = "application/pdf";
      } else if (fileExtension === "doc") {
        contentType = "application/doc";
      } else if (fileExtension === "docx") {
        contentType = "application/docx";
      } else if (fileExtension === "xls") {
        contentType = "application/xls";
      } else if (fileExtension === "xlsx") {
        contentType = "application/xlsx";
      } else if (fileExtension === "ppt") {
        contentType = "application/ppt";
      } else if (fileExtension === "pptx") {
        contentType = "application/pptx";
      } else if (fileExtension === "txt") {
        contentType = "application/txt";
      } else if (fileExtension === "md") {
        contentType = "application/md";
      }
      console.log("uppload extension", fileExtension);

      const params = {
        Bucket: bucketName,
        Key: "chat/" + `${fileName}.${fileExtension}`,
        ContentType: contentType,
        ACL: "public-read",
        Body: content
      };
      const res = await s3.upload(params).promise();

      if (res.ETag != "" || res.ETag != undefined) {
        console.log("fileUpload success");
        let result = {
          status: "success",
          fileType: fileExtension,
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
  }
};

module.exports = fileUploatChat;

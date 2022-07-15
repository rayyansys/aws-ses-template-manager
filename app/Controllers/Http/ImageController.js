"use strict";
const fs = require("fs");
const Env = use("Env");
const AWS = require("aws-sdk");
const credentials = new AWS.SharedIniFileCredentials({
  profile: Env.get("AWS_PROFILE_NAME", "default"),
});

AWS.config.credentials = credentials;

class ImageController {
  // uploads image to S3, returns image url
  async uploadImage({ request }) {
    const { region } = request.all();

    AWS.config.update({ region });

    const s3 = new AWS.S3();

    try {
      // get bucket name from environment variables
      const bucket = Env.get("AWS_BUCKET_NAME");

      const file = request.file("file");
      // use file temp path to create a buffer
      const buffer = await fs.promises.readFile(file.tmpPath);

      const { Location: url } = await s3
        .upload({
          Key: file.clientName,
          Bucket: bucket,
          Body: buffer,
          ACL: "public-read",
        })
        .promise();

      return {
        message: "Success",
        url,
      };
    } catch {
      return {
        message: "Error",
      };
    }
  }
}

module.exports = ImageController;

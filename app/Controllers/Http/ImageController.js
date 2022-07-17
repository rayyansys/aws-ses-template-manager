"use strict";
const fs = require("fs");
const Env = use("Env");
const AWS = require("aws-sdk");
if (
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_REGION
) {
  // do nothing, the aws-sdk will read those environment variables
} else {
  AWS.config.credentials = new AWS.SharedIniFileCredentials({
    profile: Env.get("AWS_PROFILE_NAME", "default"),
  });
}
const awsCloudFrontSigner = require("aws-cloudfront-sign");

class ImageController {
  // uploads image to S3, returns image url
  async uploadImage({ request, response }) {
    const { region } = request.all();

    AWS.config.update({ region });

    const s3 = new AWS.S3();

    try {
      // get bucket name from environment variables
      const bucket = Env.get("AWS_S3_BUCKET_NAME");

      const file = request.file("file");
      // use file temp path to create a buffer
      const buffer = await fs.promises.readFile(file.tmpPath);

      const key = file.clientName;

      await s3
        .putObject({
          Key: key,
          Bucket: bucket,
          Body: buffer,
        })
        .promise();

      const signingParams = {
        keypairId: Env.get("AWS_CLOUDFRONT_ACCESS_KEY_ID"),
        privateKeyString: Env.get("AWS_CLOUDFRONT_PRIVATE_KEY"),
        expireTime: 1704070800000, // 2024-01-01
      };

      const url = awsCloudFrontSigner.getSignedUrl(
        Env.get("AWS_CLOUDFRONT_URL_PREFIX") + key,
        signingParams
      );

      response.status(200).send({ url });
    } catch (err) {
      console.error(err.message);
      response.status(500).send({ error: "Error uploading image" });
    }
  }
}

module.exports = ImageController;

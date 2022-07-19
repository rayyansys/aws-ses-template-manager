"use strict";
const fs = require("fs");
const Env = use("Env");
const AWS = require("aws-sdk");
const { v4: uuid4 } = require("uuid");

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

      const key = `${uuid4()}/${file.clientName}`;

      await s3
        .putObject({
          Key: key,
          Bucket: bucket,
          Body: buffer,
        })
        .promise();

      const url = `${Env.get("IMAGES_CDN_URL_PREFIX")}${key}`;
      response.status(200).send({ url });
    } catch (err) {
      console.error(err.message);
      response.status(500).send({ error: "Error uploading image" });
    }
  }
}

module.exports = ImageController;

const AWS = require("aws-sdk");
const Env = use("Env");

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

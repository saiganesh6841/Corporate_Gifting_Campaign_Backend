const UtilController = require("./../services/UtilController");

const awsConfig = require("./../../../config/connection");
const AWS = require("aws-sdk");
AWS.config.update({
  secretAccessKey: awsConfig.aws.secretAccessKey,
  accessKeyId: awsConfig.aws.accessKeyId,
  region: awsConfig.aws.region,
});

module.exports = {
  upload2AWS: async function (path, bucket, fileName, contentType) {
    try {
      var s3 = new AWS.S3();
      var fsData = fs.readFileSync(path);
      params = {
        ACL: "public-read", // public-read / authenticated-read
        Bucket: bucket,
        Key: fileName,
        Body: fsData,
        CacheControl: "max-age=31536000",
        ContentType: contentType,
        contentDisposition: "attachment", // "inline"
      };
      await s3
        .upload(params, function (err, data) {
          if (err) {
            console.error(err.message);
            return false;
          } else {
            return true;
          }
        })
        .promise();
    } catch (err) {
      AWS.config.update({
        secretAccessKey: awsConfig.aws.secretAccessKey,
        accessKeyId: awsConfig.aws.accessKeyId,
        region: awsConfig.aws.region,
      });
      console.error(err.message);
    }
  },
  uploadSingleFile: async function (filePath, bucket, fileName, mimeType) {
    const s3 = new AWS.S3();
    const uploadParams = {
      Bucket: bucket,
      Key: fileName,
      Body: require("fs").createReadStream(filePath),
      ContentType: mimeType,
    };
    return s3.upload(uploadParams).promise();
  },
};

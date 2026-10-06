require("dotenv").config();

module.exports = {
  optionFiles: {
    development: {
      key: "/etc/httpd/ssl/dev-TestStream/ephrontech.key",
      cert: "/etc/httpd/ssl/dev-TestStream/ephrontech.crt",
      ca: "/etc/httpd/ssl/dev-TestStream/gd_ephrontech.crt"
    },
    staging: {
      key: "/etc/httpd/ssl/stagingapi.key",
      cert: "/etc/httpd/ssl/stagingapi.crt",
      ca: "/etc/httpd/ssl/gd_stagingapi.crt"
    },
    production: {
      key: "/etc/httpd/ssl/api-TestStream.xyz/api.TestStream.xyz.key",
      cert: "/etc/httpd/ssl/api-TestStream.xyz/api.TestStream.xyz.crt",
      ca: "/etc/httpd/ssl/api-TestStream.xyz/gd_api.TestStream.xyz.crt"
    }
  },
  apnKeyPaths: {
    development: "/home/dev-TestStream/public_html/myapp/AuthKey_T46KDVML32.p8",
    staging: "/home/TestStream_staging/public_html/myapp/AuthKey_T46KDVML32.p8",
    production: "/home/TestStream-production/public_html/myapp/AuthKey_T46KDVML32.p8",
    local: "./AuthKey_T46KDVML32.p8"
  },
  socketPort: process.env.SOCKET_PORT,
  env: process.env.ENVIRONMENT,
  secretNames: {
    local: "DevelopementKeys",
    development: "DevelopementKeys",
    staging: "StagingKeys",
    production: "LiveKeys"
  }
};

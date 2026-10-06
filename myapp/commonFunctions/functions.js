require("dotenv").config();
const { error } = require("../commonFunctions/responses");
const { callAPI, airdrop2_campaign, getSecretValue } = require("../commonFunctions/apihelper");
const config = require("../config");
const secretName = config.secretNames[config.env];

var basic_functions = {
  // authentication: async function (server) {
  //   let param;

  //   if (server.request.method == "POST") {
  //     param = Object(server.request.body);
  //   } else {
  //     param = Object(server.request.query);
  //   }

  //   for (var prop in param) {
  //     if (Array.isArray(param[prop]) == true) {
  //       error.duplicate_param(server, prop);
  //       return;
  //     }
  //   }

  //   var api_key = param["apikey"];
  //   var secret = param["secret"];

  //   if (typeof api_key == "undefined") {
  //     let result = {
  //       message: "Api key parameter required",
  //       error: "apikey",
  //       status_code: 0
  //     };
  //     return result;
  //   } else if (api_key.trim() == "") {
  //     let result = { message: "Api key required", error: "apikey", status_code: 0 };
  //     return result;
  //   } else if (api_key.trim() != process.env.REACT_APP_API_KEY) {
  //     let result = { message: "Invalid API key", error: "apikey", status_code: 0 };
  //     return result;
  //   } else if (typeof secret == "undefined") {
  //     let result = {
  //       message: "Secret key parameter required",
  //       error: "secret",
  //       status_code: 0
  //     };
  //     return result;
  //   } else if (secret.trim() == "") {
  //     let result = { message: "Secret key required", error: "secret", status_code: 0 };
  //     return result;
  //   } else if (secret.trim() != process.env.REACT_APP_API_SECRET) {
  //     let result = { message: "Invalid secret key", error: "secret", status_code: 0 };
  //     return result;
  //   } else {
  //     let result = { message: "API verfication done", error: "secret", status_code: 1 };
  //     return result;
  //   }
  // },

  // authentication_email_exists: function (server) {
  //   let param;

  //   if (server.request.method == "POST") {
  //     param = Object(server.request.body);
  //   } else {
  //     param = Object(server.request.query);
  //   }

  //   for (var prop in param) {
  //     if (Array.isArray(param[prop]) == true) {
  //       error.duplicate_param(server, prop);
  //       return;
  //     }
  //   }

  //   var api_key = param["apikey"];
  //   var secret = param["secret"];

  //   if (typeof api_key == "undefined") {
  //     let result = {
  //       message: "Api key parameter required",
  //       error: "apikey",
  //       status_code: 0
  //     };
  //     return result;
  //   } else if (api_key.trim() == "") {
  //     let result = { message: "Api key required", error: "apikey", status_code: 0 };
  //     return result;
  //   } else if (api_key.trim() != process.env.REACT_APP_API_KEY_EMAIL_EXISTS) {
  //     let result = { message: "Invalid API key", error: "apikey", status_code: 0 };
  //     return result;
  //   } else if (typeof secret == "undefined") {
  //     let result = {
  //       message: "Secret key parameter required",
  //       error: "secret",
  //       status_code: 0
  //     };
  //     return result;
  //   } else if (secret.trim() == "") {
  //     let result = { message: "Secret key required", error: "secret", status_code: 0 };
  //     return result;
  //   } else if (secret.trim() != process.env.REACT_APP_API_SECRET_EMAIL_EXISTS) {
  //     let result = { message: "Invalid secret key", error: "secret", status_code: 0 };
  //     return result;
  //   } else {
  //     let result = { message: "API verfication done", error: "secret", status_code: 1 };
  //     return result;
  //   }
  // }

  authentication: async function (server) {
    const secretValue = await getSecretValue(secretName);
    if (server.request.method == "POST") {
      var param = Object(server.request.body);

    } else {
      var param = Object(server.request.query);

    }
    // check duplicate param
    // for (var prop in param) {
    //   if (Array.isArray(param[prop]) == true) {
    //     error.duplicate_param(server, prop);
    //     return;
    //   }
    // }
    var api_key = param["apikey"];
    var secret = param["secret"];
    // if (typeof api_key == "undefined") {
    //   let result = { message: "Api key parameter required", error: "apikey", status_code: 0 };
    //   return result;
    // } else if (api_key.trim() == "") {
    //   let result = { message: "Api key required", error: "apikey", status_code: 0 };
    //   return result;
    // } else if (api_key.trim() != secretValue.REACT_APP_API_KEY) {
    //   let result = { message: "Invalid API key", error: "apikey", status_code: 0 };
    //   return result;
    // } else if (typeof secret == "undefined") {
    //   let result = { message: "Secret key parameter required", error: "secret", status_code: 0 };
    //   return result;
    // } else if (secret.trim() == "") {
    //   let result = { message: "Secret key required", error: "secret", status_code: 0 };
    //   return result;
    // } else if (secret.trim() != secretValue.REACT_APP_API_SECRET) {
    //   let result = { message: "Invalid secret key", error: "secret", status_code: 0 };
    //   return result;
    // } else {
      let result = { message: "API verfication done", error: "secret", status_code: 1 };
      return result;
    // }
  },
  authentication_email_exists: async function (server) {
    const secretValue = await getSecretValue(secretName);
    if (server.request.method == "POST") {
      var param = Object(server.request.body);

    } else {
      var param = Object(server.request.query);

    }
    // check duplicate param
    for (var prop in param) {
      if (Array.isArray(param[prop]) == true) {
        error.duplicate_param(server, prop);
        return;
      }
    }
    var api_key = param["apikey"];
    var secret = param["secret"];
    if (typeof api_key == "undefined") {
      let result = { message: "Api key parameter required", error: "apikey", status_code: 0 };
      return result;
    } else if (api_key.trim() == "") {
      let result = { message: "Api key required", error: "apikey", status_code: 0 };
      return result;
    } else if (api_key.trim() != secretValue.REACT_APP_API_KEY_EMAIL_EXISTS) {
      let result = { message: "Invalid API key", error: "apikey", status_code: 0 };
      return result;
    } else if (typeof secret == "undefined") {
      let result = { message: "Secret key parameter required", error: "secret", status_code: 0 };
      return result;
    } else if (secret.trim() == "") {
      let result = { message: "Secret key required", error: "secret", status_code: 0 };
      return result;
    } else if (secret.trim() != secretValue.REACT_APP_API_SECRET_EMAIL_EXISTS) {
      let result = { message: "Invalid secret key", error: "secret", status_code: 0 };
      return result;
    } else {
      let result = { message: "API verfication done", error: "secret", status_code: 1 };
      return result;
    }
  }
};

module.exports = basic_functions;

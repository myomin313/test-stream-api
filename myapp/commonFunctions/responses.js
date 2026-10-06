const responses = {
  success: (message, result = null) => {
    let res = {
      status: "success",
      statusCode: 200,
      message: message
    };

    if (result != null) {
      res["result"] = result;
    }

    return res;
  },
  notFound: (message, code = "") => {
    let res = {
      status: "error",
      statusCode: 404,
      message: message,
      code: code
    };
    return res;
  },
  conflict: (field) => {
    let res = {
      status: "error",
      statusCode: 409,
      message: `${field} Already Exists`,
      code: "CONFLICT",
      field: field,
      details: `${field} already in use`
    };

    return res;
  },
  requiredParams: (missingParams) => {
    let res = {
      status: "error",
      statusCode: 400,
      message: `${missingParams} parameter required`,
      code: "MISSING_PARAM",
      missingFields: missingParams
    };

    return res;
  },
  invalidEmail: () => {
    let res = {
      status: "error",
      statusCode: 400,
      code: "INVALID_EMAIL",
      message: "Invalid email address."
    };

    return res;
  },
  error: (message, code = null) => {
    let res = {
      status: "error",
      statusCode: 400,
      message: message
    };

    if (code) {
      res["code"] = code;
    }

    return res;
  },
  internalError: () => {
    let res = {
      status: "error",
      statusCode: 500,
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong on the server."
    };
    return res;
  }
};

module.exports = responses;

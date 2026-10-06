let helpers = {
  checkRequiredFields: (reqParams, param) => {
    // reqParams - ['name','email'] param = {'name':'alex'} returns 'email'
    const missingParams = [];
    for (const key of reqParams) {
      if (param[key] == undefined || param[key] == null || param[key] == "") {
        missingParams.push(key);
      }
    }

    return missingParams.join(",");
  }
};

module.exports = helpers;

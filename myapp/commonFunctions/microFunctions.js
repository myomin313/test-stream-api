require("dotenv").config();

const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "";

let microFun = {
  generateRandomSixDigitNumber: () => {
    const min = 100000;
    const max = 999999;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  generateRandomString: (length) => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }
    return result;
  },

  createJwtToken: async (userData) => {
    const token = jwt.sign(userData, JWT_SECRET_KEY, { expiresIn: 300 });
    return token;
  },

  verifyJwtToken: async (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET_KEY);
      return decoded;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  checkJwt: async (token, id) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET_KEY);
      if (decoded["userId"] == id) {
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  generateUniqueToken: () => uuidv4()
};

module.exports = microFun;

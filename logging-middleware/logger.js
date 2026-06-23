const axios = require("axios");

async function Log(stack, level, packageName, message) {
  try {
    const token = process.env.LOG_TOKEN;

    const response = await axios.post(
      "http://4.224.186.213/evaluation-service/logs",
      {
        stack,
        level,
        package: packageName,
        message
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
  }
}

module.exports = Log;
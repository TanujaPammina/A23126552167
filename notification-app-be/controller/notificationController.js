const axios = require("axios");
const Log = require("../../logging-middleware/logger");

const BASE_URL = process.env.BASE_URL || "http://20.244.56.144/evaluation-service";

exports.getNotifications = async (req, res) => {
  try {
    const TOKEN = process.env.ACCESS_TOKEN;

    await Log("backend", "info", "notification-app-be", "GET /notifications called");

    const response = await axios.get(`${BASE_URL}/notifications`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    });

    res.status(200).json({
      success: true,
      data: response.data,
    });

  } catch (error) {
    console.error(error);
    await Log("backend", "error", "notification-app-be", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.createNotification = async (req, res) => {
  try {
    const TOKEN = process.env.ACCESS_TOKEN;
    const payload = req.body;

    await Log("backend", "info", "notification-app-be", "POST /notifications called");

    const response = await axios.post(`${BASE_URL}/notifications`, payload, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    res.status(201).json({
      success: true,
      data: response.data,
    });

  } catch (error) {
    console.error(error);
    await Log("backend", "error", "notification-app-be", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

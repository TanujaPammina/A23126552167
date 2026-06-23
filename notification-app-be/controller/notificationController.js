const axios = require("axios");
const Log = require("../../logging-middleware/logger");
const { getTopN } = require("../priorityInbox");

const BASE_URL = process.env.BASE_URL || "http://4.224.186.213/evaluation-service";

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

exports.getPriorityNotifications = async (req, res) => {
  try {
    const TOKEN = process.env.ACCESS_TOKEN;
    const n = parseInt(req.query.n) || 10;

    await Log("backend", "info", "notification-app-be", `GET /notifications/priority?n=${n} called`);

    const response = await axios.get(`${BASE_URL}/notifications`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    });

    const notifications = response.data.notifications;
    const topN = getTopN(notifications, n);

    res.status(200).json({
      success: true,
      data: topN,
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

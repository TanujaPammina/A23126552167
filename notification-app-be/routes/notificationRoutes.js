const express = require("express");
const router = express.Router();
const { getNotifications, createNotification } = require("../controller/notificationController");

router.get("/notifications", getNotifications);
router.post("/notifications", createNotification);

module.exports = router;

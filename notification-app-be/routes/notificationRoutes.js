const express = require("express");
const router = express.Router();
const { getNotifications, createNotification, getPriorityNotifications } = require("../controller/notificationController");

router.get("/notifications", getNotifications);
router.post("/notifications", createNotification);
router.get("/notifications/priority", getPriorityNotifications);

module.exports = router;

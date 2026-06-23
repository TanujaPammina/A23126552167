require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Log = require("../logging-middleware/logger");

const app = express();

app.use(cors());
app.use(express.json());

const notificationRoutes = require("./routes/notificationRoutes");
app.use("/", notificationRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  Log("backend", "info", "notification-app-be", "Notification service started");
  console.log(`Notification service running on port ${PORT}`);
});

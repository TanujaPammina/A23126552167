# Notification System Design

## Overview

The Notification System is a backend service that handles creation and retrieval of notifications via the Affordmed evaluation service. It is built with Node.js and Express, uses Axios for HTTP communication, and integrates with the shared logging middleware for structured log reporting.

---

## Architecture

```
Client (Postman / Frontend)
        |
        v
notification-app-be (Express Server - Port 3001)
        |
        |-- GET  /notifications  --> notificationController.getNotifications
        |-- POST /notifications  --> notificationController.createNotification
        |
        v
Affordmed Evaluation Service (http://20.244.56.144/evaluation-service)
        |
        v
logging-middleware (logger.js)
        |
        v
Affordmed Log Service (/logs endpoint)
```

---

## Components

### 1. server.js
- Entry point of the application
- Loads environment variables via `dotenv`
- Registers CORS and JSON body parser middleware
- Mounts notification routes under `/`
- Logs service startup via logging middleware

### 2. routes/notificationRoutes.js
- Defines HTTP routes:
  - `GET /notifications` → `getNotifications`
  - `POST /notifications` → `createNotification`

### 3. controller/notificationController.js
- `getNotifications`: Fetches all notifications from the evaluation service
- `createNotification`: Posts a new notification to the evaluation service
- Both handlers:
  - Read `ACCESS_TOKEN` from environment
  - Use `BASE_URL` from environment for the API base
  - Log all requests and errors via the shared logger

### 4. logging-middleware/logger.js (shared)
- Sends structured logs to the Affordmed `/logs` endpoint
- Parameters: `stack`, `level`, `package`, `message`
- Token read from `LOG_TOKEN` environment variable

---

## API Endpoints

| Method | Endpoint        | Description                  |
|--------|-----------------|------------------------------|
| GET    | /notifications  | Fetch all notifications      |
| POST   | /notifications  | Create a new notification    |

---

## Environment Variables

| Variable       | Description                            |
|----------------|----------------------------------------|
| `ACCESS_TOKEN` | JWT token for Affordmed API auth       |
| `LOG_TOKEN`    | JWT token for Affordmed logging API    |
| `BASE_URL`     | Base URL of the evaluation service     |
| `PORT`         | Port the service runs on (default 3001)|

---

## Error Handling

- All controller methods are wrapped in `try/catch`
- Errors are logged to the Affordmed log service via `Log("backend", "error", ...)`
- A global Express error handler catches any unhandled middleware errors
- All error responses follow the format:
```json
{
  "success": false,
  "message": "error description"
}
```

---

## Data Flow

### GET /notifications
1. Request arrives at Express server
2. Route delegates to `getNotifications` controller
3. Controller logs the request
4. Axios fetches from `{BASE_URL}/notifications` with Bearer token
5. Response returned to client as `{ success: true, data: [...] }`

### POST /notifications
1. Request body received at Express server
2. Route delegates to `createNotification` controller
3. Controller logs the request
4. Axios posts payload to `{BASE_URL}/notifications` with Bearer token
5. Created notification returned as `{ success: true, data: {...} }`

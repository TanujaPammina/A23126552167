## Notification App Backend

A Node.js + Express REST API that handles notifications by communicating with the Affordmed evaluation service. Integrated with the shared logging middleware for structured log reporting.

### Tech Stack
- Node.js
- Express.js
- Axios
- dotenv
- cors

### Setup

```bash
npm install
node server.js
```

### Environment Variables

Create a `.env` file in this directory:

```
ACCESS_TOKEN=<your_affordmed_token>
LOG_TOKEN=<your_log_token>
BASE_URL=http://20.244.56.144/evaluation-service
PORT=3001
```

### API Endpoints

#### Get Notifications
```
GET /notifications
```
**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

#### Create Notification
```
POST /notifications
Content-Type: application/json
```
**Body:**
```json
{
  "message": "Your notification message"
}
```
**Response:**
```json
{
  "success": true,
  "data": {...}
}
```

### Project Structure

```
notification-app-be/
├── controller/
│   └── notificationController.js
├── routes/
│   └── notificationRoutes.js
├── .env
├── package.json
├── server.js
└── README.md
```

### Logging

All requests and errors are logged via the shared `logging-middleware/logger.js` to the Affordmed evaluation service.

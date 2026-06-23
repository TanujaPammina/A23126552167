## Logging Middleware

A shared logging utility used across backend services to send structured logs to the Affordmed evaluation service.

### Usage

```js
const Log = require('./logger');

await Log(stack, level, packageName, message);
```

### Parameters

| Parameter     | Type   | Description                              |
|---------------|--------|------------------------------------------|
| `stack`       | string | The stack layer (e.g. `"backend"`)       |
| `level`       | string | Log level: `"info"`, `"error"`, `"warn"` |
| `packageName` | string | Name of the service sending the log      |
| `message`     | string | The log message                          |

### Example

```js
await Log("backend", "error", "vehicle-scheduler-be", "Connection timeout");
```

### Environment Variables

The logger reads `LOG_TOKEN` from `process.env`. Make sure `dotenv` is configured in the main entry point of the consuming service.

```
LOG_TOKEN=<your_affordmed_token>
```

### Notes
- Errors during logging are caught silently and printed to `console.error` to avoid disrupting the main application flow

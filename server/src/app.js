const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const healthRoutes = require("./routes/healthRoutes");
const boardRoutes = require("./routes/boardRoutes");
const displayRoutes = require("./routes/displayRoutes");
const mediaRoutes = require("./routes/mediaRoutes");
const authRoutes = require("./routes/authRoutes");
const {
    notFoundHandler,
    errorHandler
} = require("./middleware/errorMiddleware");

const app = express();

app.use(cors({
    credentials: true,
    allowedHeaders: ["Accept", "Content-Type", "X-LiveBoard-Request"],
    origin(origin, callback) {
        if (!origin || origin === env.clientUrl) {
            callback(null, true);
            return;
        }

        callback(null, false);
    }
}));

app.use(express.json({
    limit: "1mb"
}));

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/displays", displayRoutes);
app.use("/api/media", mediaRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

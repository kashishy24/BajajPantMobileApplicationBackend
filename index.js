const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const middlewares = require("./src/middlewares/middlewares.js");
const loginRoute = require("./src/controllers/loginAPI.js");
const MaintenaceRoute = require("./src/controllers/MaintenanceScreenAPI/BreakdownScreens.js");


const limiter = rateLimit({
  //set up transaction rate limiter
  windowMs: 15 * 60 * 1000,
  max: 100,
});

const app = express();
app.use(cors({
  origin: true, // Allow all origins
  credentials: true, // Allow credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(limiter);
app.use(express.json());


app.use("/api/login", loginRoute);

app.use("/api/Maintenance", MaintenaceRoute);

const PORT = process.env.PORT || 5000;

// Start the server on port 3000
app.listen(PORT, () => {
  console.log("Server Listening on PORT:", PORT);
});

app.get("/api/status", (request, response) => {
  middlewares.standardResponse(response, null, 200, "running");
});

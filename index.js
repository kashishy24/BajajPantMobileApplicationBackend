require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
// const middlewares = require("./src/middlewares/middlewares.js");
const authRoutes = require("./src/routes/authRoutes");
const ediRoutes = require("./src/routes/ediRoutes");
const iqcRoutes = require("./src/routes/IQCRoutes");



const { connectDB } = require("./src/config/db");


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


app.use("/api/login", authRoutes);
app.use("/api/edi", ediRoutes);
app.use("/api/iqc", iqcRoutes);


const PORT = process.env.PORT || 5000;


const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();

app.get("/api/status", (request, response) => {
  middlewares.standardResponse(response, null, 200, "running");
});
 
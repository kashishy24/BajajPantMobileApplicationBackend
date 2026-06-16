const sql = require("mssql");
require("dotenv").config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const connectDB = async () => {
    try {
        await sql.connect(dbConfig);
        console.log("SQL Server Connected");
    } catch (error) {
        console.error("Database Connection Failed:", error.message);
        console.error("Database Connection Failed:");
        console.error(error);
        process.exit(1);
    }
};

module.exports = {
    sql,
    connectDB
};
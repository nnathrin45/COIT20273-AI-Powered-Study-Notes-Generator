const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

pool.getConnection()
  .then(connection => {
    console.log("✅ Connected to MySQL Database");
    connection.release();
  })
  .catch(err => {
    console.error("❌ Database Connection Failed:", err.message);
  });

module.exports = pool;
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "root123",
  database: "study_notes_db"
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
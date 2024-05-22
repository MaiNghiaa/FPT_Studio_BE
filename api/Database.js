"use strict";
const mysql = require("mysql2");

// create a new MySQL connection
const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "@Nghia1505",
  database: "project1",
});
// connect to the MySQL database
db.connect((error) => {
  if (error) {
    console.error("Error connecting to MySQL database:", error);
  } else {
    console.log("Connected to MySQL database!");
  }
});
module.exports = db;

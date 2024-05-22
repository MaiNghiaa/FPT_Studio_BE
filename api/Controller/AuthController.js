// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcrypt");
// const db = require("../Database");

// const SECRET_KEY = "your_secret_key";

// module.exports = {
//   login: (req, res) => {
//     const { username, password } = req.body;
//     if (!username || !password) {
//       return res.status(400).send("Username and password are required");
//     }

//     const sql = "SELECT * FROM user WHERE username = ?";
//     db.query(sql, [username], (err, results) => {
//       if (err) {
//         console.error("Database error:", err);
//         return res.status(500).send("Internal Server Error");
//       }
//       if (results.length === 0) {
//         return res.status(401).send("Invalid username or password");
//       }

//       const user = results[0];
//       bcrypt.compare(password, user.password, (err, isMatch) => {
//         if (err) {
//           console.error("Error comparing passwords:", err);
//           return res.status(500).send("Internal Server Error");
//         }
//         if (!isMatch) {
//           return res.status(401).send("Invalid username or password");
//         }

//         const token = jwt.sign(
//           { userId: user.user_id, roleId: user.role_id },
//           SECRET_KEY,
//           { expiresIn: "1h" }
//         );
//         res.json({ token });
//       });
//     });
//   },

//   authorize: (roles) => {
//     return (req, res, next) => {
//       const authHeader = req.headers["authorization"];
//       if (!authHeader) {
//         return res.status(403).send("No token provided");
//       }

//       const token = authHeader.split(" ")[1];
//       jwt.verify(token, SECRET_KEY, (err, decoded) => {
//         if (err) {
//           return res.status(500).send("Failed to authenticate token");
//         }

//         if (roles && !roles.includes(decoded.roleId)) {
//           return res
//             .status(403)
//             .send("You do not have permission to access this resource");
//         }

//         req.userId = decoded.userId;
//         req.roleId = decoded.roleId;
//         next();
//       });
//     };
//   },
// };

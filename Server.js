let express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const authController = require("./api/Controller/AuthController");

let PORT = process.env.PORT || 3000;
require("dotenv").config();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
// app.use("/api/auth", authController);

let routes = require("./api/router"); //importing route
routes(app);

app.listen(PORT, () => {
  console.log("Server Listening on PORT:", PORT);
});
// response.send(status);

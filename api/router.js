// router.js

"use strict";
module.exports = function (app) {
  let productsControl = require("./Controller/ProductsController");
  let authController = require("./Controller/AuthController");

  // List product đang có
  app.route("/:category").get(productsControl.get);

  // Chi tiết items thong so
  app.route("/:category/:Detail").get(productsControl.getDetailItems);
  app.route("/:category/:Detail/MoreDetail").get(productsControl.getPost);

  // Lấy danh sách các loại sản phẩm
  app.route("/types").get(productsControl.getTypeIds);

  // Thêm sản phẩm (chỉ cho phép người dùng có vai trò 'admin')
  // app
  //   .route("/product")
  //   .post(authController.authorize([1]), productsControl.createProduct); // Assuming role_id 1 is 'admin'

  // User login route
  // app.post("/login", authController.login);
  app.route("/login").post(productsControl.Login);
};

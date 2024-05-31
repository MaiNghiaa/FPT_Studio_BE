// router.js

"use strict";
const multer = require("multer");
const express = require("express");
const path = require("path");

module.exports = function (app) {
  const AdminController = require("./Controller/AdminController");
  const productsControl = require("./Controller/ProductsController");
  const authController = require("./Controller/AuthController");

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "assets/images"); // Thư mục lưu trữ tệp
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname)); // Đặt tên tệp
    },
  });

  const upload = multer({ storage: storage });

  // Sử dụng middleware để phục vụ file tĩnh từ thư mục 'assets'
  app.use("/assets", express.static("assets"));

  //Dang nhập
  app.route("/login").post(AdminController.Login);
  //Products----------------------------------------------------
  app.route("/Products").get(AdminController.getProducts);
  // Route để tạo sản phẩm mới với việc upload ảnh
  app
    .route("/createProduct")
    .post(upload.single("image"), AdminController.createProduct);
  app.route("/DeleteProduct").delete(AdminController.DeleteProduct);
  app.route("/EditProduct").put(AdminController.EditProduct);
  // Roms -------------------------------------------------
  app.route("/Roms").get(AdminController.getRoms);
  app.route("/createRom").post(AdminController.createRom);
  app.route("/DeleteRom").delete(AdminController.DeleteRom);
  app.route("/EditRom").put(AdminController.EditRom);

  // Types ------------------------------------------------------------------
  app.route("/Types").get(AdminController.getTypes);
  app.route("/createType").post(AdminController.createType);
  app.route("/DeleteType").delete(AdminController.DeleteType);
  app.route("/EditType").put(AdminController.EditType);

  // Colors -------------------------------------------------------------------------------------
  app.route("/Colors").get(AdminController.getColors);
  app.route("/CreateColor").post(AdminController.createColor);
  app.route("/DeleteColor").delete(AdminController.DeleteColor);
  app.route("/EditColor").put(AdminController.EditColor);
  //-------------------------------------------------------------------------------------------
  // List product đang có
  app.route("/:category").get(productsControl.get);

  // Chi tiết items thong so
  app.route("/:category/:Detail").get(productsControl.getDetailItems);
  app.route("/:category/:Detail/MoreDetail").get(productsControl.getPost);

  // ---------------------------------------------------------------------
};

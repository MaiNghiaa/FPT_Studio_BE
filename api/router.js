// router.js

"use strict";
const multer = require("multer");
const express = require("express");
const path = require("path");
const ProductsController = require("./Controller/ProductsController");

module.exports = function (app) {
  const AdminController = require("./Controller/AdminController");
  const productsControl = require("./Controller/ProductsController");
  const authController = require("./Controller/AuthController");

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "assets/"); // Thư mục lưu trữ tệp
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname)); // Đặt tên tệp
    },
  });

  const upload = multer({ storage: storage });
  // Sử dụng middleware để phục vụ file tĩnh từ thư mục 'assets'
  app.use("/assets", express.static("assets"));

  //Auth

  app.route("/Auth").post(AdminController.Auth);

  //Dang nhập
  app.route("/login").post(AdminController.Login);
  //Dang ki
  app.route("/register").post(AdminController.register);
  //Products----------------------------------------------------
  app.route("/Products").get(AdminController.getProducts);
  app.route("/Products/:id").get(AdminController.getProductsById);
  app.route("/Products/:id").put(AdminController.updateProductsById);
  // upload.single("image"),
  // Route để tạo sản phẩm mới với việc upload ảnh
  app
    .route("/createProduct")
    .post(upload.single("image"), AdminController.createProduct);
  app.route("/DeleteProduct").delete(AdminController.DeleteProduct);
  // app.route("/EditProduct").put(AdminController.EditProduct);
  // HeadingPost -------------------------------------------------
  app.route("/headings").get(AdminController.getHeadingPostofProduct);
  app
    .route("/headings/:id")
    .put(
      upload.single("headingImage"),
      AdminController.UpdateHeadingPostofProduct
    );
  app
    .route("/headings/:Id")
    .post(
      upload.single("headingImage"),
      AdminController.postHeadingPostofProduct
    );
  app.route("/headings/:id").delete(AdminController.DeleteHeadingPostofProduct);

  //Description Post ---------------------------------
  app
    .route("/descriptions/:id")
    .get(AdminController.getDescriptionPostofProduct);
  app
    .route("/descriptions/:id")
    .post(upload.single("image"), AdminController.postDescriptionPostofProduct);
  app
    .route("/descriptions/:id")
    .put(
      upload.single("image"),
      AdminController.UpdateDescriptionPostofProduct
    );
  app
    .route("/descriptions/:id")
    .delete(AdminController.DeleteDescriptionPostofProduct);

  //More Images
  app.route("/images/:id").get(AdminController.getMoreImages);
  app
    .route("/images/:id")
    .post(upload.single("image"), AdminController.PostImage);

  app.route("/images/:imageId").delete(AdminController.DeleteImage);

  //Detail Product
  app.route("/product_detail").get(AdminController.getProductDetail);
  app
    .route("/product_detail/:productId")
    .post(AdminController.postProductDetail);

  app
    .route("/product_detail/:productId")
    .put(AdminController.editProductDetail);

  // Roms -------------------------------------------------
  app.route("/Roms").get(AdminController.getRoms);
  app.route("/Roms/:Id").get(AdminController.getRomById);

  app.route("/createRom").post(AdminController.createRom);
  app.route("/DeleteRom").delete(AdminController.DeleteRom);
  app.route("/EditRom").put(AdminController.EditRom);

  // Types ------------------------------------------------------------------
  app.route("/Types").get(AdminController.getTypes);
  app.route("/Types/:Id").get(AdminController.getTypeById);

  app.route("/createType").post(AdminController.createType);
  app.route("/DeleteType").delete(AdminController.DeleteType);
  app.route("/EditType").put(AdminController.EditType);

  // Colors -------------------------------------------------------------------------------------
  app.route("/Colors").get(AdminController.getColors);
  app.route("/CreateColor").post(AdminController.createColor);
  app.route("/DeleteColor").delete(AdminController.DeleteColor);
  app.route("/EditColor").put(AdminController.EditColor);
  // Profile----------------------------------------------------------------
  app.route("/Profile/:username").get(AdminController.getProfile);

  app
    .route("/updateProfile")
    .put(upload.single("avatar"), AdminController.updateProfile);

  //Pricing

  app.route("/addPricing").post(AdminController.addPricing);
  app
    .route("/deletePricingProduct")
    .delete(AdminController.DeletePricingProduct);
  //update-order-status
  app.route("/update-order-status").post(AdminController.updateOrderStatus);

  //-------------------------------------------------------------------------------------------
  app.route("/ProductCount").get(AdminController.post);

  //Password------

  app.route("/changePassword").put(AdminController.changePassword);
  app.route("/orders").get(ProductsController.getOrder);
  app.route("/orders").post(ProductsController.postorders);
  app.route("/ordersbyId").post(ProductsController.getordersbyId);

  // List product đang có
  app.route("/:category").get(productsControl.get);

  // Chi tiết items thong so
  app.route("/:category/:Detail").get(productsControl.getDetailItems);
  app.route("/:category/:Detail/MoreDetail").get(productsControl.getPost);

  // ---------------------------------------------------------------------
};

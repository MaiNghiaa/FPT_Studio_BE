const util = require("util");
const mysql = require("mysql");
const db = require("../Database");
const { SELECT_PRODUCTS } = require("../Sql");
const { request } = require("http");
const { response } = require("express");
const { resolve } = require("path");
const { rejects } = require("assert");
const path = require("path");
const fs = require("fs");

module.exports = {
  //
  Auth: (request, response) => {
    const { username } = request.body;
    console.log(username);

    let sql = `SELECT role FROM user WHERE username = "${username}"`;
    db.query(sql, (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      } else {
        console.log("Done:", data);

        response.json(data);
      }
    });
  },
  // Login ---------
  Login: (request, response) => {
    const { username, password } = request.body;

    // Validate input
    if (!username || !password) {
      return response.status(400).send("Bắt buộc phải nhập nhé  ");
    }

    // Use parameterized query to prevent SQL injection
    const sql = "SELECT * FROM user WHERE username = ? AND password = ?;";
    db.query(sql, [username, password], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Lỗi server ời");
      }

      if (results.length > 0) {
        return response.status(200).send("Login successful");
      } else {
        return response.status(401).send("sai tên đăng nhập hoặc mật khẩu");
      }
    });
  },

  //Register
  register: (request, response) => {
    const {
      username,
      password,
      email,
      role,
      phone,
      address,
      avatar,
      name,
      university,
    } = request.body;

    // Thực hiện truy vấn để thêm dữ liệu vào bảng user
    const query = `INSERT INTO user (username, password, email, role, phone, address, avatar, name, university) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(
      query,
      [
        username,
        password,
        email,
        role,
        phone,
        address,
        avatar,
        name,
        university,
      ],
      (error, result) => {
        if (error) {
          console.error("Error registering user:", error);
          response.status(500).json({ message: "Internal server error" });
        } else {
          console.log("User registered successfully");
          response
            .status(201)
            .json({ message: "User registered successfully" });
        }
      }
    );
  },
  //Products -------
  getProducts: (request, response) => {
    let sql = `
                  SELECT 
                  p.ProductID,
                  p.product_name, 
                  t.type_name, 
                  MAX(p.CaptionPrice) AS MaxCaptionPrice, 
                  p.OldPrice, 
                  GROUP_CONCAT(c.color SEPARATOR ',') AS colors, 
                  p.MinRom,
                  p.ColorDefault,
                  p.OldPrice, 
                  p.image_caption_URL 
              FROM 
                  Products p 
              JOIN 
                  Type t ON p.TypeId = t.TypeId 
              LEFT JOIN 
                  Pricing pr ON p.ProductId = pr.ProductId 
              LEFT JOIN 
                  Color c ON pr.ColorId = c.ColorId 
              GROUP BY 
                  p.ProductID,
                  p.product_name, 
                  t.type_name, 
                  p.OldPrice, 
                  p.image_caption_URL,
                  p.ColorDefault,
                  p.MinRom
            `;

    db.query(sql, (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      } else {
        console.log("Fetched Types:", data);

        response.json(data);
      }
    });
  },

  getProductsById: (request, response) => {
    const { id } = request.params;
    let sql = `
    SELECT * FROM Products WHERE ProductID = ${id};
            `;

    db.query(sql, (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      } else {
        console.log("Fetched Types:", data);

        response.json(data);
      }
    });
  },
  createProduct: (request, response) => {
    const {
      product_name,
      TypeId,
      CaptionPrice,
      OldPrice,
      MinRom,
      ColorDefault,
      type_name,
    } = request.body;

    // Lấy đường dẫn ảnh từ Multer
    const imageFile = request.file;
    console.log(request.body);
    // Kiểm tra nếu thiếu thông tin cần thiết
    if (
      !product_name ||
      !TypeId ||
      !CaptionPrice ||
      !OldPrice ||
      !MinRom ||
      !ColorDefault ||
      !imageFile ||
      !type_name
    ) {
      return response.status(400).send("All fields are required");
    }

    try {
      let typeSql = "SELECT type_name FROM Type WHERE TypeId = ?";
      let checkProductNameSql = "SELECT * FROM Products WHERE product_name = ?";

      // Kiểm tra tên sản phẩm không tồn tại trong cơ sở dữ liệu
      db.query(checkProductNameSql, [product_name], (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return response.status(500).send("Internal Server Error");
        }
        if (result.length > 0) {
          return response.status(400).send("Product name already exists");
        }

        // Tiếp tục với quá trình kiểm tra TypeId và thêm sản phẩm mới
        db.query(typeSql, [TypeId], (err, result) => {
          if (err) {
            console.error("Database error:", err);
            return response.status(500).send("Internal Server Error");
          }
          if (result.length === 0) {
            return response.status(404).send("TypeId not found");
          }
          const typeName = result[0].type_name;
          const combinedURL = `${type_name}/${imageFile.filename}`;

          let sql = `
            INSERT INTO Products 
            (product_name, TypeId, CaptionPrice, OldPrice, MinRom, ColorDefault, image_caption_URL)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
          db.query(
            sql,
            [
              product_name,
              TypeId,
              CaptionPrice,
              OldPrice,
              MinRom,
              ColorDefault,
              combinedURL,
            ],
            (err, data) => {
              if (err) {
                console.error("Database error:", err);
                return response.status(500).send("Internal Server Error");
              }
              response.status(201).send("Product created successfully");
            }
          );
        });
      });
    } catch (error) {
      console.error("Error:", error.message);
      response.status(400).send(error.message);
    }
  },
  DeleteProduct: (request, response) => {
    const { product_name } = request.body;
    console.log(`Deleting Product with name: ${product_name}`);

    let sql = `
    DELETE FROM Products WHERE rom_name = (?)`;
    db.query(sql, [product_name], (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      }
      if (data.affectedRows === 0) {
        return response.status(404).send("ROM not found");
      }
      response.status(200).send("Product deleted successfully");
    });
  },
  updateProductsById: (request, response) => {
    const { id } = request.params;
    const {
      product_name,
      TypeID,
      CaptionPrice,
      OldPrice,

      DetailTypeProduct,
      MinRom,
      ColorDefault,
    } = request.body;
    // const image_caption_URL = request.file ? request.file.path : null;
    // console.log(image_caption_URL);

    let sql = `
      UPDATE Products
      SET
        product_name = '${product_name}',
        TypeID = '${TypeID}',
        CaptionPrice = '${CaptionPrice}',
        OldPrice = '${OldPrice}',
        DetailTypeProduct = '${DetailTypeProduct}',
        MinRom = '${MinRom}',
        ColorDefault = '${ColorDefault}'
      WHERE ProductID = ${id};
    `;

    db.query(sql, (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      } else {
        console.log("Product updated successfully");
        response.status(200).send("Product updated successfully");
      }
    });
  },

  //Colors------------------------------------------------------------
  getColors: (request, response) => {
    sql = `SELECT ColorId,color_name,color FROM project1.Color`;

    db.query(sql, (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      } else {
        console.log("Fetched Types:", data);

        response.json(data);
      }
    });
  },
  createColor: (request, response) => {
    const { color_name, color } = request.body;

    let sql = `
    INSERT INTO Color(color_name,color) VALUES (?,?)`;
    db.query(sql, [color_name, color], (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      }
      response.status(201).send("Product created successfully");
    });
  },
  DeleteColor: (request, response) => {
    const { ColorId } = request.body;
    console.log(`Deleting Color with name: ${ColorId}`);

    let sql = `
    DELETE FROM Color WHERE ColorId = (?)`;
    db.query(sql, [ColorId], (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      }
      if (data.affectedRows === 0) {
        return response.status(404).send("ROM not found");
      }
      response.status(200).send("Product deleted successfully");
    });
  },
  EditColor: (request, response) => {
    const { color_name, ColorId } = request.body;
    let sql = `
    UPDATE Color SET color_name = (?) WHERE (ColorId = (?));
`;
    db.query(sql, [color_name, ColorId], (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      }
      if (data.affectedRows === 0) {
        return response.status(404).send("Not found");
      }
      response.status(200).send("sửa thành công");
    });
  },
  //Roms------------------------------------------------------------
  getRoms: (request, response) => {
    sql = `SELECT RomId,rom_name FROM ROM`;

    db.query(sql, (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      } else {
        console.log("Fetched Types:", data);

        response.json(data);
      }
    });
  },
  getRomById: (request, response) => {
    sql = `SELECT RomId,rom_name FROM ROM where RomId = ${request.params.Id}`;

    db.query(sql, (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      } else {
        console.log("Fetched Types:", data);

        response.json(data);
      }
    });
  },
  createRom: (request, response) => {
    const { rom_name } = request.body;
    console.log(rom_name);

    let sql = `
    INSERT INTO ROM(rom_name) VALUES (?)`;
    db.query(sql, [rom_name], (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      }
      response.status(201).send("Product created successfully");
    });
  },
  DeleteRom: (request, response) => {
    const { rom_name } = request.body;
    console.log(`Deleting ROM with name: ${rom_name}`);

    let sql = `
    DELETE FROM ROM WHERE rom_name = (?)`;
    db.query(sql, [rom_name], (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      }
      if (data.affectedRows === 0) {
        return response.status(404).send("ROM not found");
      }
      response.status(200).send("Product deleted successfully");
    });
  },
  EditRom: (request, response) => {
    const { rom_name, RomId } = request.body;
    console.log(rom_name, RomId);
    let sql = `
    UPDATE ROM SET rom_name = (?) WHERE (RomId = (?));
`;
    db.query(sql, [rom_name, RomId], (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      }
      if (data.affectedRows === 0) {
        return response.status(404).send("Not found");
      }
      response.status(200).send("sửa thành công");
    });
  },
  //Types---------------------------------------------
  getTypes: (request, response) => {
    sql = `SELECT * FROM Type`;

    db.query(sql, (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      } else {
        console.log("Fetched Types:", data);

        response.json(data);
      }
    });
  },
  getTypeById: (request, response) => {
    sql = `SELECT * FROM Type WHERE TypeId = ${request.params.Id}`;

    db.query(sql, (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      } else {
        console.log("Fetched Types:", data);

        response.json(data);
      }
    });
  },
  createType: (request, response) => {
    const { type_name, name } = request.body;
    console.log(type_name, name);

    let sql = `
    INSERT INTO Type (type_name,name) VALUES (?,?);`;
    db.query(sql, [type_name, name], (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      }
      response.status(201).send("Product created successfully");
    });
  },
  DeleteType: (request, response) => {
    const { type_name } = request.body;
    console.log(`Deleting ROM with name: ${type_name}`);

    let sql = `
    DELETE FROM Type WHERE type_name = (?);
`;
    db.query(sql, [type_name], (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      }
      if (data.affectedRows === 0) {
        return response.status(404).send("ROM not found");
      }
      response.status(200).send("Product deleted successfully");
    });
  },
  EditType: (request, response) => {
    const { type_name, name, TypeId } = request.body;
    console.log(`Deleting ROM with name: ${type_name}`);

    let sql = `
    UPDATE Type SET type_name = (?), name = (?) WHERE (TypeId = (?));
`;
    db.query(sql, [type_name, name, TypeId], (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      }
      if (data.affectedRows === 0) {
        return response.status(404).send("Not found");
      }
      response.status(200).send("sửa thành công");
    });
  },

  //GetProfile ----------------------------------
  getProfile: (request, response) => {
    const { username } = request.params; // Thay vì request.body, sử dụng request.params
    console.log(username);
    try {
      let sql = "SELECT * FROM user WHERE username = ?";
      db.query(sql, [username], (err, data) => {
        if (err) {
          console.error("Database error:", err);
          return response.status(500).send("Internal Server Error");
        }
        // Trả về dữ liệu JSON khi truy vấn thành công
        response.status(200).json(data);
      });
    } catch (error) {
      console.error("Error:", error.message);
      response.status(400).send(error.message);
    }
  },

  //UpdateProfile ------------------
  updateProfile: (request, response) => {
    const { username, name, phone, email, address, university } = request.body;
    const avatar = request.file ? `${request.file.filename}` : null;
    console.log(name, phone, email, address, university, avatar);

    // Validate input
    if (!username || !name || !phone || !email || !address || !university) {
      return response.status(400).send("All fields are required");
    }

    try {
      let sql = `
        UPDATE user
        SET  
          name = ?, 
          phone = ?, 
          email = ?, 
          address = ?, 
          university = ?, 
          avatar = ?
        WHERE username = ?
      `;
      db.query(
        sql,
        [name, phone, email, address, university, avatar, username],
        (err, data) => {
          if (err) {
            console.error("Database error:", err);
            return response.status(500).send("Internal Server Error");
          }
          response.status(200).send("Profile updated successfully");
        }
      );
    } catch (error) {
      console.error("Error:", error.message);
      response.status(400).send(error.message);
    }
  },

  //Password
  //Password
  changePassword: (request, response) => {
    const { username, currentPassword, newPassword } = request.body;
    console.log(username, currentPassword, newPassword);

    // Kiemtra xem có điền hay chưa
    if (!username || !currentPassword || !newPassword) {
      return response.status(400).send("All fields are required");
    }

    try {
      let sql = "SELECT password FROM user WHERE username = ?";
      db.query(sql, [username], (err, data) => {
        if (err) {
          console.error("Database error:", err);
          return response.status(500).send("Internal Server Error");
        }

        if (data.length === 0) {
          return response.status(404).send("User not found");
        }
        const currentDbPassword = data[0].password;

        // So sánh mật khẩu hiện tại với mật khẩu mới
        if (currentPassword !== currentDbPassword) {
          return response.status(400).send("mật khẩu cũ không chính xác");
        }

        // kiểm tra xem nó có giống với mật khẩu cũ không
        if (newPassword === currentDbPassword) {
          return response
            .status(400)
            .send("Mật khẩu mới không thể giống với mật khẩu cũ được");
        }

        // Step 4: Cập nhật mật khẩu mới nếu không trùng:
        let updateSql = "UPDATE user SET password = ? WHERE username = ?";
        db.query(updateSql, [newPassword, username], (err, data) => {
          if (err) {
            console.error("Database error:", err);
            return response.status(500).send("Internal Server Error");
          }
          response.status(200).send("Password updated successfully");
        });
      });
    } catch (error) {
      console.error("Error:", error.message);
      response.status(400).send(error.message);
    }
  },

  getHeadingPostofProduct: (request, response) => {
    const { productId } = request.query;
    const sql = `SELECT * FROM ProductDetailHeading WHERE ProductID = "${productId}"`;
    db.query(sql, (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      } else {
        console.log("Fetched Types:", data);

        response.json(data);
      }
    });
  },

  postHeadingPostofProduct: (req, res) => {
    const { Id } = req.params;
    const { headingName } = req.body;
    const Image_heading = req.file.filename;
    const sql = `INSERT INTO ProductDetailHeading (ProductID, Heading_name, Image_heading) VALUES (?, ?, ?)`;
    db.query(sql, [Id, headingName, Image_heading], (err, result) => {
      if (err) {
        console.error("Error adding heading:", err);
        res.status(500).json({ message: "Error adding heading" });
      } else {
        console.log("Heading added successfully");
        res.status(200).json({ message: "Heading added successfully" });
      }
    });
  },

  DeleteHeadingPostofProduct: (request, response) => {
    const { id } = request.params;
    const { Heading_name, Image_heading } = request.body;
    const query = `DELETE FROM ProductDetailHeading WHERE (Id_Heading = ${id})`;
    db.query(query, (error, results) => {
      if (error) {
        return res.status(500).send(error);
      }
      response.status(200).send("Xoa thanh cong");
    });
  },
  UpdateHeadingPostofProduct: (request, response) => {
    const { id } = request.params;
    const { headingName } = request.body;
    const Image_heading = request.file ? request.file.filename : null;
    console.log(id, headingName, Image_heading);
    const sql = `
    UPDATE ProductDetailHeading
    SET Heading_name = '${headingName}', Image_heading = '${Image_heading}'
    WHERE (ProductID = ${id})`;

    db.query(sql, (error, results) => {
      if (error) {
        console.error("Error updating heading:", error);
        response.status(500).send("Server error");
      } else {
        response.send("Heading updated successfully");
      }
    });
  },

  //Description Post
  getDescriptionPostofProduct: (request, response) => {
    const { id } = request.params;
    console.log(id);
    const sql = ` SELECT * FROM DescriptionDetail WHERE ProductID = ${id}`;
    db.query(sql, (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      } else {
        // console.log("Fetched Types:", data);
        response.json(data);
      }
    });
  },

  postDescriptionPostofProduct: (request, response) => {
    const { id } = request.params;
    const { title, description } = request.body;
    // console.log(Id, title, description);
    if (!request.file) {
      return res.status(400).json({ error: "Image file is required" });
    }
    const image = request.file.filename;

    const sql = `INSERT INTO DescriptionDetail (ProductID, Title, Image, Description)
     VALUES ('${id}', '${title}', '${image}', '${description}')`;
    db.query(sql, (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      } else {
        // console.log("Fetched Types:", data);
        response.json(data);
      }
    });
  },

  UpdateDescriptionPostofProduct: (req, res) => {
    const { id } = req.params;
    const { title, description, descId } = req.body;
    const image = req.file ? req.file.filename : null;

    // console.log(id, title, description, image);
    const sql = `UPDATE DescriptionDetail SET Title = '${title}', Image = '${image}', Description = '${description}' WHERE DescriptionDetail_Id = '${descId}'`;

    db.query(sql, (error, results) => {
      if (error) {
        console.error("Error updating description:", error);
        res.status(500).send("Server error");
      } else {
        res.send("Description updated successfully");
      }
    });
  },

  DeleteDescriptionPostofProduct: (req, res) => {
    const { id } = req.params;
    // console.log(id);
    const sql = `DELETE FROM DescriptionDetail WHERE (ProductID = '${id}')`;
    db.query(sql, (error, results) => {
      if (error) {
        return res.status(500).send(error);
      }
      res.status(200).send("Xoa thanh cong");
    });
  },
  //Detail Product
  getProductDetail: (request, response) => {
    const { productId } = request.query;
    const sql = `SELECT * FROM Product_Detail WHERE id_Product = "${productId}"`;
    db.query(sql, (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      } else {
        console.log("Fetched Types:", data);

        response.json(data);
      }
    });
  },
  postProductDetail: (request, response) => {
    const { productId } = request.params;
    const {
      screen,
      camera_sau,
      camera_selfie,
      Ram,
      DungLuongPin,
      TheSim,
      HĐH,
      XuatXu,
      CPU,
      Thoigianramat,
    } = request.body;

    // Thực hiện câu lệnh SQL để thêm mới bản ghi
    const sql = `
      INSERT INTO Product_Detail (
        id_Product,
        screen,
        camera_sau,
        camera_selfie,
        Ram,
        DungLuongPin,
        TheSim,
        HĐH,
        XuatXu,
        CPU,
        Thoigianramat
      ) VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
      )`;

    // Thực thi câu lệnh SQL
    db.query(
      sql,
      [
        productId,
        screen,
        camera_sau,
        camera_selfie,
        Ram,
        DungLuongPin,
        TheSim,
        HĐH,
        XuatXu,
        CPU,
        Thoigianramat,
      ],
      (error, results) => {
        if (error) {
          // Xử lý lỗi nếu có
          console.error("Error adding product detail:", error);
          response.status(500).json({ error: "Internal server error" });
        } else {
          // Trả về thông báo thành công nếu không có lỗi
          console.log("Product detail added successfully");
          response
            .status(200)
            .json({ message: "Product detail added successfully" });
        }
      }
    );
  },

  editProductDetail: (request, response) => {
    const { productId } = request.params;
    const {
      ProductDetailId,
      id_Product,
      screen,
      camera_sau,
      camera_selfie,
      Ram,
      DungLuongPin,
      TheSim,
      HĐH,
      XuatXu,
      CPU,
      Thoigianramat,
    } = request.body;
    const sql = `
    UPDATE Product_Detail 
    SET screen = '${screen}', 
        camera_sau = '${camera_sau}', 
        camera_selfie = '${camera_selfie}', 
        Ram = '${Ram}', 
        DungLuongPin = ${DungLuongPin}, 
        TheSim = '${TheSim}', 
        HĐH = '${HĐH}', 
        XuatXu = '${XuatXu}', 
        CPU = '${CPU}', 
        Thoigianramat = '${Thoigianramat}'
    WHERE ProductDetailId = ${ProductDetailId}`;
    db.query(sql, (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return response.status(500).send("Internal Server Error");
      } else {
        response.status(200).send("Detail Product updated successfully");
      }
    });
  },

  getMoreImages: (req, res) => {
    const { id } = req.params;
    const sql = `SELECT * FROM Images WHERE ProductID = ${id}`;

    db.query(sql, (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).send("Internal Server Error");
      } else {
        console.log("Fetched Types:", data);

        res.json(data);
      }
    });
  },
  PostImage: (req, res) => {
    const { id } = req.params;
    const image = req.file ? req.file.filename : null;
    const sql = `INSERT INTO Images(ImageURL,ProductID) VALUES ('${image}', '${id}')`;

    db.query(sql, (error, results) => {
      if (error) {
        // Xử lý lỗi nếu có
        console.error("Error adding Image:", error);
        res.status(500).json({ error: "Internal server error" });
      } else {
        console.log("Image added successfully");
        res.status(200).json({ message: "Image added successfully" });
      }
    });
  },
  DeleteImage: (req, res) => {
    const { imageId } = req.params;
    const { imageName } = req.body;
    // console.log(imageId);
    fs.unlink(path.join(__dirname, "../../assets", imageName), (err) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Error deleting image file", err });
      }

      // Xóa thông tin ảnh từ cơ sở dữ liệu
      const sql = `DELETE FROM Images WHERE ImgID = ${imageId}`;
      db.query(sql, (err, result) => {
        if (err) {
          return res
            .status(500)
            .json({ error: "Error deleting image from database" });
        }
        // Thông báo rằng cả hai thao tác xóa đã hoàn thành thành công
        res.json({ message: "Image deleted successfully" });
      });
    });
  },

  updateOrderStatus: (req, res) => {
    const orderProduct = req.body.order.products;
    const orderId = req.body.order.order_id;
    const newStatus = req.body.status;

    const neworderProduct = orderProduct.map(
      ({ rom, ColorPick, quantity }) => ({
        rom,
        ColorPick,
        quantity,
      })
    );
    // Mảng mới chứa RomId, ColorId, và quantity
    const orderProductDetail = [];

    // Tạo mảng các promise để thực hiện các truy vấn
    const promises = neworderProduct.map((product) => {
      // Lấy RomId từ bảng ROM
      const romQuery = `SELECT RomId FROM ROM WHERE rom_name = ?`;
      const colorQuery = `SELECT ColorId FROM Color WHERE color_name = ?`;

      return new Promise((resolve, reject) => {
        db.query(romQuery, [product.rom], (romError, romRows) => {
          if (romError) {
            reject(romError);
            return;
          }
          if (romRows.length > 0) {
            const romId = romRows[0].RomId;

            // Lấy ColorId từ bảng Color
            db.query(
              colorQuery,
              [product.ColorPick],
              (colorError, colorRows) => {
                if (colorError) {
                  reject(colorError);
                  return;
                }
                if (colorRows.length > 0) {
                  const colorId = colorRows[0].ColorId;

                  // Tạo một đối tượng mới chứa RomId, ColorId và quantity
                  const newObj = {
                    romId: romId,
                    colorId: colorId,
                    quantity: product.quantity,
                  };

                  // Thêm đối tượng mới vào mảng orderProductDetail
                  orderProductDetail.push(newObj);
                  resolve();
                } else {
                  reject(`Color ${product.ColorPick} not found.`);
                }
              }
            );
          } else {
            reject(`ROM ${product.rom} not found.`);
          }
        });
      });
    });

    Promise.all(promises)
      .then(() => {
        console.log(orderProductDetail);
      })
      .catch((error) => {
        console.error("Error fetching ROMs and Colors:", error);
      });

    const updatePricing = () => {
      return new Promise((resolve, reject) => {
        const promises = orderProductDetail.map((detail) => {
          const { romId, colorId, quantity } = detail;
          const updateQuery = `
              UPDATE Pricing 
              SET Quantity = Quantity - ?
              WHERE RomId = ? AND ColorId = ?
            `;

          return new Promise((resolve, reject) => {
            db.query(
              updateQuery,
              [quantity, romId, colorId],
              (error, result) => {
                if (error) {
                  console.error("Error updating pricing:", error);
                  reject(error);
                } else {
                  console.log(
                    `Successfully updated pricing for RomId ${romId} and ColorId ${colorId}`
                  );
                  resolve();
                }
              }
            );
          });
        });

        // Đợi tất cả các Promise hoàn thành
        Promise.all(promises)
          .then(() => {
            resolve();
          })
          .catch((error) => {
            reject(error);
          });
      });
    };
    // Cập nhật trạng thái đơn hàng trong bảng Order
    const updateOrderStatus = () => {
      return new Promise((resolve, reject) => {
        const sql = `UPDATE project1.Order SET status = "${newStatus}" WHERE order_id = ${orderId}`;

        db.query(sql, (error, results) => {
          if (error) {
            console.error("Error updating order status:", error);
            reject(error);
          } else {
            console.log("Order status updated successfully");
            resolve();
          }
        });
      });
    };
    // Thực hiện tuần tự các thao tác: cập nhật Pricing => cập nhật Order
    updatePricing()
      .then(() => {
        return updateOrderStatus();
      })
      .then(() => {
        res
          .status(200)
          .json({ message: "Order status and pricing updated successfully" });
      })
      .catch((error) => {
        console.error("Error:", error);
        res.status(500).json({ message: "Internal server error" });
      });
    // // console.log(orderId, newStatus, neworderProduct);
    // const sql = `UPDATE project1.Order SET status = "${newStatus}" WHERE order_id = ${orderId}`;

    // db.query(sql, (error, results) => {
    //   if (error) {
    //     console.error("Error updating order status:", error);
    //     res.status(500).json({ message: "Internal server error" });
    //   } else {
    //     console.log("Order status updated successfully");
    //     res.status(200).json({ message: "Order status updated successfully" });
    //   }
    // });
  },

  post: (req, res) => {
    const productId = req.query.productId;
    console.log(productId, "Helllooo");
    // Tạo hàm thực hiện truy vấn sản phẩm và giá
    const queryProducts = () => {
      return new Promise((resolve, reject) => {
        const sql = `
          SELECT 
              Products.image_caption_URL,
              Products.ProductID,
              ROM.rom_name AS ROM,
              Color.color_name AS Color_name,
              Color.color AS Color,
              Pricing.OldPrice,
              Pricing.Price,
              Pricing.Quantity
          FROM 
              Products
          INNER JOIN 
              Pricing ON Products.ProductID = Pricing.ProductID
          INNER JOIN 
              Color ON Pricing.ColorId = Color.ColorId
          INNER JOIN 
              ROM ON Pricing.RomId = ROM.RomId
          WHERE 
              Products.ProductID = ?
        `;

        db.query(sql, [productId], function (err, productResults) {
          if (err) {
            console.error("Database error:", err);
            reject(err);
          } else {
            if (!Array.isArray(productResults)) {
              productResults = [productResults];
            }

            const data = [];
            const roms = {};

            productResults.forEach((row) => {
              if (!roms[row.ROM]) {
                roms[row.ROM] = {
                  Rom: row.ROM,
                  DetailCR: [],
                };
              }

              roms[row.ROM].DetailCR.push({
                Color_name: row.Color_name,
                color: row.Color,
                price: row.Price,
                Quantity: row.Quantity,
                OldPrice: row.OldPrice,
              });
            });

            for (const rom in roms) {
              data.push(roms[rom]);
            }

            resolve(data);
          }
        });
      });
    };

    // Thực hiện truy vấn
    queryProducts()
      .then((dataPricing) => {
        // Gửi JSON với dữ liệu được trả về từ truy vấn
        res.json({
          DataPricing: dataPricing,
        });
        console.log(dataPricing);
      })
      .catch((err) => {
        console.error("Error:", err);
        res.status(500).send("Internal Server Error");
      });
  },

  addPricing: (req, res) => {
    const { Color_name, OldPrice, Quantity, Rom, price, productId } = req.body;

    // Thực hiện truy vấn thông qua pool.query với callback
    db.query(
      `SELECT * FROM Pricing WHERE ProductID = ? AND ColorId = ? AND RomId = ?`,
      [productId, Color_name, Rom],
      (error, existingPricingResult) => {
        if (error) {
          console.error("Error checking existing pricing:", error);
          return res.status(500).json({ error: "Internal server error" });
        }

        // Kiểm tra nếu đã tồn tại kết hợp Color_name và Rom
        if (existingPricingResult.length > 0) {
          return res.status(400).json({
            error:
              "Color_name and Rom combination already exists for this product",
          });
        }

        // Thêm bản ghi mới vào bảng Pricing
        const sql = `
                INSERT INTO Pricing (ProductID, ColorId, RomId, Price, OldPrice, Quantity) 
                VALUES (?, ?, ?, ?, ?, ?);
            `;
        db.query(
          sql,
          [productId, Color_name, Rom, price, OldPrice, Quantity],
          (error, result) => {
            if (error) {
              console.error("Error adding pricing:", error);
              return res.status(500).json({ error: "Internal server error" });
            }

            res.status(201).json({ message: "Pricing added successfully" });
          }
        );
      }
    );
  },
  DeletePricingProduct: (req, res) => {
    const { Color_name, rom, productId } = req.body;
    console.log(Color_name, rom, productId);

    // Lấy ColorId từ bảng Color
    const getColorIdQuery = `SELECT ColorId FROM Color WHERE color_name = '${Color_name}'`;
    db.query(getColorIdQuery, (error, colorResult) => {
      if (error) {
        console.error("Error getting ColorId: ", error);
        res.status(500).json({ message: "Internal server error" });
        return;
      }

      // Lấy ColorId từ kết quả truy vấn
      const ColorId = colorResult.length > 0 ? colorResult[0].ColorId : null;

      // Kiểm tra nếu không có ColorId
      if (!ColorId) {
        res.status(404).json({ message: "ColorId not found" });
        return;
      }

      // Lấy RomId từ bảng ROM
      const getRomIdQuery = `SELECT RomId FROM ROM WHERE rom_name = '${rom}'`;
      db.query(getRomIdQuery, (err, romResult) => {
        if (err) {
          console.error("Error getting RomId: ", err);
          res.status(500).json({ message: "Internal server error" });
          return;
        }

        // Lấy RomId từ kết quả truy vấn
        const RomId = romResult.length > 0 ? romResult[0].RomId : null;

        // Kiểm tra nếu không có RomId
        if (!RomId) {
          res.status(404).json({ message: "RomId not found" });
          return;
        }

        // Xóa sản phẩm từ bảng Pricing
        const DeletePricingProductQuery = `DELETE FROM project1.Pricing WHERE ProductID = '${productId}' AND ColorId = '${ColorId}' AND RomId = '${RomId}'`;
        db.query(DeletePricingProductQuery, (err, deleteResult) => {
          if (err) {
            console.error("Error deleting product: ", err);
            res.status(500).json({ message: "Internal server error" });
            return;
          }

          // Gửi phản hồi khi hoàn thành
          res.status(200).json({ message: "Product deleted successfully" });
        });
      });
    });
  },
};

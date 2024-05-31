const util = require("util");
const mysql = require("mysql");
const db = require("../Database");
const { SELECT_PRODUCTS } = require("../Sql");
const { request } = require("http");
const { response } = require("express");
const { resolve } = require("path");
const { rejects } = require("assert");

module.exports = {
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
  //Products -------
  getProducts: (request, response) => {
    let sql = `
              SELECT 
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
  EditProduct: (request, response) => {},

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
  DeleteColor: (request, response) => {
    const { color_name } = request.body;
    console.log(`Deleting Color with name: ${color_name}`);

    let sql = `
    DELETE FROM Color WHERE color_name = (?)`;
    db.query(sql, [color_name], (err, data) => {
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
    UPDATE ROM SET color_name = (?) WHERE (ColorId = (?));
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
    sql = `SELECT * FROM Type;`;

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
};

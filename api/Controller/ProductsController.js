const util = require("util");
const mysql = require("mysql");
const db = require("../Database");
const { SELECT_PRODUCTS } = require("../Sql");
const { request } = require("http");
const { response } = require("express");
const { resolve } = require("path");
const { rejects } = require("assert");

module.exports = {
  //lay ra toan bo san pham
  get: (request, response) => {
    const category = request.params.category;

    // Kiểm tra nếu category là null hoặc undefined
    if (!category) {
      return response.status(400).send("Category is required");
    }
    // console.log("Category:", category);
    let sql = `
              SELECT 
              p.product_name, 
              t.name,
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
          WHERE 
              t.type_name = '${category}' 
          GROUP BY 
              p.product_name, 
              t.name,
              t.type_name,
              p.OldPrice,
              p.image_caption_URL,
              p.ColorDefault,
              p.MinRom
            `;
    db.query(sql, function (err, data) {
      if (err) {
        // Xử lý lỗi từ cơ sở dữ liệu
        console.error("Database error:", err);
        response.status(500).send("Internal Server Error");
      } else {
        // console.log(data);
        response.json(data);
      }
    });
  },
  //THong so san pham

  getDetailItems: (request, response) => {
    const category = request.params.category;
    const DetailCate = request.params.Detail;
    const RomMin = request.query.RomMin;
    const ColorDefault = request.query.ColorDefault;

    console.log(category, DetailCate, RomMin, ColorDefault);

    if (!category) {
      response.status(400).send("Missing category parameter");
      return;
    }

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
              Products.product_name = '${DetailCate}'
        `;

        db.query(sql, function (err, productResults) {
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

    // Tạo hàm thực hiện truy vấn chi tiết sản phẩm
    const queryProductDetail = () => {
      return new Promise((resolve, reject) => {
        const sql = `
          SELECT
              p.ProductID,
              p.product_name,
              pd.screen,
              pd.camera_sau,
              pd.camera_selfie,
              pd.Ram,
              pd.DungLuongPin,
              pd.TheSim,
              pd.HĐH,
              pd.XuatXu,
              pd.CPU,
              pd.Thoigianramat
          FROM
              Products p
          LEFT JOIN
              ProductDetailHeading pdh ON p.ProductID = pdh.ProductID
          LEFT JOIN
              Product_Detail pd ON p.ProductID = pd.id_Product
          WHERE
              p.product_name = "${DetailCate}"
        `;

        db.query(sql, function (err, data) {
          if (err) {
            console.error("Database error:", err);
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    };

    // Tạo truy vấn để lấy sản phẩm phụ kiện
    const queryAccessoryProducts = () => {
      return new Promise((resolve, reject) => {
        const sql = `
          SELECT 
              Products.product_name, 
              Products.image_caption_URL, 
              Products.CaptionPrice, 
              Products.OldPrice 
          FROM 
              Products 
          JOIN 
              Type 
          ON 
              Products.TypeID = Type.TypeId 
          WHERE 
              Type.type_name = 'phu-kien'
          ORDER BY 
              RAND() 
          LIMIT 4
        `;

        db.query(sql, function (err, data) {
          if (err) {
            console.error("Database error:", err);
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    };
    const ImgDetailItem = () => {
      return new Promise((resolve, rejects) => {
        const sql = `SELECT
        Products.ProductID,
        Images.ImageURL
    FROM
        Products
    INNER JOIN
        Images ON Products.ProductID = Images.ProductID
    WHERE
        Products.product_name = "${DetailCate}";
    
        `;
        db.query(sql, function (err, data) {
          if (err) {
            console.error("Database error:", err);
            rejects(err);
          } else {
            resolve(data);
          }
        });
      });
    };
    const image_caption_URL = () => {
      return new Promise((resolve, rejects) => {
        const sql = `SELECT
        Products.image_caption_URL
    FROM
        Products
    
    WHERE
        Products.product_name = "${DetailCate}";
    
        `;
        db.query(sql, function (err, data) {
          if (err) {
            console.error("Database error:", err);
            rejects(err);
          } else {
            resolve(data);
          }
        });
      });
    };
    // Sử dụng Promise.all để thực hiện các truy vấn song song
    Promise.all([
      queryProducts(),
      queryProductDetail(),
      queryAccessoryProducts(),
      ImgDetailItem(),
      image_caption_URL(),
    ])
      .then(([dataPricing, dataCard, dataPk, dataDetailImg, CaptionImg]) => {
        // Gửi JSON với dữ liệu được trả về từ ba truy vấn
        response.json({
          category,
          DetailCate,
          CaptionImg: CaptionImg,
          RomMin: RomMin,
          ColorDefault: ColorDefault,
          DataPricing: dataPricing,
          DataCard: dataCard,
          DataPk: dataPk,
          DataImg: dataDetailImg,
        });
        console.log(dataPricing, dataCard, dataPk, dataDetailImg, CaptionImg);
      })

      .catch((err) => {
        console.error("Error:", err);
        response.status(500).send("Internal Server Error");
      });
  },

  //Phu kien
  getLimit: (request, response) => {
    // console.log(Pk);
    // if (!Pk) {
    // }
    let sql = `
    SELECT 
        Products.product_name, 
        Products.image_caption_URL, 
        Products.CaptionPrice, 
        Products.OldPrice 
    FROM 
        Products 
    JOIN 
        Type 
    ON 
        Products.TypeID = Type.TypeId 
    WHERE 
        Type.type_name = 'phu-kien'
    ORDER BY 
        RAND() 
    LIMIT 4;
`;

    db.query(sql, function (err, data) {
      if (err) {
        // Xử lý lỗi từ cơ sở dữ liệu
        console.error("Database error:", err);
        response.status(500).send("Internal Server Error");
      } else {
        console.log(data);
        response.json(data);
      }
    });
  },

  NotiItems: (request, response) => {
    const { Name, Phone, Email } = request.body;
    console.log(Name, Phone, Email);

    if (!Name || !Phone) {
      return response.status(400).send("Lỗi: Thiếu dữ liệu bắt buộc");
    }

    // Sử dụng chuẩn bị câu lệnh để tránh SQL Injection
    const sql =
      "INSERT INTO RegisterNewItem (Fullname, Phone,email) VALUES (?, ?, ?)";
    const values = [Name, Phone, email];

    db.query(sql, values, (err, data) => {
      if (err) {
        // Xử lý lỗi từ cơ sở dữ liệu
        console.error("Database error:", err);
        return response.status(500).send("Lỗi cơ sở dữ liệu");
      } else {
        console.log(data);
        return response.status(200).send("Dữ liệu đã được lưu trữ thành công");
      }
    });
  },

  //Thong tin khac
  getPost: (request, response) => {
    // console.log(Pk);
    // if (!Pk) {
    // }
    const Detail = request.params.Detail;

    let sqlqueryHeading = `
    SELECT 
        PDH.Heading_name, 
        MAX(PDH.Image_heading) AS Image_heading
    FROM 
        products P 
    JOIN 
        ProductDetailHeading PDH ON P.ProductID = PDH.ProductID 
    WHERE 
        P.product_name = '${Detail}' 
    GROUP BY 
        PDH.Heading_name;
`;

    let sqlqueryDesc = `
    SELECT 
        DD.Title,
        DD.Image,
        DD.Description
    FROM 
        products P 
    JOIN 
        DescriptionDetail DD ON P.ProductID = DD.ProductID 
    WHERE 
        P.product_name = '${Detail}';
`;

    db.query(sqlqueryHeading, function (errHeading, dataHeading) {
      if (errHeading) {
        // console.error("Error in heading query:", errHeading);
        response.status(500).send("Internal Server Error");
      } else {
        db.query(sqlqueryDesc, function (errDesc, dataDesc) {
          if (errDesc) {
            // console.error("Error in description query:", errDesc);
            response.status(500).send("Internal Server Error");
          } else {
            const responseData = {
              headingData: dataHeading,
              descriptionData: dataDesc,
            };
            // console.log(responseData);
            response.json(responseData);
          }
        });
      }
    });
  },
  ////Orders

  getOrder: (req, res) => {
    console.log("adas");
    const query = `
        SELECT 
            o.order_id,
            o.customer_name,
            o.customer_email,
            o.customer_phone,
            o.total_price,
            o.status,
            o.order_date,
            od.product_name,
            od.quantity,
            od.price_per_item,
            od.rom,
            od.ColorPick,
            od.URL
        FROM 
            project1.Order o
        JOIN 
            OrderDetail od ON o.order_id = od.order_id;
    `;

    db.query(query, (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const orders = results.reduce((acc, row) => {
        const orderId = row.order_id;

        if (!acc[orderId]) {
          acc[orderId] = {
            order_id: row.order_id,
            customer_name: row.customer_name,
            customer_email: row.customer_email,
            customer_phone: row.customer_phone,
            total_price: row.total_price,
            status: row.status,
            totalQuantity: 0, // This should be calculated if necessary
            products: [],
          };
        }

        acc[orderId].products.push({
          ComboPricing: 0, // You can set these values as per your requirement
          oldComboPricing: 0,
          nameComboPricing: "",
          URL: row.URL,
          rom: row.rom,
          ColorPick: row.ColorPick,
          product_name: row.product_name,
          quantity: row.quantity,
          old_price_per_item: 0,
          price_per_item: row.price_per_item,
          TotalinProduct: row.price_per_item * row.quantity,
        });

        // Update totalQuantity
        acc[orderId].totalQuantity += row.quantity;

        return acc;
      }, {});

      // Convert object to array and send as response
      const formattedOrders = Object.values(orders);
      console.log(formattedOrders);
      res.json(formattedOrders);
    });
  },

  getordersbyId: (req, res) => {
    const { customer_name, customer_email, customer_phone } = req.body;

    console.log(customer_name, customer_email, customer_phone);
    const sql = ` SELECT order_id,status FROM project1.Order WHERE customer_name = "${customer_name}" AND customer_email ="${customer_email}" AND customer_phone = ${customer_phone}`;
    db.query(sql, function (err, data) {
      if (err) {
        // Xử lý lỗi từ cơ sở dữ liệu
        console.error("Database error:", err);
        res.status(500).send("Internal Server Error");
      } else {
        console.log(data);
        res.json(data);
      }
    });
  },

  postorders: (req, res) => {
    const {
      customer_name,
      customer_email,
      customer_phone,
      total_price,
      products,
    } = req.body;

    // Validate required fields
    if (!customer_name || !customer_email || !customer_phone) {
      return res.status(400).send("Thiếu thông tin khách hàng.");
    }

    console.log(
      customer_name,
      customer_email,
      customer_phone,
      total_price,
      products
    );

    // Thêm đơn hàng vào bảng `Order`
    db.query(
      "INSERT INTO `Order` (customer_name, customer_email, customer_phone, total_price) VALUES (?, ?, ?, ?)",
      [customer_name, customer_email, customer_phone, total_price],
      (err, result) => {
        if (err) throw err;

        // Lấy ID của đơn hàng vừa thêm
        const orderId = result.insertId;

        // Thêm chi tiết đơn hàng vào bảng `OrderDetail`
        products.forEach((product) => {
          const {
            product_name,
            quantity,
            price_per_item,
            rom,
            ColorPick,
            URL,
          } = product;
          db.query(
            "INSERT INTO `OrderDetail` (order_id, product_name, quantity, price_per_item, rom, ColorPick, URL) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
              orderId,
              product_name,
              quantity,
              price_per_item,
              rom,
              ColorPick,
              URL,
            ],
            (err, result) => {
              if (err) throw err;
            }
          );
        });

        res.status(200).send("Đơn hàng đã được thêm thành công!");
      }
    );
  },

  // --------------
};

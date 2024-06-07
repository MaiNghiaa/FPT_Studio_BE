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
              Products.ProductID,
              ROM.rom_name AS ROM,
              Color.color_name AS Color_name,
              Color.color AS Color,
              Pricing.OldPrice,
              Pricing.Price
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

    // Sử dụng Promise.all để thực hiện các truy vấn song song
    Promise.all([
      queryProducts(),
      queryProductDetail(),
      queryAccessoryProducts(),
      ImgDetailItem(),
    ])
      .then(([dataPricing, dataCard, dataPk, dataDetailImg]) => {
        // Gửi JSON với dữ liệu được trả về từ ba truy vấn
        response.json({
          category,
          DetailCate,
          RomMin: RomMin,
          ColorDefault: ColorDefault,
          DataPricing: dataPricing,
          DataCard: dataCard,
          DataPk: dataPk,
          DataImg: dataDetailImg,
        });
        console.log(dataPricing, dataCard, dataPk, dataDetailImg);
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
  // --------------
};

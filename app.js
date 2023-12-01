const express = require("express");
const session = require("express-session");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const app = express();
const nodemailer = require("nodemailer");
app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = {
  host: "localhost",

  port: 3306,

  database: "i10sys",

  user: "KevinHung",

  password: "12345678",
};

app.use(
  session({
    secret: "MySecretKey",
    resave: false,
    saveUninitialized: true,
  })
);

const connection = mysql.createConnection(db);

connection.connect((err) => {
  if (err) {
    console.error("資料庫連接失敗:", err);
  } else {
    console.log("資料庫連接成功");
  }
});

//LOGIN路由
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  try {
    const query = "SELECT * FROM users WHERE username = ?";
    connection.query(query, [username], async (error, results, fields) => {
      if (error) {
        console.error(error);
        return res.status(500).send("伺服器錯誤。");
      }

      const user = results[0];
      if (!user) {
        return res.send("用戶不存在。");
      }
      console.log("輸入的密碼:", password);
      console.log("資料庫的密碼:", user.password);

      if (password !== user.password) {
        return res.send("密碼不正確。");
      }

      req.session.isAuthenticated = true;
      req.session.username = user.username;
      res.redirect("/dashboard");
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("伺服器錯誤。");
  }
});

//進入adminLOGIN頁面路由
app.get("/adminlogin", (req, res) => {
  res.render("adminlogin");
});
//adminLOGIN路由
app.post("/adminlogin", (req, res) => {
  const { username, password } = req.body;

  try {
    const query = "SELECT * FROM admins WHERE username = ?";
    connection.query(query, [username], async (error, results, fields) => {
      if (error) {
        console.error(error);
        return res.status(500).send("伺服器錯誤。");
      }

      const user = results[0];
      if (!user) {
        return res.send("管理員不存在。");
      }
      console.log("輸入的密碼:", password);
      console.log("資料庫的密碼:", user.password);

      if (password !== user.password) {
        return res.send("密碼不正確。");
      }
      req.session.adminname = user.username;
      req.session.isAdminAuthenticated = true;
      res.redirect("/admindashboard");
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("伺服器錯誤。");
  }
});

//進入admin主頁
app.get("/admindashboard", (req, res) => {
  if (req.session.isAdminAuthenticated) {
    res.render("adminuserpage");
  } else {
    res.redirect("/adminlogin");
  }
});

//MAIL發送驗證碼路由
app.post("/sendVerificationCode", async (req, res) => {
  const email = req.body.email;
  const verificationCode = generateVerificationCode();

  req.session.verificationCode = verificationCode;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "ICD10MIIA@gmail.com",
      pass: "fjuw dpot wmhw jecq",
    },
  });

  const mailOptions = {
    from: "ICD10MIIA@gmail.com",
    to: email,
    subject: "ICD10查詢系統註冊帳號驗證碼",
    text: `您的驗證碼是：${verificationCode}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: "驗證碼已發送到您的郵箱" });
  } catch (error) {
    console.error("郵件發送失敗:", error);
    res.status(500).send("無法發送驗證碼");
  }
});

// 進入註冊頁面路由
app.get("/register", (req, res) => {
  res.render("register");
});

// 註冊帳號路由
app.post("/regis", (req, res) => {
  const { email, password, confirmPassword, verificationCode } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).send("密碼不一致");
  }

  if (req.session.verificationCode !== verificationCode) {
    return res.status(400).send("驗證碼不正確");
  }

  const insertQuery = "INSERT INTO users (username, password) VALUES (?, ?)";
  connection.query(insertQuery, [email, password], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send("無法儲存用戶資料");
    }

    if (req.session) {
      delete req.session.verificationCode;
    }

    res.send("用戶註冊成功");
  });
});

//返回鍵 清除驗證碼路由
app.get("/clearVerificationCode", (req, res) => {
  if (req.session) {
    delete req.session.verificationCode;
  }
  res.render("login");
});

//進入更改密碼頁面路由
app.get("/changePassword", (req, res) => {
  res.render("changepassword");
});
//更改密碼路由
app.post("/changePassword", (req, res) => {
  const { originpassword, newpassword, confirmNewPassword } = req.body;
  const currentUsername = req.session.username;

  if (!currentUsername) {
    return res.status(400).send("未檢測到用戶登入。");
  }

  if (newpassword !== confirmNewPassword) {
    return res.status(400).send("新密碼與確認新密碼不一致。");
  }

  connection.query(
    "SELECT password FROM users WHERE username = ?",
    [currentUsername],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send("伺服器錯誤，無法獲取用戶信息。");
      }

      if (results.length === 0) {
        return res.status(400).send("用戶不存在。");
      }

      const user = results[0];
      if (originpassword !== user.password) {
        return res.status(400).send("原密碼不正確。");
      }

      if (originpassword === newpassword) {
        return res.status(400).send("新密碼不能與舊密碼相同。");
      }

      connection.query(
        "UPDATE users SET password = ? WHERE username = ?",
        [newpassword, currentUsername],
        (err, updateResults) => {
          if (err) {
            console.error(err);
            return res.status(500).send("無法更新密碼。");
          }
          res.send("密碼更新成功。");
        }
      );
    }
  );
});

// 主頁路由
/*app.get("/dashboard", (req, res) => {
  if (req.session.isAuthenticated) {
    res.render("userhomepage");
  } else {
    res.redirect("/login");
  }
});*/

app.get("/dashboard", (req, res) => {
  if (req.session.isAuthenticated && req.session.username) {
    const currentUsername = req.session.username;

    // 從資料庫獲取搜尋歷史
    connection.query(
      "SELECT searchhistory FROM users WHERE username = ?",
      [currentUsername],
      (err, results) => {
        if (err) {
          console.error(err);
          res.status(500).send("內部伺服器錯誤");
          return;
        }

        let searchHistory =
          results.length > 0 ? results[0].searchhistory || [] : [];

        // 呈現主介面，傳遞搜尋歷史
        res.render("userhomepage", { searchHistory: searchHistory });
      }
    );
  } else {
    res.redirect("/login");
  }
});

//登出路由
app.get("/logout", (req, res) => {
  req.session.destroy(function (err) {
    res.redirect("/login");
  });
});
//管理者登出路由
app.get("/adminlogout", (req, res) => {
  req.session.destroy(function (err) {
    res.redirect("/adminlogin");
  });
});

// search路由 第一版
/*app.post("/adminSearch", (req, res) => {
  const searchQuery = req.body.searchQuery;
  console.log(req.body.searchQuery);

  performSearchInDatabase(searchQuery, (searchResults) => {
    if (searchResults.length === 0) {
      // 没有结果的时候
      res.render("userhomepage", { searchResults: [] });
    } else {
      res.render("userhomepage", { searchResults: searchResults });
    }
  });
});*/
//第二版(新增歷史紀錄儲存功能)
/*app.post("/search", (req, res) => {
  const searchQuery = req.body.searchQuery;
  const currentUsername = req.session.username; // 從會話中獲取當前用戶名
  console.log(req.body.searchQuery);

  // 對 2023 版本進行搜尋
  performSearchInDatabase(searchQuery, (searchResults2023) => {
    // 對 2014 版本進行搜尋
    performSearch2014(searchQuery, (searchResults2014) => {
      // 無論 2023 版本的搜尋結果如何，都會執行 2014 版本的搜尋

      if (currentUsername) {
        updateSearchHistory(currentUsername, searchQuery);
      }

      res.render("userhomepage", {
        searchResults: searchResults2023.length > 0 ? searchResults2023 : [],
        searchResults2014:
          searchResults2014.length > 0 ? searchResults2014 : [],
      });
    });
  });
});*/

//admin的search路由(無搜尋紀錄)
app.post("/adminSearch", (req, res) => {
  const searchQuery = req.body.searchQuery;
  const currentAdminname = req.session.adminUsername;
  console.log(req.body.searchQuery);

  performSearchInDatabase(searchQuery, (searchResults2023) => {
    performSearch2014(searchQuery, (searchResults2014) => {
      res.render("adminuserpage", {
        searchResults: searchResults2023.length > 0 ? searchResults2023 : [],
        searchResults2014:
          searchResults2014.length > 0 ? searchResults2014 : [],
      });
    });
  });
});

app.post("/search", (req, res) => {
  const searchQuery = req.body.searchQuery;
  const currentUsername = req.session.username;

  performSearchInDatabase(searchQuery, (searchResults2023) => {
    performSearch2014(searchQuery, (searchResults2014) => {
      if (currentUsername) {
        updateSearchHistory(currentUsername, searchQuery, () => {
          // 搜尋歷史更新後再次獲取最新的搜尋歷史
          connection.query(
            "SELECT searchhistory FROM users WHERE username = ?",
            [currentUsername],
            (err, results) => {
              if (err) {
                console.error("Database query error:", err);
                return; // 處理錯誤
              }
              /*console.log("Query results:", results);*/

              let updatedSearchHistory =
                results.length > 0 ? results[0].searchhistory || [] : [];

              res.render("userhomepage", {
                searchResults:
                  searchResults2023.length > 0 ? searchResults2023 : [],
                searchResults2014:
                  searchResults2014.length > 0 ? searchResults2014 : [],
                searchHistory: updatedSearchHistory,
              });
            }
          );
        });
      } else {
        // 如果用戶未登入，僅渲染搜索結果，不顯示搜索歷史
        res.render("userhomepage", {
          searchResults: searchResults2023.length > 0 ? searchResults2023 : [],
          searchResults2014:
            searchResults2014.length > 0 ? searchResults2014 : [],
          searchHistory: [],
        });
      }
    });
  });
});

app.get("/adminUpdateHistory", (req, res) => {
  const query =
    "SELECT * FROM adminUpdateHistory ORDER BY updateDate DESC LIMIT 20";
  connection.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send("資料庫查詢錯誤");
    }
    res.render("adminUpdateHistory", { updateHistory: results });
  });
});

//管理員更新2023ICD10路由
/*app.post("/update2023Icd10Coding", (req, res) => {
  const { ICD10CM, englishName, chineseName } = req.body;
  const currentAdminname = req.session.adminUsername;
  const checkQuery = "SELECT * FROM `icd-10-cm_pcs` WHERE `2023_ICD-10-CM` = ?";
  connection.query(checkQuery, [ICD10CM], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send("資料庫查詢錯誤");
    }

    if (results.length > 0) {
      // 記錄存在，更新資料
      const updateQuery =
        "UPDATE `icd-10-cm_pcs` SET `2023_ICD-10-CM_english_name` = ?, `2023_ICD-10-CM_chinses_name` = ? WHERE `2023_ICD-10-CM` = ?";
      connection.query(
        updateQuery,
        [englishName, chineseName, ICD10CM],
        (err, results) => {
          if (err) {
            console.error(err);
            return res.status(500).send("無法更新資料");
          }
          res.redirect("/admindashboard?message=操作成功");
        }
      );
    } else {
      // 記錄不存在，插入新資料
      const insertQuery =
        "INSERT INTO `icd-10-cm_pcs` (`2023_ICD-10-CM`, `2023_ICD-10-CM_english_name`, `2023_ICD-10-CM_chinses_name`, `2023_ICD-10-CM_description`) VALUES (?, ?, ?, ?)";
      const description = englishName + " " + chineseName; // 或者您可以使用任何其他方式來格式化這個組合
      connection.query(
        insertQuery,
        [ICD10CM, englishName, chineseName, description],
        (err, results) => {
          if (err) {
            console.error(err);
            return res.status(500).send("無法插入資料");
          }
          res.redirect("/admindashboard?message=操作成功");
        }
      );
    }
  });
});*/
app.post("/update2023Icd10Coding", (req, res) => {
  const { ICD10CM, englishName, chineseName } = req.body;
  const currentAdminname = req.session.adminname;
  const checkQuery = "SELECT * FROM `icd-10-cm_pcs` WHERE `2023_ICD-10-CM` = ?";

  function recordAdminUpdate(updateMessage) {
    const insertHistoryQuery =
      "INSERT INTO adminUpdateHistory (updateAdmin, updateMessage) VALUES (?, ?)";
    connection.query(
      insertHistoryQuery,
      [currentAdminname, updateMessage],
      (err, results) => {
        if (err) {
          console.error("無法記錄管理員更新歷史", err);
        }
      }
    );
  }

  connection.query(checkQuery, [ICD10CM], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send("資料庫查詢錯誤");
    }

    if (results.length > 0) {
      // 記錄存在，更新資料
      const updateQuery =
        "UPDATE `icd-10-cm_pcs` SET `2023_ICD-10-CM_english_name` = ?, `2023_ICD-10-CM_chinses_name` = ?, `2023_ICD-10-CM_description` = ? WHERE `2023_ICD-10-CM` = ?";
      const description = englishName + " " + chineseName;
      connection.query(
        updateQuery,
        [englishName, chineseName, description, ICD10CM],
        (err, results) => {
          if (err) {
            console.error(err);
            return res.status(500).send("無法更新資料");
          }
          recordAdminUpdate(
            `更新(2023版本): 編碼: ${ICD10CM}, 英文名稱: ${englishName}, 中文名稱: ${chineseName}`
          );
          res.redirect("/admindashboard?message=操作成功");
        }
      );
    } else {
      // 記錄不存在，插入新資料
      const insertQuery =
        "INSERT INTO `icd-10-cm_pcs` (`2023_ICD-10-CM`, `2023_ICD-10-CM_english_name`, `2023_ICD-10-CM_chinses_name`, `2023_ICD-10-CM_description`) VALUES (?, ?, ?, ?)";
      const description = englishName + " " + chineseName;
      connection.query(
        insertQuery,
        [ICD10CM, englishName, chineseName, description],
        (err, results) => {
          if (err) {
            console.error(err);
            return res.status(500).send("無法插入資料");
          }
          recordAdminUpdate(
            `插入(2023版本): 編碼: ${ICD10CM}, 英文名稱: ${englishName}, 英文名稱: ${chineseName}`
          );
          res.redirect("/admindashboard?message=操作成功");
        }
      );
    }
  });
});

// 管理員更新2014ICD10路由
app.post("/update2014Icd10Coding", (req, res) => {
  const { ICD10CM2014, englishName2014, chineseName2014 } = req.body;
  const currentAdminname = req.session.adminname;
  const checkQuery = "SELECT * FROM `icd-10-cm_pcs` WHERE `2014_ICD-10-CM` = ?";
  function recordAdminUpdate(updateMessage) {
    const insertHistoryQuery =
      "INSERT INTO adminUpdateHistory (updateAdmin, updateMessage) VALUES (?, ?)";
    connection.query(
      insertHistoryQuery,
      [currentAdminname, updateMessage],
      (err, results) => {
        if (err) {
          console.error("無法記錄管理員更新歷史", err);
        }
      }
    );
  }

  connection.query(checkQuery, [ICD10CM2014], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send("資料庫查詢錯誤");
    }

    if (results.length > 0) {
      const updateQuery =
        "UPDATE `icd-10-cm_pcs` SET `2014_ICD-10-CM_english_name` = ?, `2014_ICD-10-CM_chinses_name` = ? WHERE `2014_ICD-10-CM` = ?";
      connection.query(
        updateQuery,
        [englishName2014, chineseName2014, ICD10CM2014],
        (err, results) => {
          if (err) {
            console.error(err);
            return res.status(500).send("無法更新資料");
          }
          recordAdminUpdate(
            `更新(2014版本): 編碼: ${ICD10CM2014}, 英文名稱: ${englishName2014}, 中文名稱: ${chineseName2014}`
          );
          res.redirect("/admindashboard?message=操作成功");
        }
      );
    } else {
      const insertQuery = `
  INSERT INTO \`icd-10-cm_pcs\` 
  (\`2014_ICD-10-CM\`, \`2014_ICD-10-CM_english_name\`, \`2014_ICD-10-CM_chinses_name\`,\`2014_ICD-10-CM_description\` ) 
  VALUES 
  (?, ?, ?, ?)`;

      const description2014 = englishName2014 + " " + chineseName2014;
      connection.query(
        insertQuery,
        [ICD10CM2014, englishName2014, chineseName2014, description2014],
        (err, results) => {
          if (err) {
            console.error(err);
            return res.status(500).send("無法插入資料");
          }
          recordAdminUpdate(
            `新增(2014版本): 編碼: ${ICD10CM2014}, 英文名稱: ${englishName2014}, 中文名稱: ${chineseName2014}`
          );
          res.redirect("/admindashboard?message=操作成功");
        }
      );
    }
  });
});

// 刪除2023ICD10路由
app.post("/deleteIcd10Coding", (req, res) => {
  const { ICD10CM } = req.body;

  const updateQuery = `
  UPDATE \`icd-10-cm_pcs\` 
  SET 
    \`2023_ICD-10-CM_english_name\` = NULL,
    \`2023_ICD-10-CM_chinses_name\` = NULL,
    \`2023_ICD-10-CM_description\` = NULL
  WHERE \`2023_ICD-10-CM\` = ?
`;

  connection.query(updateQuery, [ICD10CM], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error updating the record" });
    }
    if (results.affectedRows > 0) {
      res.json({ message: "編碼刪除成功!" });
    } else {
      res.status(404).json({ message: "查無此編碼" });
    }
  });
});

// 搜尋函數
function performSearchInDatabase(query, callback) {
  const sqlQuery = `
  SELECT
    \`2023_ICD-10-CM\`,
    \`2023_ICD-10-CM_english_name\`,
    \`2023_ICD-10-CM_chinses_name\`
  FROM \`icd-10-cm_pcs\`
  WHERE \`2023_ICD-10-CM_description\` LIKE '%${query}%'
`;

  connection.query(sqlQuery, (error, results) => {
    if (error) throw error;
    callback(results);
  });
}
// 2014搜尋函數
function performSearch2014(query, callback) {
  const sqlQuery = `
    SELECT
      \`2014_ICD-10-CM\`,
      \`2014_ICD-10-CM_english_name\`,
      \`2014_ICD-10-CM_chinses_name\`
    FROM \`icd-10-cm_pcs\`
    WHERE \`2014_ICD-10-CM_description\` LIKE '%${query}%'
  `;

  connection.query(sqlQuery, (error, results) => {
    if (error) throw error;
    callback(results);
  });
}

// 更新歷史紀錄函數
function updateSearchHistory(username, newSearch, callback) {
  connection.query(
    "SELECT searchhistory FROM users WHERE username = ?",
    [username],
    (err, results) => {
      if (err) {
        console.error(err);
        return callback(err);
      }

      if (results.length > 0) {
        let searchHistory = results[0].searchhistory || [];
        searchHistory.unshift(newSearch);

        if (searchHistory.length > 10) {
          searchHistory = searchHistory.slice(0, 10);
        }

        connection.query(
          "UPDATE users SET searchhistory = ? WHERE username = ?",
          [JSON.stringify(searchHistory), username],
          (updateErr, updateResults) => {
            if (updateErr) {
              console.error(updateErr);
              return callback(updateErr);
            }
            callback(null);
          }
        );
      } else {
        console.log("用戶未找到");
        callback(new Error("用戶未找到"));
      }
    }
  );
}
//生成驗證碼函數
function generateVerificationCode(length = 6) {
  let code = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    code += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return code;
}

//渲染初始頁面
app.get("/", (req, res) => {
  res.render("login");
});

// 啟動 Express
app.listen(3000, () => {
  console.log("伺服器已啟動 3000。");
});

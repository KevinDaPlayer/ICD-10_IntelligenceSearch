const express = require("express");
const session = require("express-session");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const app = express();
const nodemailer = require("nodemailer");
const axios = require("axios");

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
    /*const query = "SELECT * FROM users WHERE username = ?";*/
    connection.query(
      "SELECT * FROM users WHERE username = ?",
      [username],
      async (error, results, fields) => {
        if (error) {
          console.error(error);
          return res
            .status(500)
            .send(
              '<script>alert("伺服器錯誤!");window.location.href="/login";</script>'
            );
        }

        const user = results[0];
        if (!user) {
          return res.send(
            '<script>alert("查無此用戶!");window.location.href="/login";</script>'
          );
        }

        if (password !== user.password) {
          return res.send(
            '<script>alert("密碼不正確!");window.location.href="/login";</script>'
          );
        }

        req.session.isAuthenticated = true;
        req.session.username = user.username;
        res.redirect("/dashboard");
      }
    );
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send(
        '<script>alert("伺服器錯誤!");window.location.href="/login";</script>'
      );
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
    /*const query = "SELECT * FROM admins WHERE username = ?";*/
    connection.query(
      "SELECT * FROM admins WHERE username = ?",
      [username],
      async (error, results, fields) => {
        if (error) {
          console.error(error);
          return res
            .status(500)
            .send(
              '<script>alert("伺服器錯誤!");window.location.href="/adminlogin";</script>'
            );
        }

        const user = results[0];
        if (!user) {
          return res.send(
            '<script>alert("查無此管理員!");window.location.href="/adminlogin";</script>'
          );
        }
        console.log("輸入的密碼:", password);
        console.log("資料庫的密碼:", user.password);

        if (password !== user.password) {
          return res.send(
            '<script>alert("密碼不正確!");window.location.href="/adminlogin";</script>'
          );
        }
        req.session.adminname = user.username;
        req.session.isAdminAuthenticated = true;
        res.redirect("/admindashboard");
      }
    );
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send(
        '<script>alert("伺服器錯誤!");window.location.href="/adminlogin";</script>'
      );
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

//MAIL發送註冊驗證碼路由
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

//MAIL發送忘記密碼驗證碼路由
app.post("/sendForgetPasswordVerificationCode", async (req, res) => {
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
    subject: "ICD10查詢系統忘記密碼 驗證碼",
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
    return res
      .status(400)
      .send(
        '<script>alert("密碼與再次輸入密碼不一致!");window.location.href="/register";</script>'
      );
  }

  if (req.session.verificationCode !== verificationCode) {
    return res
      .status(400)
      .send(
        '<script>alert("驗證碼不正確!");window.location.href="/register";</script>'
      );
  }

  connection.query(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [email, password],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send("無法儲存用戶資料");
      }

      if (req.session) {
        delete req.session.verificationCode;
      }

      res.send(
        '<script>alert("使用者註冊成功!");window.location.href="/login";</script>'
      );
    }
  );
});

// 進入忘記密碼頁面路由
app.get("/forgetPassword", (req, res) => {
  res.render("forgetPassword");
});
//忘記密碼路由
app.post("/forgetPassword", (req, res) => {
  const { email, password, confirmPassword, verificationCode } = req.body;

  if (password !== confirmPassword) {
    return res.send(
      '<script>alert("新密碼不一致");window.location.href="/forgetPassword";</script>'
    );
  }

  if (req.session.verificationCode !== verificationCode) {
    return res.send(
      '<script>alert("驗證碼不正確");window.location.href="/forgetPassword";</script>'
    );
  }
  connection.query(
    "SELECT * FROM users WHERE username = ?",
    [email],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.send(
          '<script>alert("資料庫查詢錯誤");window.location.href="/forgetPassword";</script>'
        );
      }

      if (results.length === 0) {
        // 用戶不存在
        return res.send(
          '<script>alert("用戶不存在");window.location.href="/forgetPassword";</script>'
        );
      }
      // 用戶存在，更新密碼
      connection.query(
        "UPDATE users SET password = ? WHERE username = ?",
        [password, email],
        (updateErr, updateResults) => {
          if (updateErr) {
            console.error(updateErr);
            return res.send(
              '<script>alert("無法更新密碼");window.location.href="/forgot-password";</script>'
            );
          }
          // 清除 session 中的驗證碼
          if (req.session) {
            delete req.session.verificationCode;
          }
          // 密碼更新成功
          res.send(
            '<script>alert("密碼變更成功");window.location.href="/login";</script>'
          );
        }
      );
    }
  );
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

  if (newpassword !== confirmNewPassword) {
    return res
      .status(400)
      .send(
        '<script>alert("新密碼與確認新密碼不一致!");window.location.href="/changePassword";</script>'
      );
  }

  connection.query(
    "SELECT password FROM users WHERE username = ?",
    [currentUsername],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send(
            '<script>alert("資料庫查詢錯誤!");window.location.href="/changePassword";</script>'
          );
      }

      if (results.length === 0) {
        return res
          .status(400)
          .send(
            '<script>alert("查無此帳號!);window.location.href="/changePassword";</script>'
          );
      }

      const user = results[0];
      if (originpassword !== user.password) {
        return res
          .status(400)
          .send(
            '<script>alert("原密碼不正確!");window.location.href="/changePassword";</script>'
          );
      }

      if (originpassword === newpassword) {
        return res
          .status(400)
          .send(
            '<script>alert("原密碼不能和新密碼相同!");window.location.href="/changePassword";</script>'
          );
      }

      connection.query(
        "UPDATE users SET password = ? WHERE username = ?",
        [newpassword, currentUsername],
        (err, updateResults) => {
          if (err) {
            console.error(err);
            return res.status(500).send("無法更新密碼。");
          }
          res.send(
            '<script>alert("密碼更新成功!");window.location.href="/changePassword";</script>'
          );
        }
      );
    }
  );
});

app.get("/AlSearchDashboard", (req, res) => {
  res.render("AISearch");
});

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
          res.status(500).send("伺服器錯誤");
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

//admin的search路由(無搜尋紀錄)
app.post("/adminSearch", (req, res) => {
  const searchQuery = req.body.searchQuery;
  const range = req.body.range;
  performSearchInDatabase(searchQuery, range, (searchResults2023) => {
    performSearch2014(searchQuery, range, (searchResults2014) => {
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
  const range = req.body.range;
  const currentUsername = req.session.username;

  performSearchInDatabase(searchQuery, range, (searchResults2023) => {
    performSearch2014(searchQuery, range, (searchResults2014) => {
      if (currentUsername) {
        updateSearchHistory(currentUsername, searchQuery, () => {
          connection.query(
            "SELECT searchhistory FROM users WHERE username = ?",
            [currentUsername],
            (err, results) => {
              if (err) {
                console.error("Database query error:", err);
                return;
              }

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
  connection.query(
    "SELECT * FROM adminUpdateHistory ORDER BY updateDate DESC LIMIT 20",
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send("資料庫查詢錯誤");
      }
      res.render("adminUpdateHistory", { updateHistory: results });
    }
  );
});

//管理員更新2023ICD10路由
app.post("/update2023Icd10Coding", (req, res) => {
  const { ICD10CM, englishName, chineseName } = req.body;
  const currentAdminname = req.session.adminname;

  function recordAdminUpdate(updateMessage) {
    connection.query(
      "INSERT INTO adminUpdateHistory (updateAdmin, updateMessage) VALUES (?, ?)",
      [currentAdminname, updateMessage],
      (err, results) => {
        if (err) {
          console.error("無法記錄管理員更新歷史", err);
        }
      }
    );
  }

  connection.query(
    "SELECT * FROM `icd-10-cm_pcs` WHERE `2023_ICD-10-CM` = ?",
    [ICD10CM],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send("資料庫查詢錯誤");
      }

      if (results.length > 0) {
        const description = englishName + " " + chineseName + " " + ICD10CM;
        connection.query(
          "UPDATE `icd-10-cm_pcs` SET `2023_ICD-10-CM_english_name` = ?, `2023_ICD-10-CM_chinses_name` = ?, `2023_ICD-10-CM_description` = ? WHERE `2023_ICD-10-CM` = ?",
          [englishName, chineseName, description, ICD10CM],
          (err, results) => {
            if (err) {
              console.error(err);
              return res.status(500).send("無法更新資料");
            }
            recordAdminUpdate(
              `更新(2023版本): 編碼: ${ICD10CM}, 英文名稱: ${englishName}, 中文名稱: ${chineseName}`
            );
            res.redirect("/admindashboard?message=編碼更新成功");
          }
        );
      } else {
        const description = englishName + " " + chineseName + " " + ICD10CM;
        connection.query(
          "INSERT INTO `icd-10-cm_pcs` (`2023_ICD-10-CM`, `2023_ICD-10-CM_english_name`, `2023_ICD-10-CM_chinses_name`, `2023_ICD-10-CM_description`) VALUES (?, ?, ?, ?)",
          [ICD10CM, englishName, chineseName, description],
          (err, results) => {
            if (err) {
              console.error(err);
              return res.status(500).send("無法插入資料");
            }
            recordAdminUpdate(
              `插入(2023版本): 編碼: ${ICD10CM}, 英文名稱: ${englishName}, 英文名稱: ${chineseName}`
            );
            res.redirect("/admindashboard?message=編碼新增成功");
          }
        );
      }
    }
  );
});

// 管理員更新2014ICD10路由
app.post("/update2014Icd10Coding", (req, res) => {
  const { ICD10CM2014, englishName2014, chineseName2014 } = req.body;
  const currentAdminname = req.session.adminname;
  /*const checkQuery = "SELECT * FROM `icd-10-cm_pcs` WHERE `2014_ICD-10-CM` = ?";*/
  function recordAdminUpdate(updateMessage) {
    /*const insertHistoryQuery =
      "INSERT INTO adminUpdateHistory (updateAdmin, updateMessage) VALUES (?, ?)";*/
    connection.query(
      "INSERT INTO adminUpdateHistory (updateAdmin, updateMessage) VALUES (?, ?)",
      [currentAdminname, updateMessage],
      (err, results) => {
        if (err) {
          console.error("無法記錄管理員更新歷史", err);
        }
      }
    );
  }

  connection.query(
    "SELECT * FROM `icd-10-cm_pcs` WHERE `2014_ICD-10-CM` = ?",
    [ICD10CM2014],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send("資料庫查詢錯誤");
      }

      if (results.length > 0) {
        const description2014 =
          englishName2014 + " " + chineseName2014 + " " + ICD10CM2014;
        connection.query(
          "UPDATE `icd-10-cm_pcs` SET `2014_ICD-10-CM_english_name` = ?, `2014_ICD-10-CM_chinses_name` = ?, `2014_ICD-10-CM_description` = ? WHERE `2014_ICD-10-CM` = ?",
          [englishName2014, chineseName2014, description2014, ICD10CM2014],
          (err, results) => {
            if (err) {
              console.error(err);
              return res.status(500).send("無法更新資料");
            }
            recordAdminUpdate(
              `更新(2014版本): 編碼: ${ICD10CM2014}, 英文名稱: ${englishName2014}, 中文名稱: ${chineseName2014}`
            );
            res.redirect("/admindashboard?message=編碼更新成功");
          }
        );
      } else {
        const insertQuery = `
  INSERT INTO \`icd-10-cm_pcs\` 
  (\`2014_ICD-10-CM\`, \`2014_ICD-10-CM_english_name\`, \`2014_ICD-10-CM_chinses_name\`,\`2014_ICD-10-CM_description\` ) 
  VALUES 
  (?, ?, ?, ?)`;

        const description2014 =
          englishName2014 + " " + chineseName2014 + " " + ICD10CM2014;
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
            res.redirect("/admindashboard?message=編碼新增成功");
          }
        );
      }
    }
  );
});

// 刪除2023ICD10路由
app.post("/deleteIcd10Coding", (req, res) => {
  const { ICD10CM } = req.body;
  const currentAdminname = req.session.adminname;

  function recordAdminUpdate(updateMessage) {
    connection.query(
      "INSERT INTO adminUpdateHistory (updateAdmin, updateMessage) VALUES (?, ?)",
      [currentAdminname, updateMessage],
      (err, results) => {
        if (err) {
          console.error("無法記錄管理員更新歷史", err);
        }
      }
    );
  }

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
      // 記錄刪除的編碼到管理員更新歷史
      recordAdminUpdate(`刪除編碼(2023): ${ICD10CM}`);
      res.json({ message: "編碼刪除成功!" });
    } else {
      res.status(404).json({ message: "查無此編碼" });
    }
  });
});

// 刪除2014ICD10路由
app.post("/delete2014Icd10Coding", (req, res) => {
  const { ICD10CM2014 } = req.body;
  const currentAdminname = req.session.adminname;

  // 這個函數用於記錄管理員的更新歷史
  function recordAdminUpdate(updateMessage) {
    connection.query(
      "INSERT INTO adminUpdateHistory (updateAdmin, updateMessage) VALUES (?, ?)",
      [currentAdminname, updateMessage],
      (err, results) => {
        if (err) {
          console.error("無法記錄管理員更新歷史", err);
        }
      }
    );
  }

  // 更新資料庫中的記錄，將相關欄位設為 NULL
  const updateQuery = `
    UPDATE \`icd-10-cm_pcs\` 
    SET 
      \`2014_ICD-10-CM_english_name\` = NULL,
      \`2014_ICD-10-CM_chinses_name\` = NULL,
      \`2014_ICD-10-CM_description\` = NULL
    WHERE \`2014_ICD-10-CM\` = ?
  `;

  connection.query(updateQuery, [ICD10CM2014], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error updating the record" });
    }

    if (results.affectedRows > 0) {
      // 記錄刪除的編碼到管理員更新歷史
      recordAdminUpdate(`刪除編碼(2014): ${ICD10CM2014}`);
      res.json({ message: "編碼刪除成功!" });
    } else {
      res.status(404).json({ message: "查無此編碼" });
    }
  });
});
// //this is for replicate api-key version
// app.post("/AISearch", (req, res) => {
//   const userInput = req.body.diagnosis;
//   axios
//     .post(
//       "http://localhost:5000/predict_icd10",
//       { prompt: userInput },
//       {
//         headers: { "Content-Type": "application/json" },
//       }
//     )
//     .then((response) => {
//       console.log("Data from Flask:", response.data.result);

//       const predictText = response.data.result;
//       const regex = /\d+\.\s([^:]+)\s:\s([^;]+);\s(.+)/g;
//       const predictions = [];

//       let matches;
//       while ((matches = regex.exec(predictText)) !== null) {
//         predictions.push({
//           code: matches[1].trim(),
//           description: matches[2].trim(),
//           detail: matches[3].trim(),
//         });
//       }

//       res.render("AISearch", { results: predictions, userInput: userInput });
//     })
//     .catch((error) => {
//       console.error(error);
//       res.status(500).render("AISearch", { results: "伺服器錯誤" });
//     });
// });

app.post("/AISearch", (req, res) => {
  const userInput = req.body.diagnosis;

  axios
    .post(
      "http://localhost:5000/rag",
      { question: userInput },
      {
        headers: { "Content-Type": "application/json" },
      }
    )
    .then((response) => {
      console.log("Data from Flask:", response.data);

      const predictions = response.data.topFiveICD10Codes.map((item) => ({
        code: item.code,
        description: item.description,
        detail: item.detail,
      }));

      res.render("AISearch", { results: predictions, userInput: userInput });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).render("AISearch", { results: "伺服器錯誤" });
    });
});

function performSearchInDatabase(query, range, callback) {
  const keywords = query.split(" ");
  const likeSql = keywords.map(
    (keyword) => `\`2023_ICD-10-CM_description\` LIKE ?`
  );
  const param = keywords.map((keyword) => `%${keyword}%`);
  const allSql = likeSql.join(" AND ");

  let rangeCondition = "";
  if (range) {
    const [start, end] = range.split("-");
    rangeCondition = `AND \`2023_ICD-10-CM\` BETWEEN ? AND ?`;
    param.push(start, end);
  }

  const sqlQuery = `
  SELECT
    \`2023_ICD-10-CM\`,
    \`2023_ICD-10-CM_english_name\`,
    \`2023_ICD-10-CM_chinses_name\`
  FROM \`icd-10-cm_pcs\`
  WHERE ${allSql} ${rangeCondition}
`;

  connection.query(sqlQuery, param, (error, results) => {
    if (error) throw error;
    callback(results);
  });
}

function performSearch2014(query, range, callback) {
  const keywords = query.split(" ");
  const likeSql = keywords.map(
    (keywords) => `\`2014_ICD-10-CM_description\` LIKE ?`
  );
  const param = keywords.map((keyword) => `%${keyword}%`);

  const allSql = likeSql.join(" AND ");

  let rangeCondition = "";
  if (range) {
    const [start, end] = range.split("-");
    rangeCondition = `AND \`2014_ICD-10-CM\` BETWEEN ? AND ?`;
    param.push(start, end);
  }

  const sqlQuery = `
    SELECT
      \`2014_ICD-10-CM\`,
      \`2014_ICD-10-CM_english_name\`,
      \`2014_ICD-10-CM_chinses_name\`
    FROM \`icd-10-cm_pcs\`
    WHERE ${allSql} ${rangeCondition}
  `;

  connection.query(sqlQuery, param, (error, results) => {
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

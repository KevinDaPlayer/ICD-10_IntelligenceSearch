const express = require("express");
const session = require("express-session");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const app = express();

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

// 主頁路由
app.get("/dashboard", (req, res) => {
  if (req.session.isAuthenticated) {
    res.render("userhomepage");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(function (err) {
    res.redirect("/login");
  });
});

// search路由
/*app.post("/search", (req, res) => {
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
app.post("/search", (req, res) => {
  const searchQuery = req.body.searchQuery;
  const currentUsername = req.session.username; // 從會話中獲取當前用戶名
  console.log(req.body.searchQuery);

  // 對 2023 版本進行搜尋
  performSearchInDatabase(searchQuery, (searchResults2023) => {
    // 對 2014 版本進行搜尋
    performSearch2014(searchQuery, (searchResults2014) => {
      // 無論 2023 版本的搜尋結果如何，都會執行 2014 版本的搜尋
      res.render("userhomepage", {
        searchResults: searchResults2023.length > 0 ? searchResults2023 : [],
        searchResults2014:
          searchResults2014.length > 0 ? searchResults2014 : [],
      });
    });
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
function updateSearchHistory(username, newSearch) {
  // 從資料庫獲取當前用戶的 searchhistory
  connection.query(
    "SELECT searchhistory FROM users WHERE username = ?",
    [username],
    (err, results) => {
      if (err) throw err;

      // 確保找到了用戶記錄
      if (results.length > 0) {
        let searchHistory = results[0].searchhistory || [];

        // 添加新的搜尋條目到陣列開頭
        searchHistory.unshift(newSearch);

        // 保留最新的 10 筆條目
        if (searchHistory.length > 10) {
          searchHistory = searchHistory.slice(0, 10);
        }

        // 更新資料庫
        connection.query(
          "UPDATE users SET searchhistory = ? WHERE username = ?",
          [JSON.stringify(searchHistory), username],
          (err, updateResults) => {
            if (err) throw err;
            // searchhistory 更新成功
          }
        );
      } else {
        // 處理用戶未找到的情況
        console.log("用戶未找到");
      }
    }
  );
}

//渲染初始頁面
app.get("/", (req, res) => {
  res.render("login");
});

// 啟動 Express
app.listen(3000, () => {
  console.log("服务器已启动在端口 3000。");
});

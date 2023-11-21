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
    console.error("数据库连接失败:", err);
  } else {
    console.log("数据库连接成功");
  }
});
//LOGIN
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  try {
    const query = "SELECT * FROM users WHERE username = ?";
    connection.query(query, [username], async (error, results, fields) => {
      if (error) {
        console.error(error);
        return res.status(500).send("服务器错误。");
      }

      const user = results[0];
      if (!user) {
        return res.send("用户不存在。");
      }
      console.log("輸入的密碼:", password);
      console.log("數據庫的密碼:", user.password);

      // 检查用户输入的密码是否与数据库中的密码匹配
      if (password !== user.password) {
        return res.send("密码不正确。");
      }

      // 将用户标记为已经登录
      req.session.isAuthenticated = true;

      // 重定向到主画面
      res.redirect("/dashboard");
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("服务器错误。");
  }
});

// 主画面路由
app.get("/dashboard", (req, res) => {
  // 检查用户是否已登录
  if (req.session.isAuthenticated) {
    // 用户已登录，重定向到主画面
    res.render("userhomepage");
  } else {
    // 用户未登录，重定向到登录页或其他处理
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(function (err) {
    res.redirect("/login");
  });
});

app.get("/", (req, res) => {
  res.render("login");
});

// 启动 Express 服务器
app.listen(3000, () => {
  console.log("服务器已启动在端口 3000。");
});

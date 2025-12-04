// server.js - 暖心記帳本後端（MongoDB Atlas + Express）

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL;

// 連線 MongoDB Atlas
mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("✅ 已連線到 MongoDB Atlas");
  })
  .catch((err) => {
    console.error("❌ 連線 MongoDB 失敗：", err);
  });

// 定義資料 Schema
const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true }, // yyyy-mm-dd
  category: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Expense = mongoose.model("Expense", expenseSchema);

// 中介層
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- API 路由 ---

// 取得所有支出
app.get("/api/expenses", async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ date: -1, createdAt: -1 });
    res.json(expenses);
  } catch (err) {
    console.error("取得支出資料失敗：", err);
    res.status(500).json({ error: "取得支出資料失敗" });
  }
});

// 新增支出
app.post("/api/expenses", async (req, res) => {
  try {
    const { title, amount, date, category } = req.body;
    if (!title || !amount || !date || !category) {
      return res.status(400).json({ error: "請確認欄位是否填寫完整" });
    }

    const expense = new Expense({
      title,
      amount,
      date,
      category,
    });

    const saved = await expense.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("新增支出失敗：", err);
    res.status(500).json({ error: "新增支出失敗" });
  }
});

// 刪除支出
app.delete("/api/expenses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Expense.findByIdAndDelete(id);
    res.json({ message: "刪除成功" });
  } catch (err) {
    console.error("刪除支出失敗：", err);
    res.status(500).json({ error: "刪除支出失敗" });
  }
});

// 讓前端路由都回到 index.html（放在最後一個）
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 伺服器已啟動：http://localhost:${PORT}`);
});

// server.js
// Node.js + Express + MongoDB Atlas 後端
// 提供簡單的 REST API：/api/expenses

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// 連線 MongoDB Atlas
const mongoUrl = process.env.MONGO_URL;
if (!mongoUrl) {
  console.error("請在 .env 檔案中設定 MONGO_URL");
  process.exit(1);
}

mongoose
  .connect(mongoUrl)
  .then(() => console.log("✅ 已連線到 MongoDB Atlas"))
  .catch((err) => {
    console.error("❌ 連線 MongoDB 失敗：", err);
    process.exit(1);
  });

const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true }, // yyyy-MM-dd
  category: { type: String, required: true },
  createdAt: { type: Number, default: Date.now },
});

const Expense = mongoose.model("Expense", expenseSchema);

// 取得所有支出
app.get("/api/expenses", async (req, res) => {
  try {
    const list = await Expense.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    console.error("取得支出資料失敗：", err);
    res.status(500).json({ error: "server error" });
  }
});

// 新增支出
app.post("/api/expenses", async (req, res) => {
  try {
    const { title, amount, date, category, createdAt } = req.body;
    if (!title || !amount || !date || !category) {
      return res.status(400).json({ error: "missing fields" });
    }
    const expense = new Expense({
      title,
      amount,
      date,
      category,
      createdAt: createdAt || Date.now(),
    });
    const saved = await expense.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("新增支出失敗：", err);
    res.status(500).json({ error: "server error" });
  }
});

// 刪除支出
app.delete("/api/expenses/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await Expense.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    console.error("刪除支出失敗：", err);
    res.status(500).json({ error: "server error" });
  }
});

// 靜態檔案
app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 伺服器已啟動：http://localhost:${PORT}`);
});

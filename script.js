// 暖心記帳本 - MongoDB Atlas 版本 + 可愛主題 + 本週分析圖

const API_BASE = "/api/expenses";

const expenseForm = document.getElementById("expenseForm");
const titleInput = document.getElementById("title");
const amountInput = document.getElementById("amount");
const dateInput = document.getElementById("date");
const categorySelect = document.getElementById("category");

const filterMonthSelect = document.getElementById("filterMonth");
const filterCategorySelect = document.getElementById("filterCategory");

const expenseList = document.getElementById("expenseList");
const summaryMonthLabel = document.getElementById("summaryMonth");
const monthTotalLabel = document.getElementById("monthTotal");
const categorySummaryDiv = document.getElementById("categorySummary");
const mascotMessageEl = document.getElementById("mascotMessage");

let state = { expenses: [] };
let weeklyCategoryChart = null;
let weeklyDailyChart = null;

// --- 日期工具函式 ---

function setTodayAsDefaultDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  dateInput.value = `${yyyy}-${mm}-${dd}`;
}

function getMonthKey(dateStr) {
  if (!dateStr) return "未知月份";
  const [year, month] = dateStr.split("-");
  return `${year}-${month}`;
}

function formatMonthLabel(monthKey) {
  if (!monthKey || !monthKey.includes("-")) return monthKey;
  const [year, month] = monthKey.split("-");
  return `${year} 年 ${month} 月`;
}

function getDefaultMonthKey() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

// --- 暖心提醒 ---

const catMessages = [
  "喵～今天也來記一筆，未來就有更多小零食可以買了 🐟",
  "存下來的小錢，可以變成未來的一大碗罐罐喔！",
  "不要小看每一筆 50 元，貓貓都在幫你默默加總～"
];

const dogMessages = [
  "汪！今天也有好好照顧荷包，真是乖孩子 🐾",
  "每記一筆支出，就離夢想又近一點點！",
  "汪汪提醒：偶爾也要獎勵自己一點點，但要量力而為喔。"
];

const momMessages = [
  "孩子，錢不是長在樹上的喔，記帳就是在照顧未來的自己 👩",
  "這週餐飲有點多喔～要不要考慮自己煮幾餐？",
  "看到你認真記帳，媽媽是真的很欣慰！"
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function updateMascotMessageOnAdd(amount, category) {
  let prefixEmoji = "";
  let msg = "";

  if (category === "餐飲") {
    prefixEmoji = "👩";
    msg = pickRandom(momMessages);
  } else if (category === "娛樂" || category === "購物") {
    prefixEmoji = "🐱";
    msg = pickRandom(catMessages);
  } else {
    prefixEmoji = "🐶";
    msg = pickRandom(dogMessages);
  }

  mascotMessageEl.textContent = `${prefixEmoji} ${msg}（剛剛那筆是 NT$ ${amount} ）`;
}

// --- 篩選與渲染 ---

function renderMonthOptions() {
  const months = Array.from(
    new Set(state.expenses.map((e) => getMonthKey(e.date)))
  ).filter((m) => m !== "未知月份");

  months.sort().reverse();

  filterMonthSelect.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "所有月份";
  filterMonthSelect.appendChild(allOption);

  months.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = formatMonthLabel(m);
    filterMonthSelect.appendChild(opt);
  });

  if (months.length > 0) {
    filterMonthSelect.value = months[0];
  } else {
    filterMonthSelect.value = "all";
  }
}

function getFilteredExpenses() {
  const monthFilter = filterMonthSelect.value;
  const categoryFilter = filterCategorySelect.value;

  return state.expenses.filter((e) => {
    const monthMatch =
      monthFilter === "all" || getMonthKey(e.date) === monthFilter;
    const categoryMatch =
      categoryFilter === "all" || e.category === categoryFilter;
    return monthMatch && categoryMatch;
  });
}

function renderExpenseList() {
  expenseList.innerHTML = "";
  const list = getFilteredExpenses();

  if (list.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "目前沒有資料，先新增一筆支出吧！";
    empty.style.fontSize = "13px";
    empty.style.color = "#e5e7eb";
    expenseList.appendChild(empty);
    return;
  }

  list
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .forEach((exp) => {
      const li = document.createElement("li");
      li.className = "expense-item";

      const main = document.createElement("div");
      main.className = "expense-main";

      const title = document.createElement("div");
      title.className = "expense-title";
      title.textContent = exp.title;

      const meta = document.createElement("div");
      meta.className = "expense-meta";
      meta.textContent = `${exp.date} · ${exp.category}`;

      main.appendChild(title);
      main.appendChild(meta);

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.flexDirection = "column";
      right.style.alignItems = "flex-end";
      right.style.gap = "4px";

      const amount = document.createElement("div");
      amount.className = "expense-amount";
      amount.textContent = `NT$ ${exp.amount.toLocaleString()}`;

      const btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.alignItems = "center";

      const btn = document.createElement("button");
      btn.className = "btn-delete";
      btn.textContent = "刪除";
      btn.addEventListener("click", () => handleDeleteExpense(exp));

      btnRow.appendChild(btn);

      right.appendChild(amount);
      right.appendChild(btnRow);

      li.appendChild(main);
      li.appendChild(right);

      expenseList.appendChild(li);
    });
}

function renderSummary() {
  const monthFilter =
    filterMonthSelect.value === "all"
      ? getDefaultMonthKey()
      : filterMonthSelect.value;

  const monthExpenses = state.expenses.filter(
    (e) => getMonthKey(e.date) === monthFilter
  );

  const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  monthTotalLabel.textContent = `NT$ ${total.toLocaleString()}`;
  summaryMonthLabel.textContent =
    monthExpenses.length > 0
      ? formatMonthLabel(monthFilter)
      : "目前沒有當月資料";

  const categoryTotals = {};
  monthExpenses.forEach((e) => {
    categoryTotals[e.category] =
      (categoryTotals[e.category] || 0) + e.amount;
  });

  categorySummaryDiv.innerHTML = "";
  const entries = Object.entries(categoryTotals);
  if (entries.length === 0) {
    categorySummaryDiv.textContent = "各分類合計會顯示在這裡。";
    return;
  }

  entries.forEach(([cat, amt]) => {
    const chip = document.createElement("span");
    chip.className = "category-chip";
    chip.textContent = `${cat}：NT$ ${amt.toLocaleString()}`;
    categorySummaryDiv.appendChild(chip);
  });
}

// --- 本週圖表 ---

function renderWeeklyCharts() {
  const now = new Date();
  const startOfWeek = new Date(now);
  const day = now.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = day === 0 ? -6 : 1 - day;
  startOfWeek.setDate(now.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const weekData = state.expenses.filter((e) => {
    const d = new Date(e.date);
    d.setHours(0, 0, 0, 0);
    return d >= startOfWeek && d <= now;
  });

  const categoryTotals = {};
  weekData.forEach((e) => {
    categoryTotals[e.category] =
      (categoryTotals[e.category] || 0) + e.amount;
  });

  const dailyTotals = {};
  const labels = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const key = d.toISOString().split("T")[0];
    dailyTotals[key] = 0;
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }

  weekData.forEach((e) => {
    const d = new Date(e.date);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().split("T")[0];
    if (dailyTotals[key] !== undefined) {
      dailyTotals[key] += e.amount;
    }
  });

  const catCanvas = document.getElementById("weeklyCategoryChart");
  if (weeklyCategoryChart) weeklyCategoryChart.destroy();

  weeklyCategoryChart = new Chart(catCanvas, {
    type: "pie",
    data: {
      labels: Object.keys(categoryTotals),
      datasets: [
        {
          data: Object.values(categoryTotals),
          backgroundColor: [
            "#ffb4c8",
            "#ffd6a5",
            "#ffe8a1",
            "#c5f0b0",
            "#a7d8ff",
            "#d4c1ff",
          ],
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          labels: {
            color: "#f9fafb",
            font: { size: 11 },
          },
        },
      },
    },
  });

  const dayCanvas = document.getElementById("weeklyDailyChart");
  if (weeklyDailyChart) weeklyDailyChart.destroy();

  weeklyDailyChart = new Chart(dayCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "每日消費 (NT$)",
          data: Object.values(dailyTotals),
          backgroundColor: "#a7d8ff",
        },
      ],
    },
    options: {
      scales: {
        x: {
          ticks: { color: "#e5e7eb", font: { size: 10 } },
          grid: { display: false },
        },
        y: {
          ticks: { color: "#e5e7eb", font: { size: 10 } },
          grid: { color: "rgba(148, 163, 184, 0.3)" },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "#f9fafb",
            font: { size: 11 },
          },
        },
      },
    },
  });
}

// --- 後端 API ---

async function fetchExpenses() {
  const res = await fetch(API_BASE);
  if (!res.ok) {
    throw new Error("載入支出資料失敗");
  }
  const data = await res.json();
  state.expenses = data;
}

async function createExpense(expense) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(expense),
  });
  if (!res.ok) {
    throw new Error("新增支出失敗");
  }
  const data = await res.json();
  return data;
}

async function deleteExpense(id) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("刪除支出失敗");
  }
}

async function handleDeleteExpense(exp) {
  const ok = confirm("確定要刪除這筆支出嗎？");
  if (!ok) return;

  try {
    await deleteExpense(exp._id);
    state.expenses = state.expenses.filter((e) => e._id !== exp._id);
    refreshUI();
  } catch (err) {
    console.error(err);
    alert("刪除時發生錯誤，請稍後再試。");
  }
}

// --- 表單送出 ---

expenseForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const amount = Number(amountInput.value);
  const date = dateInput.value;
  const category = categorySelect.value;

  if (!title || !date || !amount || amount <= 0) {
    alert("請確認項目名稱、日期與金額都已填寫。");
    return;
  }

  const expense = {
    title,
    amount,
    date,
    category,
    createdAt: Date.now(),
  };

  try {
    const created = await createExpense(expense);
    state.expenses.unshift(created);
    titleInput.value = "";
    amountInput.value = "";
    updateMascotMessageOnAdd(amount, category);
    refreshUI();
  } catch (err) {
    console.error(err);
    alert("新增時發生錯誤，請稍後再試。");
  }
});

// 篩選變更

filterMonthSelect.addEventListener("change", () => {
  renderExpenseList();
  renderSummary();
  renderWeeklyCharts();
});

filterCategorySelect.addEventListener("change", () => {
  renderExpenseList();
});

// --- UI 更新 ---

function refreshUI() {
  renderMonthOptions();
  renderExpenseList();
  renderSummary();
  renderWeeklyCharts();
}

// --- 初始化 ---

async function init() {
  setTodayAsDefaultDate();
  try {
    await fetchExpenses();
  } catch (err) {
    console.error(err);
    alert("載入資料時發生錯誤，請確認後端伺服器是否啟動。");
  }
  refreshUI();
}

init();

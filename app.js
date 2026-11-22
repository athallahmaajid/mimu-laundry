const SERVICE_RATES = {
  "damp-wash": { label: "Cuci lembab", rate: 10000, packageWeight: 7 },
  "dry-wash": { label: "Cuci kering", rate: 20000, packageWeight: 7 },
  "dry-fold": { label: "Cuci kering + lipat", rate: 24000, packageWeight: 7 },
  ironing: { label: "Setrika", rate: 4500 },
  complete: { label: "Komplit", rate: 5500 },
};

const STORAGE_KEY = "bersih-studio-orders";
const EXPENSE_STORAGE_KEY = "bersih-studio-expenses";
const form = document.querySelector("#order-form");
const nameInput = document.querySelector("#customer-name");
const addressInput = document.querySelector("#customer-address");
const weightInput = document.querySelector("#weight");
const serviceInput = document.querySelector("#service");
const rateLabel = document.querySelector("#rate-label");
const estimatePrice = document.querySelector("#estimate-price");
const printButton = document.querySelector("#print-button");
const toast = document.querySelector("#toast");
const expenseForm = document.querySelector("#expense-form");
let currentOrder = null;
let toastTimeout;

const formatCurrency = (amount) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

const getSelectedMethod = () =>
  form.querySelector('input[name="method"]:checked').value;

const getOrderDetails = () => {
  const service = SERVICE_RATES[serviceInput.value];
  const weight = Number.parseFloat(weightInput.value);
  const method = getSelectedMethod();
  const address = method === "Antar" ? addressInput.value.trim() : "";
  const total = Number.isFinite(weight)
    ? Math.round(
        service.packageWeight
          ? (weight * service.rate) / service.packageWeight
          : weight * service.rate,
      )
    : 0;
  return {
    name: nameInput.value.trim(),
    address,
    method,
    weight: Number.isFinite(weight) ? weight : 0,
    service,
    total,
  };
};

const updateReceipt = () => {
  const details = getOrderDetails();
  const date = currentOrder?.createdAt
    ? new Date(currentOrder.createdAt)
    : new Date();
  document.querySelector("#receipt-number").textContent =
    currentOrder?.id ?? "Akan dibuat";
  document.querySelector("#receipt-date").textContent = new Intl.DateTimeFormat(
    "id-ID",
    { dateStyle: "medium", timeStyle: "short" },
  ).format(date);
  document.querySelector("#receipt-name").textContent =
    details.name || "Nama pelanggan";
  document.querySelector("#receipt-address-label").textContent =
    details.method === "Antar" ? "Alamat pengantaran" : "Alamat penjemputan";
  document.querySelector("#receipt-address").textContent =
    details.address || "Alamat akan tampil di sini";
  document.querySelector("#receipt-address-block").hidden =
    details.method !== "Antar";
  document.querySelector("#receipt-method").textContent = details.method;
  document.querySelector("#receipt-service").textContent = details.service.label;
  document.querySelector("#receipt-weight").textContent =
    details.service.packageWeight
      ? `${details.weight || 0} kg × ${formatCurrency(details.service.rate)} / ${details.service.packageWeight} kg`
      : `${details.weight || 0} kg × ${formatCurrency(details.service.rate)} / kg`;
  document.querySelector("#receipt-subtotal").textContent = formatCurrency(details.total);
  document.querySelector("#receipt-total").textContent = formatCurrency(details.total);
  rateLabel.textContent = details.service.packageWeight
    ? `${details.service.packageWeight} kg / ${formatCurrency(details.service.rate)}`
    : `${formatCurrency(details.service.rate)} / kg`;
  document.querySelector("#price-note").textContent =
    details.service.packageWeight
      ? `Tarif paket ${details.service.packageWeight} kg; kelebihan dihitung prorata.`
      : "Harga dihitung berdasarkan berat pakaian.";
  estimatePrice.textContent = formatCurrency(details.total);
};

const updateAddressLabel = () => {
  const method = getSelectedMethod();
  const delivery = method === "Antar";
  document.querySelector("#address-label").textContent = delivery
    ? "Alamat pengantaran"
    : "Alamat penjemputan";
  document.querySelector("#address-hint").textContent = delivery
    ? "Alamat tujuan pengantaran pakaian yang sudah selesai."
    : "Alamat tidak diperlukan untuk layanan jemput.";
  addressInput.placeholder = delivery
    ? "Alamat tujuan, nama penerima, kecamatan..."
    : "Alamat tidak diperlukan untuk jemput";
  addressInput.disabled = !delivery;
  addressInput.required = delivery;
  document.querySelector("#address-required").hidden = !delivery;
  document.querySelector("#address-field").classList.toggle("is-disabled", !delivery);
  document.querySelectorAll(".delivery-option").forEach((option) => {
    const radio = option.querySelector("input");
    option.classList.toggle("selected", radio.checked);
  });
  updateReceipt();
};

const getOrders = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  const orders = JSON.parse(stored);
  if (!Array.isArray(orders)) {
    throw new Error("Data pesanan tersimpan tidak valid.");
  }
  return orders;
};

const renderHistory = () => {
  const orders = getOrders();
  const historyList = document.querySelector("#history-list");
  document.querySelector("#history-count").textContent = String(orders.length);
  const today = new Date().toDateString();
  const todaysOrders = orders.filter(
    (order) => new Date(order.createdAt).toDateString() === today,
  ).length;
  document.querySelector("#today-count").textContent = `${todaysOrders} pesanan`;

  if (orders.length === 0) {
    historyList.innerHTML =
      '<div class="history-empty">Belum ada transaksi. Pesanan yang disimpan akan muncul di sini.</div>';
    return;
  }

  historyList.replaceChildren(
    ...orders.slice(0, 8).map((order) => {
      const item = document.createElement("div");
      item.className = "history-item";
      const icon = document.createElement("span");
      icon.className = "history-icon";
      icon.textContent = "✓";
      const info = document.createElement("span");
      info.className = "history-info";
      const customer = document.createElement("strong");
      customer.textContent = order.name;
      const meta = document.createElement("small");
      meta.textContent = `${order.id} · ${order.weight} kg · ${order.service.label}`;
      const price = document.createElement("span");
      price.className = "history-price";
      price.textContent = formatCurrency(order.total);
      info.append(customer, meta);
      item.append(icon, info, price);
      return item;
    }),
  );
};

const renderOrderHistory = () => {
  const orders = getOrders();
  const orderHistoryList = document.querySelector("#order-history-list");
  const pendingCount = orders.filter((order) => !order.collected).length;
  document.querySelector("#pending-order-count").textContent =
    `${pendingCount} pesanan`;
  document.querySelector("#all-order-count").textContent =
    `${orders.length} pesanan`;

  if (orders.length === 0) {
    orderHistoryList.innerHTML =
      '<div class="history-empty">Belum ada pesanan yang tersimpan.</div>';
    return;
  }

  orderHistoryList.replaceChildren(
    ...orders.map((order) => {
      const item = document.createElement("article");
      item.className = "order-history-item";
      if (order.collected) item.classList.add("is-collected");

      const details = document.createElement("div");
      details.className = "order-history-details";
      const customer = document.createElement("strong");
      customer.className = "order-history-customer";
      customer.textContent = order.name;
      const meta = document.createElement("span");
      meta.className = "order-history-meta";
      const createdAt = new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(order.createdAt));
      meta.textContent = `${order.id} · ${createdAt}`;
      const service = document.createElement("span");
      service.className = "order-history-service";
      service.textContent =
        `${order.service.label} · ${order.weight} kg · ${order.method}`;
      details.append(customer, meta, service);
      if (order.method === "Antar" && order.address) {
        const address = document.createElement("span");
        address.className = "order-history-address";
        address.textContent = `Alamat pengantaran: ${order.address}`;
        details.append(address);
      }

      const total = document.createElement("strong");
      total.className = "order-history-total";
      total.textContent = formatCurrency(order.total);

      const pickupLabel = document.createElement("label");
      pickupLabel.className = "pickup-status";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(order.collected);
      checkbox.dataset.orderId = order.id;
      checkbox.setAttribute("aria-label", `Pesanan ${order.id} sudah diambil pelanggan`);
      const checkboxText = document.createElement("span");
      checkboxText.textContent = order.collected ? "Sudah diambil" : "Belum diambil";
      pickupLabel.append(checkbox, checkboxText);
      item.append(details, total, pickupLabel);
      return item;
    }),
  );
};

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 2800);
};

const getExpenses = () => {
  const stored = localStorage.getItem(EXPENSE_STORAGE_KEY);
  if (!stored) return [];
  const expenses = JSON.parse(stored);
  if (!Array.isArray(expenses)) {
    throw new Error("Data pengeluaran tersimpan tidak valid.");
  }
  return expenses;
};

const renderExpenses = () => {
  const expenses = getExpenses();
  const today = new Date().toDateString();
  const todaysExpenses = expenses.filter(
    (expense) => new Date(expense.createdAt).toDateString() === today,
  );
  const total = todaysExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const expenseList = document.querySelector("#expense-list");

  document.querySelector("#expense-total").textContent = formatCurrency(total);
  document.querySelector("#expense-count").textContent = String(todaysExpenses.length);

  if (todaysExpenses.length === 0) {
    expenseList.innerHTML =
      '<div class="history-empty">Belum ada pengeluaran yang dicatat hari ini.</div>';
    return;
  }

  expenseList.replaceChildren(
    ...todaysExpenses.map((expense) => {
      const item = document.createElement("article");
      item.className = "expense-item";
      const details = document.createElement("div");
      details.className = "expense-item-details";
      const name = document.createElement("strong");
      name.textContent = expense.name;
      const meta = document.createElement("small");
      const time = new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(expense.createdAt));
      meta.textContent = expense.note ? `${time} · ${expense.note}` : time;
      const amount = document.createElement("strong");
      amount.className = "expense-item-amount";
      amount.textContent = formatCurrency(expense.amount);
      details.append(name, meta);
      item.append(details, amount);
      return item;
    }),
  );
};

const activatePage = (pageId) => {
  const targetPage = document.getElementById(pageId);
  if (!targetPage?.classList.contains("admin-page")) return;

  document.querySelectorAll(".admin-page").forEach((page) => {
    page.hidden = page !== targetPage;
  });
  document.querySelectorAll(".nav-item[data-page]").forEach((navItem) => {
    const active = navItem.dataset.page === pageId;
    navItem.classList.toggle("active", active);
    if (active) navItem.setAttribute("aria-current", "page");
    else navItem.removeAttribute("aria-current");
  });
  document.querySelector("#breadcrumb-page").textContent =
    pageId === "pengeluaran-harian-page"
      ? "Pengeluaran Harian"
      : pageId === "history-page"
        ? "History"
        : "Kasir";
  if (pageId === "history-page") renderOrderHistory();
};

document.querySelectorAll(".nav-item[data-page]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const targetPage = link.dataset.page;
    if (!targetPage) return;
    activatePage(targetPage);
    window.history.replaceState(null, "", link.getAttribute("href"));
  });
});
activatePage(window.location.hash.slice(1) || "kasir-page");

expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!expenseForm.reportValidity()) return;

  const name = document.querySelector("#expense-name").value.trim();
  const amount = Number.parseInt(
    document.querySelector("#expense-amount").value,
    10,
  );
  const note = document.querySelector("#expense-note").value.trim();
  if (!name || !Number.isSafeInteger(amount) || amount <= 0) return;

  const expenses = getExpenses();
  expenses.unshift({
    id: `EXP-${Date.now().toString().slice(-7)}`,
    name,
    amount,
    note,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(expenses));
  expenseForm.reset();
  renderExpenses();
  showToast("Pengeluaran berhasil dicatat.");
});

document.querySelector("#order-history-list").addEventListener("change", (event) => {
  const checkbox = event.target;
  if (!(checkbox instanceof HTMLInputElement) || !checkbox.dataset.orderId) return;

  const orders = getOrders();
  const order = orders.find((savedOrder) => savedOrder.id === checkbox.dataset.orderId);
  if (!order) throw new Error("Pesanan tidak ditemukan di riwayat.");

  order.collected = checkbox.checked;
  order.collectedAt = checkbox.checked ? new Date().toISOString() : null;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  renderOrderHistory();
  renderHistory();
  showToast(
    checkbox.checked
      ? "Pesanan ditandai sudah diambil."
      : "Status pesanan diubah menjadi belum diambil.",
  );
});

const invalidateSavedReceipt = () => {
  if (!currentOrder) return;
  currentOrder = null;
  printButton.disabled = true;
};

form.addEventListener("input", () => {
  invalidateSavedReceipt();
  updateReceipt();
});
form.addEventListener("change", (event) => {
  invalidateSavedReceipt();
  if (event.target.name === "method") updateAddressLabel();
  else updateReceipt();
});

form.addEventListener("reset", () => {
  currentOrder = null;
  printButton.disabled = true;
  window.requestAnimationFrame(() => {
    updateAddressLabel();
    updateReceipt();
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const details = getOrderDetails();
  if (
    !details.name ||
    (details.method === "Antar" && !details.address) ||
    details.weight <= 0
  ) return;

  const orders = getOrders();
  const order = {
    ...details,
    id: `BL-${Date.now().toString().slice(-7)}`,
    createdAt: new Date().toISOString(),
    collected: false,
    collectedAt: null,
  };
  orders.unshift(order);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));

  currentOrder = order;
  updateReceipt();
  renderHistory();
  renderOrderHistory();
  printButton.disabled = false;
  showToast(`Pesanan ${order.id} berhasil disimpan.`);
});

printButton.addEventListener("click", () => {
  if (!currentOrder) return;
  window.print();
});

document.querySelector("#today-date").textContent = new Intl.DateTimeFormat(
  "id-ID",
  { dateStyle: "full" },
).format(new Date());
document.querySelector("#year").textContent = String(new Date().getFullYear());
document.querySelector("#expense-year").textContent = String(new Date().getFullYear());
document.querySelector("#history-year").textContent = String(new Date().getFullYear());
document.querySelector("#expense-date").textContent = new Intl.DateTimeFormat(
  "id-ID",
  { dateStyle: "medium" },
).format(new Date());

if (!SERVICE_RATES[serviceInput.value]) {
  serviceInput.value = serviceInput.options[0].value;
}

updateAddressLabel();
renderHistory();
renderExpenses();
renderOrderHistory();

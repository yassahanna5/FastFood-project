const API_LINKS = [
  ['بيتزا 🍕', 'https://free-food-menus-api-two.vercel.app/pizzas'],
  ['برجر 🍔', 'https://free-food-menus-api-two.vercel.app/burgers'],
  ['حلويات 🍰', 'https://free-food-menus-api-two.vercel.app/desserts'],
  ['مشروبات 🥤', 'https://free-food-menus-api-two.vercel.app/drinks'],
  ['مأكولات بحرية 🦐', 'https://free-food-menus-api-two.vercel.app/seafoods'],
  ['مشويات 🥩', 'https://free-food-menus-api-two.vercel.app/steaks'],
  ['دجاج مقلي 🍗', 'https://free-food-menus-api-two.vercel.app/fried-chicken'],
  ['ساندوتشات 🥪', 'https://free-food-menus-api-two.vercel.app/sandwiches'],
  ['أيس كريم 🍦', 'https://free-food-menus-api-two.vercel.app/ice-cream'],
  ['شوكولاتة 🍫', 'https://free-food-menus-api-two.vercel.app/chocolates'],
  ['مشاوي (BBQ) 🍖', 'https://free-food-menus-api-two.vercel.app/bbqs'],
  ['خبز (Breads) 🥖', 'https://free-food-menus-api-two.vercel.app/breads'],
  ['لحم خنزير (Porks) 🥓', 'https://free-food-menus-api-two.vercel.app/porks'],
  ['سجق (Sausages) 🌭', 'https://free-food-menus-api-two.vercel.app/sausages'],
  ['Best Food ⭐', 'https://free-food-menus-api-two.vercel.app/best-foods']
];

const state = {
  products: [],
  users: [
    { id: 1, name: 'Anton Hanna', email: 'dr.antonhanna2005@gmail.com', role: 'admin', status: 'active' },
    { id: 2, name: 'Yassa Hanna', email: 'yassahanna5@gmail.com', role: 'customer', status: 'active' }
  ],
  orders: [
    { id: '#ORD-001', customer: 'Anton Hanna', total: 63.99, status: 'processing', track: 'Kitchen preparing' },
    { id: '#ORD-002', customer: 'Yassa Hanna', total: 194.37, status: 'cancelled', track: 'Cancelled by customer' }
  ],
  coupons: [{ id: 1, code: 'WELCOME20', discount: 20, expiry: '2026-12-31', status: 'active' }],
  notifications: [],
  logs: []
};

let deferredPrompt = null;

function logAction(text) {
  const stamp = new Date().toLocaleString();
  state.logs.unshift(`[${stamp}] ${text}`);
  renderLogs();
}

function initTooltips() {
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => new bootstrap.Tooltip(el));
}

function switchSection(section) {
  document.querySelectorAll('.menu-item').forEach((x) => x.classList.toggle('active', x.dataset.section === section));
  document.querySelectorAll('.section-panel').forEach((x) => x.classList.remove('active'));
  document.getElementById(`section-${section}`).classList.add('active');
}

function renderApiLinks() {
  const body = document.getElementById('apiLinksBody');
  body.innerHTML = API_LINKS.map(([name, url]) => `<tr><td>${name}</td><td><a href="${url}" target="_blank">${url}</a></td></tr>`).join('');
}

function renderKpis() {
  const revenue = state.orders.reduce((s, o) => s + o.total, 0).toFixed(2);
  const profit = (revenue * 0.28).toFixed(2);
  const cards = [
    ['Total Users', state.users.length],
    ['Total Products', state.products.length],
    ['Total Orders', state.orders.length],
    ['Revenue', `$${revenue}`],
    ['Estimated Profit', `$${profit}`],
    ['Total Notifications', state.notifications.length]
  ];
  document.getElementById('kpiCards').innerHTML = cards
    .map(([k, v]) => `<div class="col-md-6 col-xl-4"><div class="kpi-card"><div>${k}</div><div class="kpi-number">${v}</div></div></div>`)
    .join('');
}

function renderProducts() {
  const body = document.getElementById('productsBody');
  body.innerHTML = state.products
    .map(
      (p) => `<tr>
<td><img src="${p.img}" class="product-thumb"/></td><td>${p.name}</td><td>${p.category}</td><td>$${Number(p.price).toFixed(2)}</td><td>${p.rating ?? '-'}</td>
<td><button class="btn btn-sm btn-outline-danger" onclick="deleteItem('product', '${p.id}')">Delete</button></td></tr>`
    )
    .join('');
}

function renderUsers() {
  document.getElementById('usersBody').innerHTML = state.users
    .map(
      (u) => `<tr><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td><td><span class="badge-soft">${u.status}</span></td><td><button class="btn btn-sm btn-outline-danger" onclick="deleteItem('user', '${u.id}')">Delete</button></td></tr>`
    )
    .join('');
}

function renderOrders() {
  document.getElementById('ordersBody').innerHTML = state.orders
    .map(
      (o) => `<tr><td>${o.id}</td><td>${o.customer}</td><td>$${o.total.toFixed(2)}</td><td><span class="badge-soft">${o.status}</span></td><td>${o.track}</td><td><button class="btn btn-sm btn-outline-danger" onclick="deleteItem('order', '${o.id}')">Delete</button></td></tr>`
    )
    .join('');
}

function renderCoupons() {
  document.getElementById('couponsBody').innerHTML = state.coupons
    .map(
      (c) => `<tr><td>${c.code}</td><td>${c.discount}%</td><td>${c.expiry}</td><td><span class="badge-soft">${c.status}</span></td><td><button class="btn btn-sm btn-outline-danger" onclick="deleteItem('coupon', '${c.id}')">Delete</button></td></tr>`
    )
    .join('');
}

function renderNotifications() {
  document.getElementById('notificationsBody').innerHTML = state.notifications
    .map(
      (n) => `<tr><td>${n.type}</td><td>${n.to}</td><td>${n.title}</td><td>${n.message}</td><td>${n.date}</td><td><button class="btn btn-sm btn-outline-danger" onclick="deleteItem('notification', '${n.id}')">Delete</button></td></tr>`
    )
    .join('');
}

function renderLogs() {
  document.getElementById('logsList').innerHTML = state.logs.map((l) => `<li>${l}</li>`).join('');
}

function openModal(title, bodyHtml, onSubmit) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  const modal = new bootstrap.Modal(document.getElementById('genericModal'));
  modal.show();
  const form = document.getElementById('modalForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      onSubmit(new FormData(form));
      modal.hide();
      rerenderAll();
    });
  }
}

function setupCrudButtons() {
  document.getElementById('addUserBtn').onclick = () =>
    openModal(
      'Add User',
      `<form id="modalForm" class="vstack gap-2"><input class="form-control" name="name" placeholder="Name" required><input class="form-control" name="email" placeholder="Email" required><select class="form-select" name="role"><option>customer</option><option>delivery</option><option>admin</option></select><button class="btn btn-danger">Create</button></form>`,
      (fd) => {
        state.users.push({ id: Date.now(), name: fd.get('name'), email: fd.get('email'), role: fd.get('role'), status: 'active' });
        logAction(`User created: ${fd.get('email')}`);
      }
    );

  document.getElementById('addOrderBtn').onclick = () =>
    openModal(
      'Add Order',
      `<form id="modalForm" class="vstack gap-2"><input class="form-control" name="customer" placeholder="Customer" required><input class="form-control" type="number" step="0.01" name="total" placeholder="Total" required><select class="form-select" name="status"><option>processing</option><option>delivered</option><option>cancelled</option></select><input class="form-control" name="track" placeholder="Tracking text"><button class="btn btn-danger">Create</button></form>`,
      (fd) => {
        state.orders.push({ id: `#ORD-${Date.now()}`, customer: fd.get('customer'), total: Number(fd.get('total')), status: fd.get('status'), track: fd.get('track') || 'New order' });
        logAction(`Order created for ${fd.get('customer')}`);
      }
    );

  document.getElementById('addCouponBtn').onclick = () =>
    openModal(
      'Add Coupon',
      `<form id="modalForm" class="vstack gap-2"><input class="form-control" name="code" placeholder="Coupon code" required><input class="form-control" type="number" name="discount" placeholder="Discount %" required><input class="form-control" type="date" name="expiry" required><button class="btn btn-danger">Create</button></form>`,
      (fd) => {
        state.coupons.push({ id: Date.now(), code: fd.get('code'), discount: Number(fd.get('discount')), expiry: fd.get('expiry'), status: 'active' });
        logAction(`Coupon created: ${fd.get('code')}`);
      }
    );

  document.getElementById('addProductBtn').onclick = () =>
    openModal(
      'Add Product',
      `<form id="modalForm" class="vstack gap-2"><input class="form-control" name="name" placeholder="Food name" required><input class="form-control" name="category" placeholder="Category" required><input class="form-control" type="number" step="0.01" name="price" placeholder="Price" required><input class="form-control" name="img" placeholder="Image URL" required><button class="btn btn-danger">Create</button></form>`,
      (fd) => {
        state.products.push({ id: Date.now(), name: fd.get('name'), category: fd.get('category'), price: fd.get('price'), img: fd.get('img'), rating: 4.5 });
        logAction(`Product created: ${fd.get('name')}`);
      }
    );

  document.getElementById('sendNotificationBtn').onclick = () => {
    const userOptions = state.users.map((u) => `<option value="${u.email}">${u.name} (${u.email})</option>`).join('');
    openModal(
      'Send Notification',
      `<form id="modalForm" class="vstack gap-2">
<select class="form-select" name="type">
<option value="system">system (All Users)</option>
<option value="delivery">delivery (Specific user)</option>
<option value="order_update">order update (Specific user)</option>
<option value="promotion">promotion</option>
</select>
<select class="form-select" name="to"><option value="all">All Users</option>${userOptions}</select>
<input class="form-control" name="title" placeholder="Title" required>
<textarea class="form-control" name="message" rows="3" placeholder="Message" required></textarea>
<button class="btn btn-danger">Send</button></form>`,
      (fd) => {
        const type = fd.get('type');
        const to = type === 'system' ? 'All Users' : fd.get('to');
        state.notifications.unshift({ id: Date.now(), type, to, title: fd.get('title'), message: fd.get('message'), date: new Date().toLocaleDateString() });
        logAction(`Notification sent [${type}] to ${to}`);
      }
    );
  };
}

window.deleteItem = function deleteItem(type, id) {
  const map = { product: 'products', user: 'users', order: 'orders', coupon: 'coupons', notification: 'notifications' };
  const key = map[type];
  state[key] = state[key].filter((x) => String(x.id) !== String(id));
  logAction(`${type} deleted: ${id}`);
  rerenderAll();
};

async function loadProductsFromApis() {
  const targets = API_LINKS.slice(0, 10);
  const samples = [];
  for (const [name, url] of targets) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        samples.push({
          id: `${name}-${Date.now()}-${Math.random()}`,
          name: data[0].name || data[0].dsc || name,
          category: name,
          price: data[0].price || 20,
          img: data[0].img || 'https://via.placeholder.com/70',
          rating: data[0].rate || 4.2
        });
      }
    } catch {
      logAction(`Failed to load ${url}`);
    }
  }
  state.products = samples;
  logAction(`Loaded ${samples.length} products from food APIs`);
}

function rerenderAll() {
  renderKpis();
  renderProducts();
  renderUsers();
  renderOrders();
  renderCoupons();
  renderNotifications();
  renderLogs();
}

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installBtn').style.display = 'block';
    logAction('Install prompt captured.');
  });

  document.getElementById('installBtn').addEventListener('click', async () => {
    if (!deferredPrompt) return alert('Install prompt not available yet. Open via HTTPS/localhost and interact with app.');
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  });
}

function setupServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(() => logAction('Service worker registered'));
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  initTooltips();
  renderApiLinks();
  setupCrudButtons();
  setupInstallPrompt();
  setupServiceWorker();
  document.getElementById('menuNav').addEventListener('click', (e) => {
    const btn = e.target.closest('.menu-item');
    if (!btn) return;
    switchSection(btn.dataset.section);
  });

  await loadProductsFromApis();
  state.notifications.push(
    { id: 1, type: 'system', to: 'All Users', title: 'Welcome', message: 'Welcome to restaurant app', date: new Date().toLocaleDateString() },
    { id: 2, type: 'delivery', to: 'yassahanna5@gmail.com', title: 'Delivery Out', message: 'Driver is near your address', date: new Date().toLocaleDateString() },
    { id: 3, type: 'order_update', to: 'dr.antonhanna2005@gmail.com', title: 'Order Updated', message: 'Order moved to preparing stage', date: new Date().toLocaleDateString() },
    { id: 4, type: 'promotion', to: 'All Users', title: 'Promotion', message: '50% off on best food section', date: new Date().toLocaleDateString() }
  );
  logAction('Dashboard initialized');
  rerenderAll();
});

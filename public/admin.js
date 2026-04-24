let barChart;
let pieChart;

async function api(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function switchSection(section) {
  document.querySelectorAll('.menu-item').forEach((x) => x.classList.toggle('active', x.dataset.section === section));
  document.querySelectorAll('.section-panel').forEach((x) => x.classList.remove('active'));
  document.getElementById(`section-${section}`).classList.add('active');
}

function openModal(title, body, onSubmit) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = body;
  const modal = new bootstrap.Modal(document.getElementById('genericModal'));
  modal.show();
  const f = document.getElementById('modalForm');
  if (f) {
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      await onSubmit(new FormData(f));
      modal.hide();
      await loadAll();
    });
  }
  const prevInput = document.getElementById('imageUrlPreviewInput');
  const prevImg = document.getElementById('imagePreview');
  if (prevInput && prevImg) prevInput.addEventListener('input', () => (prevImg.src = prevInput.value || 'https://via.placeholder.com/90?text=Preview'));
}

async function loadAdminMeta() {
  const me = await api('/api/admin/me');
  document.getElementById('adminMeta').innerHTML = `${me.name}<br><small>${me.email}</small>`;
}

async function renderCategories() {
  const rows = await api('/api/admin/categories');
  document.getElementById('categoriesBody').innerHTML = rows
    .map(
      (c) => `<tr><td><img src="${c.imageUrl || 'https://via.placeholder.com/52'}" class="product-thumb"></td><td>${c.nameEn}</td><td>${c.nameAr}</td><td>${c.isActive ? 'Active' : 'Not active'}</td><td>
<button class="btn btn-sm btn-outline-primary" onclick="editCategory('${c._id}','${encodeURIComponent(c.nameEn)}','${encodeURIComponent(c.nameAr)}','${encodeURIComponent(c.imageUrl || '')}',${c.isActive})">Update</button>
<button class="btn btn-sm btn-outline-danger" onclick="del('/api/admin/categories/${c._id}')">Delete</button></td></tr>`
    )
    .join('');
}

window.editCategory = function editCategory(id, nameEn, nameAr, imageUrl, isActive) {
  openModal(
    'Update Category',
    `<form id="modalForm" class="vstack gap-2"><input class="form-control" name="nameEn" value="${decodeURIComponent(nameEn)}" required><input class="form-control" name="nameAr" value="${decodeURIComponent(nameAr)}" required><input id="imageUrlPreviewInput" class="form-control" name="imageUrl" value="${decodeURIComponent(imageUrl)}"><img id="imagePreview" class="preview-img" src="${decodeURIComponent(imageUrl) || 'https://via.placeholder.com/90?text=Preview'}"><select class="form-select" name="isActive"><option value="true" ${isActive ? 'selected' : ''}>Active</option><option value="false" ${!isActive ? 'selected' : ''}>Not active</option></select><button class="btn btn-danger">Update</button></form>`,
    async (fd) => {
      await api(`/api/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify({ nameEn: fd.get('nameEn'), nameAr: fd.get('nameAr'), imageUrl: fd.get('imageUrl'), isActive: fd.get('isActive') === 'true' }) });
    }
  );
};

async function renderProducts() {
  const rows = await api('/api/admin/products');
  document.getElementById('productsBody').innerHTML = rows
    .map(
      (p) => `<tr><td><img src="${p.imageUrl || 'https://via.placeholder.com/52'}" class="product-thumb"> ${p.name}</td><td>${p.category?.nameEn || '-'}</td><td>$${Number(p.price || 0).toFixed(2)}</td><td>${p.inStock ? 'In Stock' : 'Out'}</td><td>${p.onSale ? 'On Sale' : 'Normal'}</td><td><button class="btn btn-sm btn-outline-primary" onclick="editProduct('${p._id}')">Update</button> <button class="btn btn-sm btn-outline-danger" onclick="del('/api/admin/products/${p._id}')">Delete</button></td></tr>`
    )
    .join('');
}

window.editProduct = async function editProduct(id) {
  const p = (await api('/api/admin/products')).find((x) => x._id === id);
  const categories = await api('/api/admin/categories');
  const opts = categories.map((c) => `<option value="${c._id}" ${String(p.category?._id) === String(c._id) ? 'selected' : ''}>${c.nameEn}</option>`).join('');
  openModal(
    'Update Product',
    `<form id="modalForm" class="vstack gap-2"><input class="form-control" name="name" value="${p.name || ''}" required><textarea class="form-control" name="description">${p.description || ''}</textarea><div class="row g-2"><div class="col"><input class="form-control" name="price" type="number" step="0.01" value="${p.price || 0}" required></div><div class="col"><input class="form-control" name="originalPrice" type="number" step="0.01" value="${p.originalPrice || 0}"></div></div><select class="form-select" name="category">${opts}</select><input id="imageUrlPreviewInput" class="form-control" name="imageUrl" value="${p.imageUrl || ''}"><img id="imagePreview" class="preview-img" src="${p.imageUrl || 'https://via.placeholder.com/90?text=Preview'}"><div class="row"><div class="col"><label><input type="checkbox" name="inStock" ${p.inStock ? 'checked' : ''}> In Stock</label></div><div class="col"><label><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}> Featured</label></div><div class="col"><label><input type="checkbox" name="onSale" ${p.onSale ? 'checked' : ''}> On Sale</label></div></div><button class="btn btn-danger">Update</button></form>`,
    async (fd) => {
      await api(`/api/admin/products/${id}`, { method: 'PUT', body: JSON.stringify({ name: fd.get('name'), description: fd.get('description'), price: Number(fd.get('price')), originalPrice: Number(fd.get('originalPrice')), category: fd.get('category'), imageUrl: fd.get('imageUrl'), inStock: fd.get('inStock') === 'on', featured: fd.get('featured') === 'on', onSale: fd.get('onSale') === 'on' }) });
    }
  );
};

async function renderOrders() {
  const rows = await api('/api/admin/orders');
  document.getElementById('ordersBody').innerHTML = rows
    .map((o) => `<tr><td>${o.orderNo || o._id.slice(-8)}</td><td>${o.customerName}<br><small>${o.customerEmail || ''}</small></td><td>${new Date(o.createdAt).toLocaleDateString()}</td><td>${(o.items || []).length}</td><td>$${Number(o.total || 0).toFixed(2)}</td><td>${o.status}</td><td><select onchange="updOrderStatus('${o._id}', this.value)" class="form-select form-select-sm"><option ${o.status === 'processing' ? 'selected' : ''}>processing</option><option ${o.status === 'shipping' ? 'selected' : ''}>shipping</option><option ${o.status === 'delivered' ? 'selected' : ''}>delivered</option><option ${o.status === 'cancelled' ? 'selected' : ''}>cancelled</option></select><button class="btn btn-sm btn-outline-dark mt-1" onclick="viewOrder('${o._id}')">View</button></td></tr>`)
    .join('');
}
window.updOrderStatus = async (id, status) => {
  await api(`/api/admin/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
  await loadAll();
};
window.viewOrder = async (id) => {
  const o = (await api('/api/admin/orders')).find((x) => x._id === id);
  const items = (o.items || []).map((i) => `<li>${i.name} x${i.qty} - $${i.price}</li>`).join('');
  openModal('Order Details', `<div><b>Customer:</b> ${o.customerName} (${o.customerEmail})<br><b>Address:</b> ${o.shippingAddress || '-'}<br><b>Table Reservation:</b> ${o.tableReservation ? 'Yes' : 'No'}<ul>${items}</ul><b>Total:</b> $${o.total}</div>`, async () => {});
};

async function renderUsers() {
  const rows = await api('/api/admin/users');
  document.getElementById('usersBody').innerHTML = rows
    .map((u) => `<tr><td>${u.name}<br><small>${u.email}</small></td><td>${u.role}</td><td>${new Date(u.joined).toLocaleDateString()}</td><td>${u.orders}</td><td>$${u.totalSpent.toFixed(2)}</td><td><button class="btn btn-sm btn-outline-primary" onclick="updUserRole('${u._id}','${u.role === 'admin' ? 'user' : 'admin'}')">Make ${u.role === 'admin' ? 'User' : 'Admin'}</button> <button class="btn btn-sm btn-outline-secondary" onclick="sendEmail('${u._id}')">Send Email</button></td></tr>`)
    .join('');
}
window.updUserRole = async (id, role) => {
  await api(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ role }) });
  await loadAll();
};
window.sendEmail = async (id) => {
  const subject = prompt('Email subject');
  const message = prompt('Email message');
  const result = await api(`/api/admin/users/${id}/send-email`, { method: 'POST', body: JSON.stringify({ subject, message }) });
  alert(result.message);
};

async function renderCoupons() {
  const rows = await api('/api/admin/coupons');
  document.getElementById('couponsBody').innerHTML = rows
    .map((c) => `<tr><td>${c.code}</td><td>${c.discountType} ${c.discountValue}</td><td>${c.usageCount}/${c.maxUses}</td><td>${new Date(c.validFrom).toLocaleDateString()} - ${new Date(c.validUntil).toLocaleDateString()}</td><td>${c.isActive ? 'Active' : 'Inactive'}</td><td><button class="btn btn-sm btn-outline-primary" onclick="editCoupon('${c._id}')">Update</button> <button class="btn btn-sm btn-outline-danger" onclick="del('/api/admin/coupons/${c._id}')">Delete</button></td></tr>`)
    .join('');
}
window.editCoupon = async (id) => {
  const c = (await api('/api/admin/coupons')).find((x) => x._id === id);
  openModal('Update Coupon', `<form id="modalForm" class="vstack gap-2"><input class="form-control" name="code" value="${c.code}"><select class="form-select" name="discountType"><option value="percentage" ${c.discountType === 'percentage' ? 'selected' : ''}>Percentage</option><option value="fixed" ${c.discountType === 'fixed' ? 'selected' : ''}>Fixed</option></select><input class="form-control" name="discountValue" type="number" value="${c.discountValue}"><input class="form-control" name="minOrderAmount" type="number" value="${c.minOrderAmount || 0}"><input class="form-control" name="maxUses" type="number" value="${c.maxUses || 0}"><input class="form-control" name="validFrom" type="date" value="${new Date(c.validFrom).toISOString().slice(0, 10)}"><input class="form-control" name="validUntil" type="date" value="${new Date(c.validUntil).toISOString().slice(0, 10)}"><select class="form-select" name="isActive"><option value="true" ${c.isActive ? 'selected' : ''}>Active</option><option value="false" ${!c.isActive ? 'selected' : ''}>Inactive</option></select><button class="btn btn-danger">Update</button></form>`, async (fd) => {
    await api(`/api/admin/coupons/${id}`, { method: 'PUT', body: JSON.stringify({ code: fd.get('code'), discountType: fd.get('discountType'), discountValue: Number(fd.get('discountValue')), minOrderAmount: Number(fd.get('minOrderAmount')), maxUses: Number(fd.get('maxUses')), validFrom: fd.get('validFrom'), validUntil: fd.get('validUntil'), isActive: fd.get('isActive') === 'true' }) });
  });
};

async function renderNotifications() {
  const rows = await api('/api/admin/notifications');
  document.getElementById('notifsBody').innerHTML = rows.map((n) => `<tr><td>${n.type}</td><td>${n.user?.email || 'All Users'}</td><td>${n.title}</td><td>${n.message}</td><td>${new Date(n.createdAt).toLocaleDateString()}</td><td><button class="btn btn-sm btn-outline-primary" onclick="editNotif('${n._id}')">Update</button> <button class="btn btn-sm btn-outline-danger" onclick="del('/api/admin/notifications/${n._id}')">Delete</button></td></tr>`).join('');
}
window.editNotif = async (id) => {
  const n = (await api('/api/admin/notifications')).find((x) => x._id === id);
  const users = await api('/api/admin/users');
  const opts = `<option value="">All Users</option>${users.map((u) => `<option value="${u._id}" ${String(n.user?._id) === String(u._id) ? 'selected' : ''}>${u.email}</option>`).join('')}`;
  openModal('Update Notification', `<form id="modalForm" class="vstack gap-2"><select class="form-select" name="type"><option value="promotion" ${n.type === 'promotion' ? 'selected' : ''}>promotion</option><option value="system" ${n.type === 'system' ? 'selected' : ''}>system</option><option value="delivery" ${n.type === 'delivery' ? 'selected' : ''}>delivery</option><option value="order_update" ${n.type === 'order_update' ? 'selected' : ''}>order update</option></select><select class="form-select" name="user">${opts}</select><input class="form-control" name="title" value="${n.title}"><textarea class="form-control" name="message">${n.message}</textarea><input class="form-control" name="actionLink" value="${n.actionLink || ''}" placeholder="Action link"><button class="btn btn-danger">Update</button></form>`, async (fd) => {
    await api(`/api/admin/notifications/${id}`, { method: 'PUT', body: JSON.stringify({ type: fd.get('type'), user: fd.get('user') || null, title: fd.get('title'), message: fd.get('message'), actionLink: fd.get('actionLink') }) });
  });
};

async function renderLogs() {
  const rows = await api('/api/admin/logs');
  document.getElementById('logsBody').innerHTML = rows.map((l) => `<li>[${new Date(l.createdAt).toLocaleString()}] ${l.action}</li>`).join('');
}

async function renderAnalytics() {
  const range = document.getElementById('rangeSelect').value;
  const a = await api(`/api/admin/analytics?range=${range}`);
  const m = await api('/api/admin/storage-metrics');
  const cards = [
    ['Total Revenue', `$${a.totalRevenue.toFixed(2)}`],
    ['Total Orders', a.totalOrders],
    ['Avg Order Value', `$${a.avgOrderValue.toFixed(2)}`],
    ['Total Users', a.totalUsers]
  ];
  document.getElementById('kpiCards').innerHTML = cards.map(([k, v]) => `<div class="col-md-6 col-xl-3"><div class="kpi-card"><div>${k}</div><div class="kpi-number">${v}</div></div></div>`).join('');
  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById('barChart'), { type: 'bar', data: { labels: a.revenueSeries.map((x) => x.label), datasets: [{ label: 'Revenue', data: a.revenueSeries.map((x) => x.revenue), backgroundColor: '#ff6b6b' }] } });
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(document.getElementById('pieChart'), { type: 'pie', data: { labels: a.byStatus.map((x) => x.status), datasets: [{ data: a.byStatus.map((x) => x.count), backgroundColor: ['#60a5fa', '#a78bfa', '#34d399', '#f87171'] }] } });
  document.getElementById('topSelling').innerHTML = a.topSelling.map((t) => `<li>${t._id} - Sold ${t.sold} - Revenue $${Number(t.revenue).toFixed(2)}</li>`).join('');
  document.getElementById('storageMetrics').innerHTML = `Users: <b>${m.users}</b> | Categories: <b>${m.categories}</b> | Products: <b>${m.products}</b> | Orders: <b>${m.orders}</b> | Coupons: <b>${m.coupons}</b> | Notifications: <b>${m.notifications}</b> | Mongo ReadyState: <b>${m.mongoReadyState}</b>`;
}

window.del = async function del(url) {
  if (!confirm('Delete item?')) return;
  await api(url, { method: 'DELETE' });
  await loadAll();
};

async function loadAll() {
  await Promise.all([renderCategories(), renderProducts(), renderOrders(), renderUsers(), renderCoupons(), renderNotifications(), renderLogs(), renderAnalytics()]);
}

document.addEventListener('DOMContentLoaded', async () => {
  const menuToggle = document.getElementById('menuToggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
  }
  document.getElementById('menuNav').addEventListener('click', (e) => {
    const btn = e.target.closest('.menu-item');
    if (btn) {
      switchSection(btn.dataset.section);
      document.querySelector('.sidebar').classList.remove('open');
    }
  });
  document.getElementById('rangeSelect').addEventListener('change', renderAnalytics);
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await api('/api/logout', { method: 'POST' });
    location.href = '/login.html';
  });

  document.getElementById('seedBtn').addEventListener('click', async () => {
    await api('/api/admin/seed-food-data', { method: 'POST' });
    await loadAll();
  });

  document.getElementById('addCategoryBtn').addEventListener('click', () => {
    openModal('Add New Category', `<form id="modalForm" class="vstack gap-2"><label>Name (English)</label><input class="form-control" name="nameEn" placeholder="e.g. steaks" required><label>Name (Arabic)</label><input class="form-control" name="nameAr" placeholder="e.g. مشويات" required><label>Image URL</label><input id="imageUrlPreviewInput" class="form-control" name="imageUrl" placeholder="https://..." required><img id="imagePreview" class="preview-img" src="https://via.placeholder.com/90?text=Preview"><select class="form-select" name="isActive"><option value="true">Active</option><option value="false">Not active</option></select><button class="btn btn-danger">Create</button></form>`, async (fd) => {
      await api('/api/admin/categories', { method: 'POST', body: JSON.stringify({ nameEn: fd.get('nameEn'), nameAr: fd.get('nameAr'), imageUrl: fd.get('imageUrl'), isActive: fd.get('isActive') === 'true' }) });
    });
  });

  document.getElementById('addProductBtn').addEventListener('click', async () => {
    const categories = await api('/api/admin/categories');
    const opts = categories.map((c) => `<option value="${c._id}">${c.nameEn}</option>`).join('');
    openModal('Add New Product', `<form id="modalForm" class="vstack gap-2"><input class="form-control" name="name" placeholder="Product Name" required><textarea class="form-control" name="description" placeholder="Description"></textarea><div class="row g-2"><div class="col"><input class="form-control" type="number" step="0.01" name="price" placeholder="Price ($)" required></div><div class="col"><input class="form-control" type="number" step="0.01" name="originalPrice" placeholder="Original Price ($)"></div></div><label>Category</label><select class="form-select" name="category">${opts}</select><label>Image URL</label><input id="imageUrlPreviewInput" class="form-control" name="imageUrl" placeholder="https://..." required><img id="imagePreview" class="preview-img" src="https://via.placeholder.com/90?text=Preview"><div class="row"><div class="col"><label><input type="checkbox" name="inStock" checked> In Stock</label></div><div class="col"><label><input type="checkbox" name="featured"> Featured</label></div><div class="col"><label><input type="checkbox" name="onSale"> On Sale</label></div></div><button class="btn btn-danger">Create</button></form>`, async (fd) => {
      await api('/api/admin/products', { method: 'POST', body: JSON.stringify({ name: fd.get('name'), description: fd.get('description'), price: Number(fd.get('price')), originalPrice: Number(fd.get('originalPrice')), category: fd.get('category'), imageUrl: fd.get('imageUrl'), inStock: fd.get('inStock') === 'on', featured: fd.get('featured') === 'on', onSale: fd.get('onSale') === 'on' }) });
    });
  });

  document.getElementById('addCouponBtn').addEventListener('click', () => {
    openModal('Create Promo Code', `<form id="modalForm" class="vstack gap-2"><input class="form-control" name="code" placeholder="Promo Code" required><select class="form-select" name="discountType"><option value="percentage">Percentage (%)</option><option value="fixed">Fixed</option></select><input class="form-control" name="discountValue" type="number" value="20" required><input class="form-control" name="minOrderAmount" type="number" value="50" required><input class="form-control" name="maxUses" type="number" value="100" required><input class="form-control" name="validFrom" type="date" required><input class="form-control" name="validUntil" type="date" required><select class="form-select" name="isActive"><option value="true">Active</option><option value="false">Not active</option></select><div class="d-flex gap-2 justify-content-end"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button class="btn btn-danger">Create</button></div></form>`, async (fd) => {
      await api('/api/admin/coupons', { method: 'POST', body: JSON.stringify({ code: fd.get('code'), discountType: fd.get('discountType'), discountValue: Number(fd.get('discountValue')), minOrderAmount: Number(fd.get('minOrderAmount')), maxUses: Number(fd.get('maxUses')), validFrom: fd.get('validFrom'), validUntil: fd.get('validUntil'), isActive: fd.get('isActive') === 'true' }) });
    });
  });

  document.getElementById('addNotifBtn').addEventListener('click', async () => {
    const users = await api('/api/admin/users');
    const opts = `<option value="">All Users</option>${users.map((u) => `<option value="${u._id}">${u.email}</option>`).join('')}`;
    openModal('Send Notification', `<form id="modalForm" class="vstack gap-2"><label>Type</label><select class="form-select" name="type"><option value="promotion">Promotion</option><option value="system">System</option><option value="delivery">Delivery</option><option value="order_update">Order Update</option></select><label>Send to User</label><select class="form-select" name="user">${opts}</select><input class="form-control" name="title" placeholder="Flash Sale Alert! 🔥" required><textarea class="form-control" name="message" placeholder="Summer collection is now 50% off!" required></textarea><input class="form-control" name="actionLink" placeholder="Action Link (optional)"><div class="d-flex gap-2 justify-content-end"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button class="btn btn-danger">Send</button></div></form>`, async (fd) => {
      await api('/api/admin/notifications', { method: 'POST', body: JSON.stringify({ type: fd.get('type'), user: fd.get('user') || null, title: fd.get('title'), message: fd.get('message'), actionLink: fd.get('actionLink') }) });
    });
  });

  try {
    await loadAdminMeta();
    await loadAll();
  } catch (e) {
    alert(`${e.message}. Please login as admin first.`);
    location.href = '/login.html';
  }
});

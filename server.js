const path = require('path');
const express = require('express');
const http = require('http');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const ADMIN_EMAIL = 'admin2030@gmail.com';
const ADMIN_PASSWORD = 'Admin2030KingFood';

if (!MONGO_URI) throw new Error('MONGO_URI is required.');

mongoose
  .connect(MONGO_URI, { dbName: 'king_food' })
  .then(() => console.log('Mongo connected (db: king_food)'))
  .catch((e) => console.error(e.message));

const userSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: String,
    role: { type: String, enum: ['user', 'admin', 'delivery'], default: 'user' },
    isActive: { type: Boolean, default: true },
    resetCodeHash: String,
    resetCodeExpiresAt: Date
  },
  { timestamps: true }
);

const categorySchema = new mongoose.Schema(
  {
    nameEn: { type: String, required: true },
    nameAr: { type: String, required: true },
    imageUrl: String,
    apiUrl: String,
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    price: Number,
    originalPrice: Number,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    imageUrl: String,
    inStock: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    onSale: { type: Boolean, default: false },
    rating: Number,
    reviewsCount: Number,
    reviews: [{ userName: String, comment: String, stars: Number }],
    sourceApi: String
  },
  { timestamps: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerName: String,
    customerEmail: String,
    shippingAddress: String,
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        qty: Number,
        price: Number
      }
    ],
    tableReservation: { type: Boolean, default: false },
    total: Number,
    status: { type: String, enum: ['processing', 'shipping', 'delivered', 'cancelled'], default: 'processing' }
  },
  { timestamps: true }
);

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    discountValue: Number,
    minOrderAmount: Number,
    maxUses: Number,
    usageCount: { type: Number, default: 0 },
    validFrom: Date,
    validUntil: Date,
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['system', 'promotion', 'delivery', 'order_update'] },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: String,
    message: String,
    actionLink: String
  },
  { timestamps: true }
);

const logSchema = new mongoose.Schema({ action: String }, { timestamps: true });

const profileSchema = new mongoose.Schema({ user:{type:mongoose.Schema.Types.ObjectId,ref:'User',unique:true}, fullName:String,email:String,phone:String,dob:Date,gender:String,photoUrl:String },{timestamps:true});
const addressSchema = new mongoose.Schema({ user:{type:mongoose.Schema.Types.ObjectId,ref:'User'}, type:String,fullName:String,phone:String,streetAddress:String,city:String,zipCode:String,isDefault:Boolean },{timestamps:true});
const paymentSchema = new mongoose.Schema({ user:{type:mongoose.Schema.Types.ObjectId,ref:'User'}, cardLast4:String,cardholderName:String,expiryDate:String,cvv:String,isDefault:Boolean },{timestamps:true});
const wishlistSchema = new mongoose.Schema({ user:{type:mongoose.Schema.Types.ObjectId,ref:'User'}, product:{type:mongoose.Schema.Types.ObjectId,ref:'Product'} },{timestamps:true});
const cartSchema = new mongoose.Schema({ user:{type:mongoose.Schema.Types.ObjectId,ref:'User',unique:true}, items:[{ product:{type:mongoose.Schema.Types.ObjectId,ref:'Product'}, qty:Number }] },{timestamps:true});
const bookingSchema = new mongoose.Schema({ user:{type:mongoose.Schema.Types.ObjectId,ref:'User'}, fullName:String,email:String,phone:String,date:String,time:String,guests:String,requests:String },{timestamps:true});
const conversationSchema = new mongoose.Schema({ user:{type:mongoose.Schema.Types.ObjectId,ref:'User'}, senderRole:String, message:String, imageUrl:String },{timestamps:true});
const newsletterSchema = new mongoose.Schema({ name:String, email:String },{timestamps:true});


const User = mongoose.model('User', userSchema);
const Category = mongoose.model('Category', categorySchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);
const Coupon = mongoose.model('Coupon', couponSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const AdminLog = mongoose.model('AdminLog', logSchema);
const UserProfile = mongoose.model('UserProfile', profileSchema);
const UserAddress = mongoose.model('UserAddress', addressSchema);
const PaymentMethod = mongoose.model('PaymentMethod', paymentSchema);
const Wishlist = mongoose.model('Wishlist', wishlistSchema);
const Cart = mongoose.model('Cart', cartSchema);
const TableBooking = mongoose.model('TableBooking', bookingSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);
const Newsletter = mongoose.model('Newsletter', newsletterSchema);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 2 }
  })
);
app.use(express.static(path.join(__dirname, 'public')));

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const CATEGORIES_SEED = [
  ['بيتزا 🍕', 'pizzas', 'بيتزا'],
  ['برجر 🍔', 'burgers', 'برجر'],
  ['حلويات 🍰', 'desserts', 'حلويات'],
  ['مشروبات 🥤', 'drinks', 'مشروبات'],
  ['مأكولات بحرية 🦐', 'seafoods', 'مأكولات بحرية'],
  ['مشويات 🥩', 'steaks', 'مشويات'],
  ['دجاج مقلي 🍗', 'fried-chicken', 'دجاج مقلي'],
  ['ساندوتشات 🥪', 'sandwiches', 'ساندوتشات'],
  ['أيس كريم 🍦', 'ice-cream', 'أيس كريم'],
  ['شوكولاتة 🍫', 'chocolates', 'شوكولاتة'],
  ['مشاوي (BBQ) 🍖', 'bbqs', 'مشاوي'],
  ['خبز (Breads) 🥖', 'breads', 'خبز'],
  ['لحم خنزير (Porks) 🥓', 'porks', 'لحم خنزير'],
  ['سجق (Sausages) 🌭', 'sausages', 'سجق'],
  ['Best Food ⭐', 'best-foods', 'أفضل الأطعمة']
];
const CATEGORY_FALLBACK_IMAGES = {
  desserts:
    'https://goldbelly.imgix.net/uploads/showcase_media_asset/image/132029/german-chocolate-killer-brownie-tin-pack.5ebc34160f28767a9d94c4da2e04c4b9.jpg?ixlib=react-9.0.2&auto=format&ar=1%3A1'
};

async function writeLog(action) {
  await AdminLog.create({ action });
}

async function ensureAdminUser() {
  let admin = await User.findOne({ email: ADMIN_EMAIL });
  if (!admin) {
    admin = await User.create({
      firstName: 'King',
      lastName: 'Food',
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      role: 'admin'
    });
  }
  return admin;
}

function adminOnly(req, res, next) {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(401).json({ message: 'Admin login required.' });
  }
  return next();
}

app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, repeatPassword } = req.body;
    if (!firstName || !lastName || !email || !password || !repeatPassword) return res.status(400).json({ message: 'All fields required' });
    if (!passwordRule.test(password)) return res.status(400).json({ message: 'Weak password' });
    if (password !== repeatPassword) return res.status(400).json({ message: 'Passwords do not match' });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'already exist' });

    await User.create({ firstName, lastName, email, passwordHash: await bcrypt.hash(password, 10), role: 'user' });
    res.status(201).json({ message: 'Account created successfully' });
  } catch {
    res.status(500).json({ message: 'Register failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email = '', password = '', rememberMe } = req.body;
    await ensureAdminUser();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: 'Invalid credentials' });

    req.session.userId = String(user._id);
    req.session.role = user.role;
    req.session.email = user.email;
    req.session.cookie.maxAge = rememberMe ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 2;

    res.json({ message: 'Login successful', role: user.role, redirectTo: user.role === 'admin' ? '/admin.html' : '/home.html' });
  } catch {
    res.status(500).json({ message: 'Login failed' });
  }
});

app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user) return res.json({ message: 'If account exists reset code sent' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  user.resetCodeHash = await bcrypt.hash(code, 10);
  user.resetCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  res.json({ message: 'Demo mode: reset code generated', resetCode: code });
});

app.post('/api/reset-password', async (req, res) => {
  const { email, code, newPassword, repeatPassword } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user || !user.resetCodeHash || new Date() > user.resetCodeExpiresAt) return res.status(400).json({ message: 'Invalid/expired code' });
  if (!(await bcrypt.compare(code || '', user.resetCodeHash))) return res.status(400).json({ message: 'Invalid code' });
  if (!passwordRule.test(newPassword || '')) return res.status(400).json({ message: 'Weak password' });
  if (newPassword !== repeatPassword) return res.status(400).json({ message: 'Passwords do not match' });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetCodeHash = undefined;
  user.resetCodeExpiresAt = undefined;
  await user.save();
  res.json({ message: 'Password reset successful' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

app.get('/api/admin/me', adminOnly, async (req, res) => {
  const user = await User.findById(req.session.userId);
  res.json({ name: `${user.firstName} ${user.lastName}`, email: user.email });
});

app.post('/api/admin/seed-food-data', adminOnly, async (req, res) => {
  try {
    for (const [en, key, ar] of CATEGORIES_SEED) {
      const apiUrl = `https://free-food-menus-api-two.vercel.app/${key}`;
      let category = await Category.findOne({ apiUrl });
      if (!category) {
        const first = await fetch(apiUrl).then((r) => r.json()).then((d) => d[0]).catch(() => null);
        category = await Category.create({
          nameEn: en,
          nameAr: ar,
          apiUrl,
          imageUrl: first?.img || CATEGORY_FALLBACK_IMAGES[key] || '',
          isActive: true
        });
      }

      if ((await Product.countDocuments({ category: category._id })) > 0) continue;
      const data = await fetch(apiUrl).then((r) => r.json()).catch(() => []);
      const bulk = data.map((p) => ({
        name: p.name || p.dsc || en,
        description: p.dsc || '',
        price: Number(p.price) || 0,
        originalPrice: Number(p.price) || 0,
        category: category._id,
        imageUrl: p.img || '',
        inStock: true,
        featured: false,
        onSale: false,
        rating: Number(p.rate) || 0,
        reviewsCount: 0,
        reviews: [],
        sourceApi: apiUrl
      }));
      if (bulk.length) await Product.insertMany(bulk);
    }
    await writeLog('Food data seeded/imported from APIs');
    res.json({ message: 'Seeding done' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/admin/categories', adminOnly, async (_req, res) => res.json(await Category.find().sort({ createdAt: -1 })));
app.post('/api/admin/categories', adminOnly, async (req, res) => {
  const doc = await Category.create(req.body);
  await writeLog(`Category created: ${doc.nameEn}`);
  res.status(201).json(doc);
});
app.put('/api/admin/categories/:id', adminOnly, async (req, res) => {
  const doc = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await writeLog(`Category updated: ${doc?.nameEn || req.params.id}`);
  res.json(doc);
});
app.delete('/api/admin/categories/:id', adminOnly, async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  await writeLog(`Category deleted: ${req.params.id}`);
  res.json({ ok: true });
});

app.get('/api/admin/products', adminOnly, async (_req, res) => res.json(await Product.find().populate('category').sort({ createdAt: -1 })));
app.post('/api/admin/products', adminOnly, async (req, res) => {
  const doc = await Product.create(req.body);
  await writeLog(`Product created: ${doc.name}`);
  res.status(201).json(doc);
});
app.put('/api/admin/products/:id', adminOnly, async (req, res) => {
  const doc = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await writeLog(`Product updated: ${doc?.name || req.params.id}`);
  res.json(doc);
});
app.delete('/api/admin/products/:id', adminOnly, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  await writeLog(`Product deleted: ${req.params.id}`);
  res.json({ ok: true });
});

app.get('/api/admin/users', adminOnly, async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  const enriched = await Promise.all(
    users.map(async (u) => {
      const orders = await Order.find({ user: u._id });
      const totalSpent = orders.reduce((s, o) => s + (o.total || 0), 0);
      return { _id: u._id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim(), email: u.email, role: u.role, joined: u.createdAt, orders: orders.length, totalSpent };
    })
  );
  res.json(enriched);
});
app.put('/api/admin/users/:id', adminOnly, async (req, res) => {
  const doc = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
  await writeLog(`User role updated: ${doc?.email}`);
  res.json(doc);
});
app.post('/api/admin/users/:id/send-email', adminOnly, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user?.email) return res.status(404).json({ message: 'User email not found' });

  const { subject, message } = req.body;
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  if (!smtpUser || !smtpPass) {
    return res.status(400).json({
      message: 'SMTP credentials missing. Add SMTP_USER + SMTP_PASS (or GMAIL_USER + GMAIL_APP_PASSWORD) in .env'
    });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: smtpUser, pass: smtpPass }
  });

  await transporter.sendMail({
    from: smtpUser,
    to: user.email,
    subject: subject || 'Message from King Food Admin',
    text: message || ''
  });
  await writeLog(`Email sent to ${user.email}: ${subject || 'No subject'}`);
  res.json({ message: `Email sent successfully to ${user.email}` });
});

app.get('/api/admin/orders', adminOnly, async (_req, res) => res.json(await Order.find().sort({ createdAt: -1 })));
app.put('/api/admin/orders/:id/status', adminOnly, async (req, res) => {
  const doc = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  await writeLog(`Order status updated: ${doc?.orderNo} => ${doc?.status}`);
  res.json(doc);
});

app.get('/api/admin/coupons', adminOnly, async (_req, res) => res.json(await Coupon.find().sort({ createdAt: -1 })));
app.post('/api/admin/coupons', adminOnly, async (req, res) => {
  const doc = await Coupon.create(req.body);
  await writeLog(`Coupon created: ${doc.code}`);
  res.status(201).json(doc);
});
app.put('/api/admin/coupons/:id', adminOnly, async (req, res) => {
  const doc = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await writeLog(`Coupon updated: ${doc?.code}`);
  res.json(doc);
});
app.delete('/api/admin/coupons/:id', adminOnly, async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  await writeLog(`Coupon deleted: ${req.params.id}`);
  res.json({ ok: true });
});

app.get('/api/admin/notifications', adminOnly, async (_req, res) => res.json(await Notification.find().populate('user').sort({ createdAt: -1 })));
app.post('/api/admin/notifications', adminOnly, async (req, res) => {
  const doc = await Notification.create(req.body);
  await writeLog(`Notification sent: ${doc.title}`);
  res.status(201).json(doc);
});
app.put('/api/admin/notifications/:id', adminOnly, async (req, res) => res.json(await Notification.findByIdAndUpdate(req.params.id, req.body, { new: true })));
app.delete('/api/admin/notifications/:id', adminOnly, async (req, res) => {
  await Notification.findByIdAndDelete(req.params.id);
  await writeLog(`Notification deleted: ${req.params.id}`);
  res.json({ ok: true });
});

app.get('/api/admin/logs', adminOnly, async (_req, res) => res.json(await AdminLog.find().sort({ createdAt: -1 }).limit(200)));
app.get('/api/admin/storage-metrics', adminOnly, async (_req, res) => {
  const [users, categories, products, orders, coupons, notifications] = await Promise.all([
    User.countDocuments(),
    Category.countDocuments(),
    Product.countDocuments(),
    Order.countDocuments(),
    Coupon.countDocuments(),
    Notification.countDocuments()
  ]);
  res.json({ users, categories, products, orders, coupons, notifications, mongoReadyState: mongoose.connection.readyState });
});

app.get('/api/admin/analytics', adminOnly, async (req, res) => {
  const range = req.query.range || '7d';
  const days = range === '365d' ? 365 : range === '30d' ? 30 : 7;
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const orders = await Order.find({ createdAt: { $gte: start } });
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
  const totalUsers = await User.countDocuments({ role: 'user' });

  const byStatus = ['processing', 'shipping', 'delivered', 'cancelled'].map((s) => ({ status: s, count: orders.filter((o) => o.status === s).length }));
  const topSelling = await Order.aggregate([
    { $unwind: '$items' },
    { $group: { _id: '$items.name', sold: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } } } },
    { $sort: { sold: -1 } },
    { $limit: 5 }
  ]);

  const revenueSeries = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const dayRevenue = orders
      .filter((o) => o.createdAt >= dayStart && o.createdAt <= dayEnd)
      .reduce((s, o) => s + (o.total || 0), 0);
    revenueSeries.push({ label: dayStart.toISOString().slice(0, 10), revenue: dayRevenue });
  }

  res.json({ totalRevenue, totalOrders, avgOrderValue, totalUsers, byStatus, topSelling, revenueSeries });
});


function authOnly(req,res,next){ if(!req.session.userId) return res.status(401).json({message:'Login required'}); next(); }
app.get('/api/store/categories', async (_req,res)=>res.json(await Category.find({isActive:true}).sort({createdAt:-1})));
app.get('/api/store/products', async (_req,res)=>res.json(await Product.find().populate('category').sort({createdAt:-1})));
app.get('/api/user/profile', authOnly, async (req,res)=>{ let p=await UserProfile.findOne({user:req.session.userId}); if(!p){const u=await User.findById(req.session.userId); p=await UserProfile.create({user:req.session.userId,fullName:`${u.firstName||''} ${u.lastName||''}`.trim(),email:u.email,gender:'male'});} res.json(p); });
app.put('/api/user/profile', authOnly, async (req,res)=>res.json(await UserProfile.findOneAndUpdate({user:req.session.userId},req.body,{new:true,upsert:true})));
app.get('/api/user/wishlist', authOnly, async (req,res)=>{const w=await Wishlist.find({user:req.session.userId}).populate('product');res.json(w.map(x=>x.product).filter(Boolean));});
app.post('/api/user/wishlist/toggle', authOnly, async (req,res)=>{const {productId}=req.body; const ex=await Wishlist.findOne({user:req.session.userId,product:productId}); if(ex){await ex.deleteOne(); return res.json({liked:false});} await Wishlist.create({user:req.session.userId,product:productId}); res.json({liked:true});});
app.get('/api/user/cart', authOnly, async (req,res)=>{let c=await Cart.findOne({user:req.session.userId}).populate('items.product'); if(!c)c=await Cart.create({user:req.session.userId,items:[]}); res.json(c);});
app.post('/api/user/cart', authOnly, async (req,res)=>{const {productId,qty}=req.body; let c=await Cart.findOne({user:req.session.userId}); if(!c)c=await Cart.create({user:req.session.userId,items:[]}); const idx=c.items.findIndex(i=>String(i.product)===String(productId)); if(idx>=0)c.items[idx].qty+=qty; else c.items.push({product:productId,qty}); await c.save(); res.json(c);});
app.put('/api/user/cart/qty', authOnly, async (req,res)=>{const {productId,delta}=req.body; const c=await Cart.findOne({user:req.session.userId}).populate('items.product'); if(!c) return res.json({}); const it=c.items.find(i=>String(i.product._id||i.product)===String(productId)); if(it){const stock=it.product.inStock?999:0; it.qty=Math.max(1,Math.min(stock,it.qty+Number(delta||0)));} await c.save(); res.json(c);});
app.post('/api/user/cart/apply-coupon', authOnly, async (req,res)=>{const c=await Coupon.findOne({code:req.body.code,isActive:true}); if(!c) return res.status(400).json({message:'Invalid coupon'}); const discount=c.discountType==='percentage'?c.discountValue:c.discountValue; res.json({discount});});
app.post('/api/user/orders/checkout', authOnly, async (req,res)=>{const c=await Cart.findOne({user:req.session.userId}).populate('items.product'); if(!c||!c.items.length)return res.status(400).json({message:'Empty cart'}); const subtotal=c.items.reduce((s,i)=>s+i.qty*(i.product?.price||0),0); const shipping=10,tax=subtotal*0.14,total=subtotal+shipping+tax; const u=await User.findById(req.session.userId); const ad=await UserAddress.findOne({user:req.session.userId,isDefault:true}); const order=await Order.create({orderNo:`ORD-${Date.now()}`,user:req.session.userId,customerName:`${u.firstName||''} ${u.lastName||''}`.trim(),customerEmail:u.email,shippingAddress:ad?`${ad.streetAddress}, ${ad.city}`:'',items:c.items.map(i=>({product:i.product._id,name:i.product.name,qty:i.qty,price:i.product.price})),subtotal,shipping,tax,total,status:'processing'}); c.items=[]; await c.save(); res.json(order);});
app.get('/api/user/orders', authOnly, async (req,res)=>res.json(await Order.find({user:req.session.userId}).sort({createdAt:-1})));
app.get('/api/user/addresses', authOnly, async (req,res)=>res.json(await UserAddress.find({user:req.session.userId}).sort({createdAt:-1})));
app.post('/api/user/addresses', authOnly, async (req,res)=>{if(req.body.isDefault) await UserAddress.updateMany({user:req.session.userId},{isDefault:false}); res.json(await UserAddress.create({...req.body,user:req.session.userId}));});
app.put('/api/user/addresses/default', authOnly, async (req,res)=>{await UserAddress.updateMany({user:req.session.userId},{isDefault:false}); await UserAddress.findOneAndUpdate({_id:req.body.id,user:req.session.userId},{isDefault:true}); res.json({ok:true});});
app.delete('/api/user/addresses/:id', authOnly, async (req,res)=>{await UserAddress.deleteOne({_id:req.params.id,user:req.session.userId}); res.json({ok:true});});
app.get('/api/user/payments', authOnly, async (req,res)=>res.json(await PaymentMethod.find({user:req.session.userId})));
app.post('/api/user/payments', authOnly, async (req,res)=>{const {cardNumber,cardholderName,expiryDate,cvv,isDefault}=req.body; if(!/^\d{16}$/.test(cardNumber)) return res.status(400).json({message:'invalid card number'}); if(!/^\d{3}$/.test(cvv)) return res.status(400).json({message:'invalid cvv'}); const [m,y]=expiryDate.split('/').map(Number); const exp=new Date(2000+y,m); if(exp<=new Date()) return res.status(400).json({message:'expiry must be future'}); if(isDefault) await PaymentMethod.updateMany({user:req.session.userId},{isDefault:false}); res.json(await PaymentMethod.create({user:req.session.userId,cardLast4:cardNumber.slice(-4),cardholderName,expiryDate,cvv,isDefault:!!isDefault}));});
app.post('/api/user/bookings', authOnly, async (req,res)=>res.json(await TableBooking.create({...req.body,user:req.session.userId})));
app.get('/api/user/notifications', authOnly, async (req,res)=>res.json(await Notification.find({$or:[{user:null},{user:req.session.userId}]}).sort({createdAt:-1})));
app.get('/api/user/conversations', authOnly, async (req,res)=>res.json(await Conversation.find({user:req.session.userId}).sort({createdAt:1})));
app.post('/api/user/conversations', authOnly, async (req,res)=>{const m=await Conversation.create({user:req.session.userId,senderRole:'user',message:req.body.message,imageUrl:req.body.imageUrl||''}); await AdminLog.create({action:`New conversation message from user ${req.session.userId}`}); res.json(m);});
app.get('/api/admin/conversations', adminOnly, async (_req,res)=>res.json(await Conversation.find().populate('user').sort({createdAt:-1})));
app.post('/api/admin/conversations/reply', adminOnly, async (req,res)=>res.json(await Conversation.create({user:req.body.userId,senderRole:'admin',message:req.body.message,imageUrl:req.body.imageUrl||''})));
app.post('/api/newsletter/subscribe', async (req,res)=>{await Newsletter.create({name:req.body.name||'',email:req.body.email||''});await AdminLog.create({action:`Newsletter subscribe: ${req.body.name||''} ${req.body.email||''}`}); res.json({ok:true});});
app.post('/api/translate', async (req, res) => {
  const { text = '', target = 'ar' } = req.body;
  if (!text.trim()) return res.json({ translated: '' });
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
      target
    )}&dt=t&q=${encodeURIComponent(text)}`;
    const data = await fetch(url).then((r) => r.json());
    const translated = (data?.[0] || []).map((x) => x?.[0] || '').join('');
    return res.json({ translated });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));

io.on('connection', (socket) => {
  socket.on('join-user-room', (userId) => socket.join(`user:${userId}`));
  socket.on('support:user-message', async (payload) => {
    const msg = await Conversation.create({ user: payload.userId, senderRole: 'user', message: payload.message || '', imageUrl: payload.imageUrl || '' });
    io.to(`user:${payload.userId}`).emit('support:new-message', msg);
    io.emit('support:admin-feed', msg);
  });
  socket.on('support:admin-reply', async (payload) => {
    const msg = await Conversation.create({ user: payload.userId, senderRole: 'admin', message: payload.message || '', imageUrl: payload.imageUrl || '' });
    io.to(`user:${payload.userId}`).emit('support:new-message', msg);
    io.emit('support:admin-feed', msg);
  });
});

server.listen(PORT, async () => {
  await ensureAdminUser();
  console.log(`Server running http://localhost:${PORT}`);
});

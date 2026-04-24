const path = require('path');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error('MONGO_URI is required. Add it in .env file.');
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    resetCodeHash: { type: String, default: null },
    resetCodeExpiresAt: { type: Date, default: null }
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 2
    }
  })
);

app.use(express.static(path.join(__dirname, 'public')));

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const emailRule = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, repeatPassword } = req.body;

    if (!firstName || !lastName || !email || !password || !repeatPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (!emailRule.test(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }

    if (!passwordRule.test(password)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 chars and include uppercase, lowercase, number, and special char.'
      });
    }

    if (password !== repeatPassword) {
      return res.status(400).json({ message: 'Password and Repeat Password do not match.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'This email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ firstName, lastName, email, passwordHash });

    return res.status(201).json({ message: 'Account created successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong while registering.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const matched = await bcrypt.compare(password, user.passwordHash);
    if (!matched) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    req.session.userId = user._id.toString();
    req.session.email = user.email;

    if (rememberMe === true || rememberMe === 'true') {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30;
    } else {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 2;
    }

    return res.json({ message: 'Login successful.', fullName: `${user.firstName} ${user.lastName}` });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong while logging in.' });
  }
});

app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.json({ message: 'If this email exists, a reset code has been generated.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);

    user.resetCodeHash = codeHash;
    user.resetCodeExpiresAt = new Date(Date.now() + 1000 * 60 * 10);
    await user.save();

    // Demo mode: send code in response (in production send by real email service)
    return res.json({
      message: 'Reset code generated. (Demo) Use this code to reset password.',
      resetCode: code
    });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong while generating reset code.' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword, repeatPassword } = req.body;

    if (!email || !code || !newPassword || !repeatPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.resetCodeHash || !user.resetCodeExpiresAt) {
      return res.status(400).json({ message: 'Invalid reset request.' });
    }

    if (new Date() > user.resetCodeExpiresAt) {
      return res.status(400).json({ message: 'Reset code expired. Request a new one.' });
    }

    const codeValid = await bcrypt.compare(code, user.resetCodeHash);
    if (!codeValid) {
      return res.status(400).json({ message: 'Invalid reset code.' });
    }

    if (!passwordRule.test(newPassword)) {
      return res.status(400).json({
        message:
          'New password must be at least 8 chars and include uppercase, lowercase, number, and special char.'
      });
    }

    if (newPassword !== repeatPassword) {
      return res.status(400).json({ message: 'New password and Repeat Password do not match.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetCodeHash = null;
    user.resetCodeExpiresAt = null;
    await user.save();

    return res.json({ message: 'Password reset successful. You can login now.' });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong while resetting password.' });
  }
});

app.get('/api/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Not logged in.' });
  }

  const user = await User.findById(req.session.userId);
  if (!user) {
    return res.status(401).json({ message: 'Session user not found.' });
  }

  return res.json({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully.' });
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

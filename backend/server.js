const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const Razorpay = require('razorpay');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
require('dotenv').config();

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// ---- Security middleware ----
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth/login', authLimiter);

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 300 : 2000,
  standardHeaders: true,
  legacyHeaders: false
}));

// NOTE: do NOT mkdirSync at module load. On Vercel /var/task is read-only,
// so eager directory creation crashes the entire function at cold start.
// The local uploads/ directory is created lazily inside saveUpload() only
// when an actual file needs to be written (local dev).

// Multer: memory storage (serverless-safe) + image-only validation + 5MB cap
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WebP or GIF images are allowed'), false);
    }
    cb(null, true);
  }
});

// Vercel Blob gives uploads persistent, CDN-backed storage on Vercel.
// Without a token (local dev), files fall back to the local uploads/ directory.
let blobPut = null;
try {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    blobPut = require('@vercel/blob').put;
  }
} catch (err) {
  console.log('@vercel/blob not available, using local uploads directory');
}

const saveUpload = async (file) => {
  if (!file) return '';
  const safeName = `${Date.now()}-${String(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  if (blobPut) {
    const blob = await blobPut(`uploads/${safeName}`, file.buffer, { access: 'public' });
    return blob.url;
  }
  // Local dev only - on Vercel this branch is never reached because
  // BLOB_READ_WRITE_TOKEN is required to persist uploads.
  const dir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, safeName), file.buffer);
  return '/uploads/' + safeName;
};

// Razorpay instance - initialize with available keys
// Set DEMO_MODE=true (env) to skip Razorpay and use mock payments
const DEMO_MODE = process.env.DEMO_MODE === 'true';

let razorpay = null;
if (!DEMO_MODE) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (keyId && keySecret && keyId.startsWith('rzp_')) {
      razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
      });
      console.log('Razorpay initialized with key:', keyId.substring(0, 10) + '...');
    } else {
      console.log('Razorpay keys not configured. Online payments will not be available.');
    }
  } catch (error) {
    console.log('Razorpay initialization error:', error.message);
  }
} else {
  console.log('Demo mode enabled - payments will be processed without real Razorpay');
}

const User = require('./models/User');
const Land = require('./models/Land');
const Payment = require('./models/Payment');
const AuditLog = require('./models/AuditLog');

// Email validation function - accepts gmail.com, landmail.com, and common domains
const isValidEmail = (email) => {
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  
  // Check for common issues
  if (email.includes('..')) return false;
  if (email.startsWith('.') || email.endsWith('.')) return false;
  if (email.includes(' ')) return false;
  
  // Allow specific domains and common domains
  const allowedDomains = ['gmail.com', 'landmail.com', 'empmail.com','custmail.com','yahoo.com', 'hotmail.com', 'outlook.com', 'rediffmail.com', 'icloud.com', 'mail.com', 'protonmail.com'];
  const emailDomain = email.split('@')[1]?.toLowerCase();
  
  // Allow landmail.com always, gmail.com always, and other allowed domains
  if (emailDomain === 'landmail.com' || emailDomain === 'gmail.com') return true;
  if (!allowedDomains.includes(emailDomain)) return false;
  
  return true;
};

// Password validation function - requires strong password
const isStrongPassword = (password) => {
  if (!password || password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
  if (!/[A-Z]/.test(password)) return { valid: false, message: 'Password must contain at least one uppercase letter' };
  if (!/[a-z]/.test(password)) return { valid: false, message: 'Password must contain at least one lowercase letter' };
  if (!/[0-9]/.test(password)) return { valid: false, message: 'Password must contain at least one number' };
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return { valid: false, message: 'Password must contain at least one special character' };
  return { valid: true, message: 'Password is strong' };
};

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/landmgmt';

mongoose.connect(MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 10000 })
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Initialize with sample data - only admin
const initializeData = async () => {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    // Hash the admin password
    const hashedPassword = await bcrypt.hash('Admin123$', 10);
    
    // Create admin only
    await User.create({
      name: 'Admin',
      email: 'admin@landmail.com',
      password: hashedPassword,
      role: 'admin'
    });
    
    console.log('Admin user created. Admin can add employees and customers from the dashboard.');
  }
};

initializeData();

// ============ AUTH ROUTES ============

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production';

if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-secret-change-me-in-production')) {
  console.warn('WARNING: JWT_SECRET is not set - using insecure default. Set it in production.');
}

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    const user = await User.findOne({ email, role });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Issue session token in an httpOnly cookie (not readable from JS)
    const token = jwt.sign({ id: user._id.toString(), role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, cookieOptions);
    
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Logout - clears the session cookie
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', cookieOptions);
  res.json({ message: 'Logged out' });
});

// Health check (public - used by uptime monitors)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    demo: DEMO_MODE
  });
});

// ============ AUTH MIDDLEWARE ============

const requireAuth = (req, res, next) => {
  const token = (req.cookies && req.cookies.token) || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Every remaining /api route requires authentication
app.use('/api', requireAuth);

// Admin-only routes
app.use(['/api/admins', '/api/stats/admin', '/api/reports/payments', '/api/fix-ids'], requireAdmin);

// ============ USER ROUTES ============

// Get all admins
app.get('/api/admins', async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('-password');
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create admin (only existing admin can create)
app.post('/api/admins', async (req, res) => {
  try {
    const { name, email, password, adminSecret } = req.body;
    
    // Validate email
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email. Use @gmail.com, @landmail.com' });
    }
    
    // Validate password strength
    const passwordCheck = isStrongPassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ message: passwordCheck.message });
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Generate admin ID
    const count = await User.countDocuments({ role: 'admin' });
    const userId = 'AD-' + String(count + 1).padStart(4, '0');
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = await User.create({
      userId,
      name,
      email,
      password: hashedPassword,
      role: 'admin'
    });
    res.status(201).json({
      _id: admin._id,
      userId: admin.userId,
      name: admin.name,
      email: admin.email,
      role: admin.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete admin
app.delete('/api/admins/:id', async (req, res) => {
  try {
    const admin = await User.findOne({ _id: req.params.id, role: 'admin' });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    // Check if this is the last admin
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return res.status(400).json({ message: 'Cannot delete the last admin' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all employees
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' }).select('-password');
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all customers
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' }).select('-password');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create employee
app.post('/api/employees', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validate email
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email. Use @gmail.com, @landmail.com or common domains' });
    }
    
    // Validate password strength
    const passwordCheck = isStrongPassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ message: passwordCheck.message });
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Generate employee ID
    const count = await User.countDocuments({ role: 'employee' });
    const userId = 'EMP-' + String(count + 1).padStart(4, '0');
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const employee = await User.create({
      userId,
      name,
      email,
      password: hashedPassword,
      role: 'employee'
    });
    res.status(201).json({
      _id: employee._id,
      userId: employee.userId,
      name: employee.name,
      email: employee.email,
      role: employee.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update employee
app.put('/api/employees/:id', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const employee = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, password },
      { returnDocument: 'after' }
    ).select('-password');
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete employee
app.delete('/api/employees/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create customer
app.post('/api/customers', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validate email
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email. Use @gmail.com, @landmail.com or common domains' });
    }
    
    // Validate password strength
    const passwordCheck = isStrongPassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ message: passwordCheck.message });
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Generate customer ID
    const count = await User.countDocuments({ role: 'customer' });
    const userId = 'CUS-' + String(count + 1).padStart(4, '0');
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const customer = await User.create({
      userId,
      name,
      email,
      password: hashedPassword,
      role: 'customer'
    });
    res.status(201).json({
      _id: customer._id,
      userId: customer.userId,
      name: customer.name,
      email: customer.email,
      role: customer.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update customer
app.put('/api/customers/:id', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const customer = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, password },
      { returnDocument: 'after' }
    ).select('-password');
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete customer
app.delete('/api/customers/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ LAND ROUTES ============

// Get all lands
app.get('/api/lands', async (req, res) => {
  try {
    const lands = await Land.find().populate('assignedEmployee', 'name').populate('ownerId', 'name');
    res.json(lands);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get lands by customer
app.get('/api/lands/customer/:customerId', async (req, res) => {
  try {
    const lands = await Land.find({ ownerId: req.params.customerId });
    res.json(lands);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get lands by employee
app.get('/api/lands/employee/:employeeId', async (req, res) => {
  try {
    const lands = await Land.find({ assignedEmployee: req.params.employeeId });
    res.json(lands);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create land with image upload
app.post('/api/lands', upload.single('image'), async (req, res) => {
  try {
    const { size = '', owner = '', ownerId = '', soldDate = '', pricePerMonth = 0, installmentTotal = 0, details = '', assignedEmployee = '', location = null } = req.body || {};
    
    // Parse location if it's a string (from FormData)
    let parsedLocation = null;
    if (location) {
      try {
        parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
        // Ensure latitude and longitude are numbers
        if (parsedLocation.latitude) parsedLocation.latitude = parseFloat(parsedLocation.latitude);
        if (parsedLocation.longitude) parsedLocation.longitude = parseFloat(parsedLocation.longitude);
      } catch (e) {
        console.log('Error parsing location:', e);
        parsedLocation = null;
      }
    }
    
    // Generate land ID - find max existing landId number to avoid duplicates
    const lastLand = await Land.findOne({}).sort({ landId: -1 });
    let nextNum = 1;
    if (lastLand && lastLand.landId) {
      const match = lastLand.landId.match(/LAND-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const landId = 'LAND-' + String(nextNum).padStart(4, '0');
    
    const land = await Land.create({
      landId,
      size,
      owner,
      ownerId: ownerId || null,
      soldDate,
      pricePerMonth: parseInt(pricePerMonth) || 0,
      installmentTotal: parseInt(installmentTotal) || 0,
      details,
      image: await saveUpload(req.file),
      assignedEmployee: assignedEmployee || null,
      status: 'sold',
      location: parsedLocation || { latitude: null, longitude: null, address: '' }
    });
    
    await land.populate('assignedEmployee', 'name');
    await land.populate('ownerId', 'name');
    
    res.status(201).json(land);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Update land (with optional image upload)
app.put('/api/lands/:id', upload.single('image'), async (req, res) => {
  try {
    // Get existing land first
    const existingLand = await Land.findById(req.params.id);
    if (!existingLand) {
      return res.status(404).json({ message: 'Land not found' });
    }
    
    const { size, owner, ownerId, soldDate, pricePerMonth, installmentTotal, details, assignedEmployee, location } = req.body || {};
    
    // Only update fields that are provided, otherwise keep existing values
    const updateData = {};
    
    if (size !== undefined) updateData.size = size || '';
    if (owner !== undefined) updateData.owner = owner || '';
    if (ownerId !== undefined) updateData.ownerId = ownerId || null;
    if (soldDate !== undefined) updateData.soldDate = soldDate || '';
    if (pricePerMonth !== undefined) updateData.pricePerMonth = parseInt(pricePerMonth) || 0;
    if (installmentTotal !== undefined) updateData.installmentTotal = parseInt(installmentTotal) || 0;
    if (details !== undefined) updateData.details = details || '';
    if (assignedEmployee !== undefined) updateData.assignedEmployee = assignedEmployee || null;
    
    // Handle location update - parse if it's a string from FormData
    if (location !== undefined) {
      if (location) {
        try {
          const parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
          updateData.location = {
            latitude: parsedLocation.latitude ? parseFloat(parsedLocation.latitude) : null,
            longitude: parsedLocation.longitude ? parseFloat(parsedLocation.longitude) : null,
            address: parsedLocation.address || ''
          };
        } catch (e) {
          console.log('Error parsing location in update:', e);
        }
      } else {
        updateData.location = { latitude: null, longitude: null, address: '' };
      }
    }
    
    // If a new image is uploaded, add it to update data
    if (req.file) {
      updateData.image = await saveUpload(req.file);
    }
    
    const land = await Land.findByIdAndUpdate(
      req.params.id,
      updateData,
      { returnDocument: 'after' }
    ).populate('assignedEmployee', 'name').populate('ownerId', 'name');
    res.json(land);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete land
app.delete('/api/lands/:id', async (req, res) => {
  try {
    await Land.findByIdAndDelete(req.params.id);
    res.json({ message: 'Land deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ PAYMENT ROUTES ============

// Get all payments
app.get('/api/payments', async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('landId')
      .populate('customerId', 'name')
      .populate('employeeId', 'name');
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get payments by customer
app.get('/api/payments/customer/:customerId', async (req, res) => {
  try {
    const payments = await Payment.find({ customerId: req.params.customerId })
      .populate('landId');
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get payments by employee
app.get('/api/payments/employee/:employeeId', async (req, res) => {
  try {
    const payments = await Payment.find({ employeeId: req.params.employeeId })
      .populate('landId')
      .populate('customerId', 'name');
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create payment
app.post('/api/payments', async (req, res) => {
  try {
    const { landId, customerId, employeeId, date, amount, mode, status } = req.body;
    
    // Get land to calculate balance
    const land = await Land.findById(landId);
    if (!land) {
      return res.status(404).json({ message: 'Land not found' });
    }
    
    // Get last payment for this land
    const lastPayment = await Payment.findOne({ landId }).sort({ date: -1 });
    
    const totalAmount = land.pricePerMonth * land.installmentTotal;
    let balance;
    
    if (!lastPayment) {
      balance = status === 'paid' ? totalAmount - amount : totalAmount;
    } else {
      balance = status === 'paid' ? lastPayment.balance - amount : lastPayment.balance;
    }
    
    // Generate payment ID - find max existing paymentId number to avoid duplicates
    const lastPaymentById = await Payment.findOne({}).sort({ paymentId: -1 });
    let nextPayNum = 1;
    if (lastPaymentById && lastPaymentById.paymentId) {
      const match = lastPaymentById.paymentId.match(/PAY-(\d+)/);
      if (match) {
        nextPayNum = parseInt(match[1], 10) + 1;
      }
    }
    const paymentId = 'PAY-' + String(nextPayNum).padStart(4, '0');
    
    const payment = await Payment.create({
      paymentId,
      landId,
      customerId,
      employeeId,
      date,
      amount: status === 'paid' ? amount : 0,
      mode,
      status,
      due: status === 'due' ? amount : 0,
      balance
    });
    
    const populatedPayment = await Payment.findById(payment._id)
      .populate('landId')
      .populate('customerId', 'name')
      .populate('employeeId', 'name');
    
    res.status(201).json(populatedPayment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete payment
app.delete('/api/payments/:id', async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update payment
app.put('/api/payments/:id', async (req, res) => {
  try {
    const { landId, customerId, employeeId, date, amount, mode, status } = req.body;
    
    // Get land to calculate balance
    const land = await Land.findById(landId);
    if (!land) {
      return res.status(404).json({ message: 'Land not found' });
    }
    
    // Get all payments for this land except the current one being updated
    const otherPayments = await Payment.find({ landId, _id: { $ne: req.params.id } });
    const totalPaidByOthers = otherPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const totalAmount = land.pricePerMonth * land.installmentTotal;
    let balance;
    
    if (status === 'paid') {
      balance = totalAmount - (totalPaidByOthers + amount);
    } else {
      balance = totalAmount - totalPaidByOthers;
    }
    
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      {
        landId,
        customerId,
        employeeId,
        date,
        amount: status === 'paid' ? amount : 0,
        mode,
        status,
        due: status === 'due' ? amount : 0,
        balance
      },
      { returnDocument: 'after' }
    ).populate('landId').populate('customerId', 'name').populate('employeeId', 'name');
    
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ DASHBOARD ROUTES ============

// Get admin stats
app.get('/api/stats/admin', async (req, res) => {
  try {
    const totalLands = await Land.countDocuments();
    const totalEmployees = await User.countDocuments({ role: 'employee' });
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    res.json({
      totalLands,
      totalEmployees,
      totalCustomers,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get employee stats
app.get('/api/stats/employee/:employeeId', async (req, res) => {
  try {
    const assignedLands = await Land.countDocuments({ assignedEmployee: req.params.employeeId });
    
    const payments = await Payment.find({ 
      employeeId: req.params.employeeId,
      status: 'paid'
    });
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    
    const duePayments = await Payment.countDocuments({ 
      employeeId: req.params.employeeId,
      status: 'due'
    });
    
    // Get all assigned lands for this employee
    const lands = await Land.find({ assignedEmployee: req.params.employeeId });
    
    // Calculate completed lands (fully paid)
    let completedLands = 0;
    for (const land of lands) {
      const landPayments = payments.filter(p => String(p.landId) === String(land._id));
      const totalPaid = landPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalAmount = (land.pricePerMonth || 0) * (land.installmentTotal || 0);
      if (totalPaid >= totalAmount && totalAmount > 0) {
        completedLands++;
      }
    }
    
    res.json({
      assignedLands,
      totalPayments,
      duePayments,
      completedLands
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get customer stats
app.get('/api/stats/customer/:customerId', async (req, res) => {
  try {
    const customerLands = await Land.countDocuments({ ownerId: req.params.customerId });
    
    const payments = await Payment.find({ 
      customerId: req.params.customerId,
      status: 'paid'
    });
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    
    const duePayments = await Payment.countDocuments({ 
      customerId: req.params.customerId,
      status: 'due'
    });
    
    const lastPayment = await Payment.findOne({ customerId: req.params.customerId })
      .sort({ date: -1 });
    
    res.json({
      customerLands,
      totalPaid,
      duePayments,
      remainingBalance: lastPayment?.balance || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get payment summary for reports
app.get('/api/reports/payments', async (req, res) => {
  try {
    const cashTotal = await Payment.aggregate([
      { $match: { mode: 'cash', status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    
    const onlineTotal = await Payment.aggregate([
      { $match: { mode: 'online', status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    
    res.json({
      cash: {
        total: cashTotal[0]?.total || 0,
        count: cashTotal[0]?.count || 0
      },
      online: {
        total: onlineTotal[0]?.total || 0,
        count: onlineTotal[0]?.count || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ AUDIT LOG ROUTES ============

// Get all audit logs
app.get('/api/auditlogs', async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create audit log entry
app.post('/api/auditlogs', async (req, res) => {
  try {
    const { action, description, userId, userName, userRole, entityType, entityId, details } = req.body;
    const log = await AuditLog.create({
      action,
      description,
      userId,
      userName,
      userRole,
      entityType,
      entityId,
      details
    });
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ GEOCODING ROUTES (Search and Reverse Geocoding) ============

// Geocoding rate limiting and caching - permanent solution
let lastGeocodeTime = 0;
const GEOCODE_DELAY_MS = 5000; // 5 second delay between requests
const RETRY_DELAY_MS = 10000; // 10 second wait on rate limit before retry

// In-memory cache
const geocodeCache = new Map();
const searchCache = new Map();
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour cache

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Format coordinates into readable address
const formatCoordsAsAddress = (lat, lon) => {
  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  const latDir = latNum >= 0 ? 'N' : 'S';
  const lonDir = lonNum >= 0 ? 'E' : 'W';
  return {
    display_name: `${Math.abs(latNum).toFixed(4)}Â°${latDir}, ${Math.abs(lonNum).toFixed(4)}Â°${lonDir}`,
    address: { latitude: latNum, longitude: lonNum }
  };
};

// Search for locations (proxy to avoid CORS)
app.get('/api/geocode/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }
    
    console.log(`Searching for: ${q}`);
    
    // Wait to respect rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastGeocodeTime;
    if (timeSinceLastRequest < GEOCODE_DELAY_MS) {
      await wait(GEOCODE_DELAY_MS - timeSinceLastRequest);
    }
    lastGeocodeTime = Date.now();
    
    // Try multiple search queries for better results
    const searchQueries = [
      q,
      `${q}, India`,
      `${q}, Gujarat, India`,
      `${q}, Karnataka, India`
    ];
    
    let allResults = [];
    
    for (const searchQuery of searchQueries) {
      const searchParams = new URLSearchParams({
        format: 'json',
        q: searchQuery,
        limit: '10',
        addressdetails: '1',
        accept_language: 'en',
        countrycodes: 'in'
      });
      
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`,
          {
            headers: {
              'User-Agent': 'LandManagementApp/1.0',
              'Accept': 'application/json'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          data.forEach(item => {
            if (!allResults.find(r => r.place_id === item.place_id)) {
              allResults.push(item);
            }
          });
        }
      } catch (e) {
        console.log('Search query failed:', searchQuery);
      }
      
      // Add small delay between queries
      await wait(500);
    }
    
    // Limit results
    allResults = allResults.slice(0, 15);
    
    // Process results
    const processedResults = allResults.map(item => {
      let displayParts = [];
      const addr = item.address || {};
      
      if (item.name && item.name !== item.display_name) {
        displayParts.push(item.name);
      }
      
      if (addr.neighbourhood) displayParts.push(addr.neighbourhood);
      if (addr.suburb) displayParts.push(addr.suburb);
      if (addr.locality) displayParts.push(addr.locality);
      if (addr.town) displayParts.push(addr.town);
      if (addr.city) displayParts.push(addr.city);
      if (addr.district) displayParts.push(addr.district);
      if (addr.village) displayParts.push(addr.village);
      if (addr.state) displayParts.push(addr.state);
      
      return {
        ...item,
        display_name: displayParts.length > 0 ? 
          displayParts.join(', ') + ', India' : 
          item.display_name
      };
    });
    
    res.json(processedResults);
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// Reverse geocode coordinates to address (proxy to avoid CORS)
app.get('/api/geocode/reverse', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    // Check cache first
    const cacheKey = `${lat},${lon}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_EXPIRY_MS)) {
      console.log('Returning cached result');
      return res.json(cached.data);
    }
    
    console.log(`Reverse geocoding: lat=${lat}, lon=${lon}`);
    
    // Wait to respect rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastGeocodeTime;
    if (timeSinceLastRequest < GEOCODE_DELAY_MS) {
      await wait(GEOCODE_DELAY_MS - timeSinceLastRequest);
    }
    lastGeocodeTime = Date.now();
    
    // Fetch from Nominatim with manual timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'LandManagementApp/1.0',
          'Accept': 'application/json'
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    console.log(`Nominatim response status: ${response.status}`);
    
    // Check for rate limiting (429) or other errors
    if (response.status === 429) {
      console.log('Rate limited by Nominatim, waiting longer and retrying...');
      // Wait much longer and retry once
      await wait(RETRY_DELAY_MS);
      lastGeocodeTime = Date.now();
      
      const retryResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'LandManagementApp/1.0',
            'Accept': 'application/json'
          }
        }
      );
      
      if (retryResponse.ok) {
        const text = await retryResponse.text();
        try {
          const data = JSON.parse(text);
          if (data && (data.display_name || data.address)) {
            // Cache the result
            geocodeCache.set(cacheKey, { data, timestamp: Date.now() });
            return res.json(data);
          }
        } catch (e) {
          console.log('Invalid JSON from retry');
        }
      }
      
      // If still failing, return coordinates as fallback
      const fallbackData = formatCoordsAsAddress(lat, lon);
      geocodeCache.set(cacheKey, { data: fallbackData, timestamp: Date.now() });
      return res.json(fallbackData);
    }
    
    if (!response.ok) {
      console.log('Nominatim error, using fallback');
      const fallbackData = formatCoordsAsAddress(lat, lon);
      geocodeCache.set(cacheKey, { data: fallbackData, timestamp: Date.now() });
      return res.json(fallbackData);
    }
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.log('Invalid JSON from Nominatim, using fallback');
      const fallbackData = formatCoordsAsAddress(lat, lon);
      geocodeCache.set(cacheKey, { data: fallbackData, timestamp: Date.now() });
      return res.json(fallbackData);
    }
    
    console.log('Nominatim response data:', data);
    
    // If we got valid data, cache and return it
    if (data && (data.display_name || data.address)) {
      geocodeCache.set(cacheKey, { data, timestamp: Date.now() });
      return res.json(data);
    }
    
    // If no valid data, use fallback
    const fallbackData = formatCoordsAsAddress(lat, lon);
    geocodeCache.set(cacheKey, { data: fallbackData, timestamp: Date.now() });
    return res.json(fallbackData);
  } catch (error) {
    console.error('Geocoding error:', error.message);
    
    // On any error, return fallback coordinates
    const { lat, lon } = req.query;
    if (lat && lon) {
      const fallbackData = formatCoordsAsAddress(lat, lon);
      geocodeCache.set(cacheKey, { data: fallbackData, timestamp: Date.now() });
      return res.json(fallbackData);
    }
    
    res.status(500).json({ message: error.message });
  }
});

// ============ PAYMENT REFUND ROUTES ============

// Process payment refund
app.post('/api/payments/:id/refund', async (req, res) => {
  try {
    const { amount, mode, date } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    if (payment.status === 'refunded') {
      return res.status(400).json({ message: 'Payment already refunded' });
    }
    
    // Calculate refund amount (use provided amount or full amount)
    const refundAmount = amount ? parseInt(amount) : payment.amount;
    
    // Validate refund amount
    if (refundAmount > payment.amount) {
      return res.status(400).json({ message: 'Refund amount cannot exceed original payment amount' });
    }
    
    // Store original amount and calculate new amount
    const originalAmount = payment.amount;
    payment.refundAmount = refundAmount;
    payment.amount = payment.amount - refundAmount;
    
    // If fully refunded, mark as refunded; otherwise partial refund
    if (payment.amount === 0) {
      payment.status = 'refunded';
    } else {
      payment.status = 'partial_refund';
    }
    
    // Update balance (add refund amount back)
    payment.balance = payment.balance + refundAmount;
    
    // Store refund details
    if (mode) payment.refundMode = mode;
    if (date) payment.refundDate = date;
    
    await payment.save();
    
    // Get land to recalculate balance
    const land = await Land.findById(payment.landId);
    if (land) {
      const allPayments = await Payment.find({ landId: land._id, status: { $ne: 'refunded' } });
      const totalPaid = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalAmount = (land.pricePerMonth || 0) * (land.installmentTotal || 0);
      
      // Update balance for latest payment
      const latestPayment = await Payment.findOne({ landId: land._id }).sort({ date: -1 });
      if (latestPayment) {
        latestPayment.balance = Math.max(0, totalAmount - totalPaid);
        await latestPayment.save();
      }
    }
    
    const populatedPayment = await Payment.findById(payment._id)
      .populate('landId')
      .populate('customerId', 'name')
      .populate('employeeId', 'name');
    
    res.json(populatedPayment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ RAZORPAY PAYMENT ROUTES ============

// Create Razorpay order for payment
app.post('/api/payments/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', landId, customerId } = req.body;
    
    // Validate amount
    const amountInPaise = Math.round(amount * 100);
    if (amountInPaise < 100) {
      return res.status(400).json({ message: 'Minimum amount should be â‚¹1' });
    }
    
    // If Razorpay is not configured, use demo mode
    if (!razorpay || DEMO_MODE) {
      // Create a mock order for demo/testing
      const mockOrderId = 'demo_order_' + Date.now();
      return res.json({
        id: mockOrderId,
        amount: amountInPaise,
        currency: currency,
        receipt: `receipt_${Date.now()}`,
        demo: true
      });
    }
    
    const options = {
      amount: amountInPaise,
      currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        landId: landId || '',
        customerId: customerId || ''
      }
    };
    
    const order = await razorpay.orders.create(options);
    
    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ message: 'Failed to create payment order: ' + error.message });
  }
});

// Verify Razorpay payment
app.post('/api/payments/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, landId, customerId, employeeId, date, amount, balance, demo } = req.body;
    
    // Demo mode verification
    if (demo || DEMO_MODE) {
      // In demo mode, just create the payment without verification
      // Generate payment ID - find max existing paymentId number to avoid duplicates
      const lastPayDemo = await Payment.findOne({}).sort({ paymentId: -1 });
      let nextPayDemo = 1;
      if (lastPayDemo && lastPayDemo.paymentId) {
        const match = lastPayDemo.paymentId.match(/PAY-(\d+)/);
        if (match) {
          nextPayDemo = parseInt(match[1], 10) + 1;
        }
      }
      const paymentId = 'PAY-' + String(nextPayDemo).padStart(4, '0');
      
      // Get land to calculate balance
      const land = await Land.findById(landId);
      const totalAmount = land ? land.pricePerMonth * land.installmentTotal : 0;
      const newBalance = balance !== undefined ? balance : (totalAmount - amount);
      
      const payment = await Payment.create({
        paymentId,
        landId,
        customerId,
        employeeId: employeeId || null,
        date: date || new Date().toISOString().split('T')[0],
        amount: amount,
        mode: 'online',
        status: 'paid',
        due: 0,
        balance: newBalance,
        razorpayPaymentId: razorpay_payment_id || 'demo_' + Date.now(),
        razorpayOrderId: razorpay_order_id || 'demo_order_' + Date.now()
      });
      
      const populatedPayment = await Payment.findById(payment._id)
        .populate('landId')
        .populate('customerId', 'name')
        .populate('employeeId', 'name');
      
      return res.json({
        success: true,
        payment: populatedPayment,
        demo: true
      });
    }
    
    // Verify signature for real mode
    const crypto = require('crypto');
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    
    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }
    
    // Payment verified, create payment record
    // Generate payment ID - find max existing paymentId number to avoid duplicates
    const lastPayVerify = await Payment.findOne({}).sort({ paymentId: -1 });
    let nextPayVerify = 1;
    if (lastPayVerify && lastPayVerify.paymentId) {
      const match = lastPayVerify.paymentId.match(/PAY-(\d+)/);
      if (match) {
        nextPayVerify = parseInt(match[1], 10) + 1;
      }
    }
    const paymentId = 'PAY-' + String(nextPayVerify).padStart(4, '0');
    
    const land = await Land.findById(landId);
    const totalAmount = land ? land.pricePerMonth * land.installmentTotal : 0;
    const newBalance = balance !== undefined ? balance : (totalAmount - amount);
    
    const payment = await Payment.create({
      paymentId,
      landId,
      customerId,
      employeeId: employeeId || null,
      date: date || new Date().toISOString().split('T')[0],
      amount: amount,
      mode: 'online',
      status: 'paid',
      due: 0,
      balance: newBalance,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id
    });
    
    const populatedPayment = await Payment.findById(payment._id)
      .populate('landId')
      .populate('customerId', 'name')
      .populate('employeeId', 'name');
    
    res.json({
      success: true,
      payment: populatedPayment
    });
  } catch (error) {
    console.error('Razorpay payment verification error:', error);
    res.status(500).json({ message: 'Failed to verify payment: ' + error.message });
  }
});

// Get Razorpay key for frontend
app.get('/api/payments/key', async (req, res) => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    if (!keyId || !keyId.startsWith('rzp_')) {
      // Return demo mode info
      return res.json({ key: 'demo_key', configured: true, demo: true, message: 'Demo mode - testing enabled' });
    }
    res.json({ key: keyId, configured: true, demo: false });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get payment key' });
  }
});

// Fix duplicate IDs endpoint - finds max existing IDs (admin only)
app.get('/api/fix-ids', async (req, res) => {
  try {
    const lastLand = await Land.findOne({}).sort({ landId: -1 });
    const maxLandNum = lastLand && lastLand.landId
      ? parseInt(lastLand.landId.replace('LAND-', ''), 10)
      : 0;

    const lastPayment = await Payment.findOne({}).sort({ paymentId: -1 });
    const maxPaymentNum = lastPayment && lastPayment.paymentId
      ? parseInt(lastPayment.paymentId.replace('PAY-', ''), 10)
      : 0;

    res.json({
      message: 'Current max IDs retrieved',
      maxLandId: maxLandNum > 0 ? 'LAND-' + String(maxLandNum).padStart(4, '0') : 'None',
      maxPaymentId: maxPaymentNum > 0 ? 'PAY-' + String(maxPaymentNum).padStart(4, '0') : 'None',
      nextLandId: 'LAND-' + String(maxLandNum + 1).padStart(4, '0'),
      nextPaymentId: 'PAY-' + String(maxPaymentNum + 1).padStart(4, '0')
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reset database - admin only, disabled in production
app.get('/api/reset', requireAdmin, async (req, res) => {
  if (isProd) {
    return res.status(403).json({ message: 'Database reset is disabled in production' });
  }
  try {
    await User.deleteMany({});
    await Land.deleteMany({});
    await Payment.deleteMany({});

    const hashedPassword = await bcrypt.hash('Admin123$', 10);
    await User.create({
      name: 'Admin',
      email: 'admin@landmail.com',
      password: hashedPassword,
      role: 'admin'
    });

    res.json({ message: 'Database reset. Admin created.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ ERROR HANDLING ============

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler - never leak internal details to clients
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: status >= 500 ? 'Internal server error' : (err.message || 'Request failed') });
});

// Start server only when run directly (not on Vercel serverless)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;

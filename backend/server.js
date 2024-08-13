const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const QRCode = require('qrcode');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

mongoose.connect(process.env.MONGODB_URI, {
  
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  googleId: String,
  dateOfBirth: Date,
  phoneNumber: String,
  profileImage: String,
  qrCode: String,
});

const User = mongoose.model('User', userSchema);

// Set up multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname))
    }
  });
  
const upload = multer({ storage: storage });

// Existing routes (register, login, google-login)...
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = new User({ name, email, password });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (user) {
      res.status(200).json({ message: 'Login successful', userId: user._id });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error logging in' });
  }
});

app.post('/api/google-login', async (req, res) => {
  try {
    const { name, email, googleId } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ name, email, googleId });
      await user.save();
    }
    res.status(200).json({ message: 'Google login successful', userId: user._id });
  } catch (error) {
    res.status(500).json({ message: 'Error with Google login' });
  }
});

app.get('/api/user/:id', async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (user) {
        res.json({
          name: user.name,
          email: user.email,
          dateOfBirth: user.dateOfBirth,
          phoneNumber: user.phoneNumber,
          profileImage: user.profileImage,
        });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user data' });
    }
});
  
app.put('/api/user/:id', upload.single('profileImage'), async (req, res) => {
  try {
    const { name, dateOfBirth, phoneNumber } = req.body;
    const updateData = { name, dateOfBirth, phoneNumber };
    
    if (req.file) {
      updateData.profileImage = req.file.path;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    if (user) {
      // Generate QR code
      const qrCodeData = `${process.env.FRONTEND_URL}/public-profile/${user._id}`;
      const qrCodeImage = await QRCode.toDataURL(qrCodeData);
      user.qrCode = qrCodeImage;
      await user.save();

      res.json({
        name: user.name,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        phoneNumber: user.phoneNumber,
        profileImage: user.profileImage,
        qrCode: user.qrCode,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating user data' });
  }
});
  
app.get('/api/public-profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      res.json({
        name: user.name,
        profileImage: user.profileImage,
        dateOfBirth: user.dateOfBirth,
        phoneNumber: user.phoneNumber,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching public profile' });
  }
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
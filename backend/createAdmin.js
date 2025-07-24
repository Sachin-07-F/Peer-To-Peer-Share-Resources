const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/peershare', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createAdmin() {
  const email = 'admin@peershare.com';
  const password = 'admin123';
  const name = 'Admin';
  const hashed = await bcrypt.hash(password, 10);
  try {
    await User.create({ name, email, password: hashed, role: 'admin' });
    console.log('Admin user created!');
  } catch (e) {
    console.log('Admin already exists or error:', e.message);
  }
  mongoose.disconnect();
}

createAdmin(); 
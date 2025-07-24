const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/peershare', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixProducts() {
  try {
    const admin = await User.findOne({ email: 'admin@peershare.com', role: 'admin' });
    if (!admin) {
      console.error('Admin user not found!');
      mongoose.disconnect();
      return;
    }
    await Product.updateMany({}, { $set: { createdBy: admin._id } });
    console.log('All products updated with valid admin ObjectId:', admin._id.toString());
  } catch (err) {
    console.error('Error updating products:', err);
  }
  mongoose.disconnect();
}

fixProducts(); 
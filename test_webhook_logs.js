const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const WhatsAppWebhookLog = require('./models/WhatsAppWebhookLog');
const WhatsAppConfig = require('./models/WhatsAppConfig');

async function checkLogs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to DB");

    // Fetch config
    const configs = await WhatsAppConfig.find({});
    console.log("\n--- WhatsApp Configs ---");
    console.log(JSON.stringify(configs, null, 2));

    // Fetch recent logs
    const logs = await WhatsAppWebhookLog.find({}).sort({ timestamp: -1 }).limit(10);
    console.log("\n--- Recent Webhook Logs (Last 10) ---");
    logs.forEach(log => {
      console.log(`[${log.timestamp}] Status: ${log.status}, Phone: ${log.phone}, Campaign: ${log.campaignName}`);
      if (log.status === 'debug' || log.campaignName === 'Raw Incoming Webhook') {
        console.log("RAW PAYLOAD:");
        console.log(log.rawPayload);
      }
    });

    mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error);
    mongoose.connection.close();
  }
}

checkLogs();

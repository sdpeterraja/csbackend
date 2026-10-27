// controllers/billingController.js
const BrevoConfig = require('../models/BrevoConfig');
const WhatsAppConfig = require('../models/WhatsAppConfig');
const WhatsAppCampaign = require('../models/WhatsAppCampaign');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const WhatsAppTemplate = require('../models/WhatsAppTemplate');
const Campaign = require('../models/Campaign');
const BrevoService = require('../services/brevoService');

class BillingController {
  async getUsageAndCharges(req, res) {
    try {
      const userId = req.user?.userId;
      const now = new Date();
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

      const getDocDate = (doc) => {
        if (!doc) return null;
        const raw = doc.createdAt || doc.date || doc.scheduledAt || doc.sentAt;
        if (raw) {
          const d = new Date(raw);
          if (!isNaN(d.getTime())) return d;
        }
        if (doc._id && typeof doc._id.getTimestamp === 'function') {
          try { return doc._id.getTimestamp(); } catch (e) {}
        }
        return null;
      };

      // Retrieve all email campaigns across history for this user or workspace
      let allEmailCampaigns = [];
      try {
        if (userId) {
          allEmailCampaigns = await Campaign.find({ userId }).lean().catch(() => []);
        }
        if (allEmailCampaigns.length === 0) {
          allEmailCampaigns = await Campaign.find({}).lean().catch(() => []);
        }
      } catch (e) {}

      // Retrieve all WhatsApp campaigns across history
      let allWaCampaigns = [];
      try {
        if (userId) {
          allWaCampaigns = await WhatsAppCampaign.find({ userId }).lean().catch(() => []);
        }
        if (allWaCampaigns.length === 0) {
          allWaCampaigns = await WhatsAppCampaign.find({}).lean().catch(() => []);
        }
      } catch (e) {}

      // Retrieve all 1-on-1 outbound WhatsApp chat messages
      let allWaMessages = [];
      try {
        if (userId) {
          allWaMessages = await WhatsAppMessage.find({ userId, direction: 'outbound' }).lean().catch(() => []);
        }
        if (allWaMessages.length === 0) {
          allWaMessages = await WhatsAppMessage.find({ direction: 'outbound' }).lean().catch(() => []);
        }
      } catch (e) {}

      // ----------------------------------------------------
      // 1. BREVO EMAIL USAGE & PLAN
      // ----------------------------------------------------
      let brevoData = {
        isConnected: false,
        senderEmail: null,
        senderName: null,
        planName: "Brevo Free Tier",
        planType: "free",
        creditsRemaining: 0,
        creditsTotal: 0,
        creditsUsed: 0,
        usagePercentage: 0,
        monthlyEmailsSent: 0,
        dailyLimit: 300,
        estimatedCostUSD: 0,
        estimatedCostINR: 0,
        status: "disconnected"
      };

      try {
        // Find existing Brevo configuration for this user or system-wide
        let brevoConfig = null;
        if (userId) {
          brevoConfig = await BrevoConfig.findOne({ userId });
        }
        if (!brevoConfig || !brevoConfig.apiKey) {
          brevoConfig = await BrevoConfig.findOne({ isConnected: true, apiKey: { $exists: true, $ne: "" } })
            || await BrevoConfig.findOne({ apiKey: { $exists: true, $ne: "" } });
        }

        const brevoApiKey = brevoConfig?.apiKey || process.env.BREVO_API_KEY;

        if (brevoApiKey) {
          brevoData.isConnected = true;
          brevoData.senderEmail = brevoConfig?.senderEmail || "marketing@catalogstack.in";
          brevoData.senderName = brevoConfig?.senderName || "CatalogStack";
          brevoData.dailyLimit = brevoConfig?.dailyLimit || 10000;
          brevoData.status = "active";

          // Fetch live account info directly from Brevo
          try {
            const accountInfo = await BrevoService.getAccountInfo(brevoApiKey);
            if (accountInfo) {
              const plans = accountInfo.plan || [];
              const emailPlan = plans.find(p => p.type === 'subscription' || p.type === 'free' || p.type === 'payAsYouGo') || plans[0];

              if (emailPlan) {
                brevoData.planType = emailPlan.type;
                brevoData.planName = emailPlan.type === 'free' ? 'Brevo Free Tier'
                  : emailPlan.type === 'subscription' ? 'Brevo Starter / Business'
                  : emailPlan.type === 'payAsYouGo' ? 'Pay-As-You-Go Credits'
                  : 'Standard Plan';
                
                brevoData.creditsRemaining = emailPlan.credits !== undefined ? emailPlan.credits : 0;
              }

              if (accountInfo.email) {
                brevoData.senderEmail = brevoConfig?.senderEmail || accountInfo.email;
              }
              if (accountInfo.companyName) {
                brevoData.senderName = brevoConfig?.senderName || accountInfo.companyName;
              }
            }
          } catch (accErr) {
            console.warn("Notice: Brevo live account check:", accErr.message);
          }

          // Aggregate email campaign volume for current month
          const currentMonthEmails = allEmailCampaigns.filter(c => {
            const cd = getDocDate(c);
            return cd && cd >= startOfCurrentMonth && cd < endOfCurrentMonth;
          });
          const monthlySent = currentMonthEmails.reduce((acc, c) => acc + (c.sentCount || 0), 0);
          brevoData.monthlyEmailsSent = monthlySent;

          // Compute usage & limits
          const totalCredits = brevoData.creditsRemaining + monthlySent;
          brevoData.creditsTotal = totalCredits > 0 ? totalCredits : (brevoData.dailyLimit * 30);
          brevoData.creditsUsed = monthlySent;
          brevoData.usagePercentage = brevoData.creditsTotal > 0
            ? Math.min(100, Math.round((brevoData.creditsUsed / brevoData.creditsTotal) * 100))
            : 0;

          if (brevoData.planType === 'subscription') {
            brevoData.estimatedCostUSD = 25.00;
            brevoData.estimatedCostINR = 2087.50;
          } else {
            brevoData.estimatedCostUSD = 0.00;
            brevoData.estimatedCostINR = 0.00;
          }
        }
      } catch (brevoErr) {
        console.error("Error processing Brevo billing data:", brevoErr);
      }

      // ----------------------------------------------------
      // 2. WHATSAPP META CLOUD USAGE & CHARGES
      // ----------------------------------------------------
      let whatsAppData = {
        isConnected: false,
        displayPhoneNumber: null,
        verifiedName: null,
        qualityRating: null,
        codeVerificationStatus: null,
        phoneId: null,
        wabaId: null,
        totalSent: 0,
        totalDelivered: 0,
        totalRead: 0,
        totalFailed: 0,
        categories: {
          marketing: { count: 0, costPerMsgINR: 0.80, costINR: 0 },
          utility: { count: 0, costPerMsgINR: 0.12, costINR: 0 },
          authentication: { count: 0, costPerMsgINR: 0.12, costINR: 0 },
          service: { count: 0, costPerMsgINR: 0.30, costINR: 0 }
        },
        estimatedChargesINR: 0,
        estimatedChargesUSD: 0,
        currency: "INR",
        status: "disconnected"
      };

      try {
        // Find existing WhatsApp configuration for this user or workspace
        let waConfig = null;
        if (userId) {
          waConfig = await WhatsAppConfig.findOne({ userId });
        }
        if (!waConfig || !waConfig.accessToken || waConfig.accessToken.length < 10) {
          waConfig = await WhatsAppConfig.findOne({ accessToken: { $exists: true, $ne: "" } });
        }

        if (waConfig && waConfig.accessToken) {
          whatsAppData.isConnected = true;
          whatsAppData.phoneId = waConfig.phoneId;
          whatsAppData.wabaId = waConfig.wabaId;
          whatsAppData.status = "active";
          whatsAppData.qualityRating = "GREEN";

          // Fetch Meta phone details via Graph API
          if (waConfig.phoneId) {
            try {
              const apiVersion = waConfig.apiVersion || 'v20.0';
              const metaRes = await fetch(
                `https://graph.facebook.com/${apiVersion}/${waConfig.phoneId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status,status`,
                {
                  headers: { 'Authorization': `Bearer ${waConfig.accessToken}` }
                }
              );
              if (metaRes.ok) {
                const metaJson = await metaRes.json();
                whatsAppData.displayPhoneNumber = metaJson.display_phone_number || null;
                whatsAppData.verifiedName = metaJson.verified_name || null;
                whatsAppData.qualityRating = metaJson.quality_rating || "GREEN";
                whatsAppData.codeVerificationStatus = metaJson.code_verification_status || null;
              }
            } catch (metaErr) {
              console.warn("Notice: Meta phone verification lookup:", metaErr.message);
            }
          }

          // Fetch Template categories mapping
          const templates = await WhatsAppTemplate.find(userId ? { userId } : {}).lean().catch(() => []);
          const templateCategoryMap = {};
          templates.forEach(t => {
            const cat = (t.category || "MARKETING").toUpperCase();
            templateCategoryMap[t.id] = cat;
            if (t.name) templateCategoryMap[t.name] = cat;
          });

          // Aggregate current month's WhatsApp activity
          const currentMonthWaCamps = allWaCampaigns.filter(c => {
            const cd = getDocDate(c);
            return cd && cd >= startOfCurrentMonth && cd < endOfCurrentMonth;
          });

          let marketingCount = 0;
          let utilityCount = 0;
          let authCount = 0;

          currentMonthWaCamps.forEach(camp => {
            const sent = camp.sentCount || 0;
            whatsAppData.totalSent += sent;
            whatsAppData.totalDelivered += (camp.deliveredCount || 0);
            whatsAppData.totalRead += (camp.readCount || 0);
            whatsAppData.totalFailed += (camp.failedCount || 0);

            const cat = templateCategoryMap[camp.templateId] || "MARKETING";
            if (cat === "UTILITY") {
              utilityCount += sent;
            } else if (cat === "AUTHENTICATION") {
              authCount += sent;
            } else {
              marketingCount += sent;
            }
          });

          const currentMonthWaMsgs = allWaMessages.filter(m => {
            const cd = getDocDate(m);
            return cd && cd >= startOfCurrentMonth && cd < endOfCurrentMonth;
          });
          const serviceMessagesCount = currentMonthWaMsgs.length;
          whatsAppData.totalSent += serviceMessagesCount;

          // Calculate estimated Meta rate charges for current month
          const marketingCost = +(marketingCount * 0.80).toFixed(2);
          const utilityCost = +(utilityCount * 0.12).toFixed(2);
          const authCost = +(authCount * 0.12).toFixed(2);
          const serviceCost = +(serviceMessagesCount * 0.30).toFixed(2);

          whatsAppData.categories.marketing = { count: marketingCount, costPerMsgINR: 0.80, costINR: marketingCost };
          whatsAppData.categories.utility = { count: utilityCount, costPerMsgINR: 0.12, costINR: utilityCost };
          whatsAppData.categories.authentication = { count: authCount, costPerMsgINR: 0.12, costINR: authCost };
          whatsAppData.categories.service = { count: serviceMessagesCount, costPerMsgINR: 0.30, costINR: serviceCost };

          const totalINR = +(marketingCost + utilityCost + authCost + serviceCost).toFixed(2);
          whatsAppData.estimatedChargesINR = totalINR;
          whatsAppData.estimatedChargesUSD = +(totalINR / 83.5).toFixed(2);
        }
      } catch (waErr) {
        console.error("Error processing WhatsApp billing data:", waErr);
      }

      // ----------------------------------------------------
      // 3. COMBINED SUMMARY & MONTHLY INVOICE BREAKDOWN
      // ----------------------------------------------------
      const totalEstimatedSpendUSD = +(brevoData.estimatedCostUSD + whatsAppData.estimatedChargesUSD).toFixed(2);
      const totalEstimatedSpendINR = +(brevoData.estimatedCostINR + whatsAppData.estimatedChargesINR).toFixed(2);

      const currentMonthName = now.toLocaleString('default', { month: 'short' });
      const currentYear = now.getFullYear();

      // Generate all 12 rolling months derived 100% from actual database campaigns and messages
      const invoiceHistory = [];
      const safeEmailList = allEmailCampaigns;
      const safeWaCampList = allWaCampaigns;
      const safeWaMsgList = allWaMessages;

      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mName = d.toLocaleString('default', { month: 'short' });
        const fullMonth = d.toLocaleString('default', { month: 'long' });
        const yNum = d.getFullYear();
        const mNum = String(d.getMonth() + 1).padStart(2, '0');
        const monthKey = `${yNum}-${mNum}`;

        const monthStart = new Date(yNum, d.getMonth(), 1, 0, 0, 0, 0);
        const monthEnd = new Date(yNum, d.getMonth() + 1, 1, 0, 0, 0, 0);

        // Real email campaigns sent in this specific calendar month
        const monthEmails = safeEmailList.filter(c => {
          const cd = getDocDate(c);
          return cd && cd >= monthStart && cd < monthEnd;
        });
        const monthEmailSent = monthEmails.reduce((acc, c) => acc + (c.sentCount || 0), 0);

        // Real WhatsApp campaigns sent in this specific calendar month
        const monthWaCamps = safeWaCampList.filter(c => {
          const cd = getDocDate(c);
          return cd && cd >= monthStart && cd < monthEnd;
        });

        let monthMarketingCount = 0;
        let monthUtilityCount = 0;
        let monthAuthCount = 0;

        monthWaCamps.forEach(camp => {
          const sent = camp.sentCount || 0;
          monthMarketingCount += sent;
        });

        // Real 1-on-1 outbound WhatsApp chat messages in this specific calendar month
        const monthWaMsgs = safeWaMsgList.filter(m => {
          const cd = getDocDate(m);
          return cd && cd >= monthStart && cd < monthEnd;
        });
        const monthServiceCount = monthWaMsgs.length;

        const totalWaSent = monthMarketingCount + monthUtilityCount + monthAuthCount + monthServiceCount;

        // Compute actual Meta WhatsApp provider cost
        const waCostINR = +(
          monthMarketingCount * 0.80 +
          monthUtilityCount * 0.12 +
          monthAuthCount * 0.12 +
          monthServiceCount * 0.30
        ).toFixed(2);

        // Compute actual Brevo email cost (subscription fee if active, or per-credit fee)
        const emailCostINR = (brevoData.planType === 'subscription')
          ? (monthEmailSent > 0 || i === 0 ? 2087.50 : 0.00)
          : +(monthEmailSent * 0.09).toFixed(2);

        const baseINR = +(waCostINR + emailCostINR).toFixed(2);
        const baseUSD = +(baseINR / 83.5).toFixed(2);
        const forexINR = +(baseINR * 0.055).toFixed(2);
        const forexUSD = +(baseUSD * 0.055).toFixed(2);
        const serviceChargeINR = +(baseINR * 0.30).toFixed(2);
        const serviceChargeUSD = +(baseUSD * 0.30).toFixed(2);
        const totalBilledINR = +(baseINR + forexINR + serviceChargeINR).toFixed(2);
        const totalBilledUSD = +(baseUSD + forexUSD + serviceChargeUSD).toFixed(2);

        invoiceHistory.push({
          id: `INV-${yNum}-${mNum}`,
          date: `${mName} 01, ${yNum}`,
          monthName: mName,
          fullMonthName: fullMonth,
          year: yNum,
          monthKey: monthKey,
          channel: "Combined (WhatsApp + Brevo)",
          baseCostINR: baseINR,
          baseCostUSD: baseUSD,
          forexChargeINR: forexINR,
          forexChargeUSD: forexUSD,
          serviceChargeINR: serviceChargeINR,
          serviceChargeUSD: serviceChargeUSD,
          totalBilledINR: totalBilledINR,
          totalBilledUSD: totalBilledUSD,
          amountUSD: `$${totalBilledUSD.toFixed(2)}`,
          amountINR: `₹${totalBilledINR.toLocaleString()}`,
          status: i === 0 ? "Current Cycle" : (totalBilledINR > 0 ? "Paid" : "Settled"),
          whatsappVolume: totalWaSent,
          brevoVolume: monthEmailSent
        });
      }

      // Standard Rate Cards
      const rates = {
        whatsapp: [
          { category: "Marketing", rateINR: 0.80, rateUSD: 0.0096, unit: "per message / conversation", description: "Promotional campaigns, offers, product launches" },
          { category: "Utility", rateINR: 0.12, rateUSD: 0.0014, unit: "per message / conversation", description: "Order updates, shipping notices, billing alerts" },
          { category: "Authentication", rateINR: 0.12, rateUSD: 0.0014, unit: "per message / conversation", description: "Login OTPs, security verification codes" },
          { category: "Service", rateINR: 0.30, rateUSD: 0.0036, unit: "per user-initiated conversation", description: "Customer care & inquiries (First 1,000/mo FREE)" }
        ],
        brevo: [
          { plan: "Free Tier", emailsPerDay: 300, monthlyLimit: 9000, priceINR: 0, priceUSD: 0, billingCycle: "Free Forever", features: "Up to 300 emails/day, core templates" },
          { plan: "Starter Plan", emailsPerDay: "Unlimited", monthlyLimit: 20000, priceINR: 1250, priceUSD: 15, billingCycle: "/ month", features: "No daily limit, basic reporting, Brevo logo removed" },
          { plan: "Business Plan", emailsPerDay: "Unlimited", monthlyLimit: 40000, priceINR: 2087, priceUSD: 25, billingCycle: "/ month", features: "Send-time optimization, phone support, advanced analytics" },
          { plan: "Prepaid Credits", emailsPerDay: "Flexible", monthlyLimit: "Pay-as-you-go", priceINR: 0.09, priceUSD: 0.0011, billingCycle: "per email", features: "No monthly commitment, credits never expire" }
        ]
      };

      res.json({
        success: true,
        data: {
          summary: {
            totalSpendUSD: totalEstimatedSpendUSD,
            totalSpendINR: totalEstimatedSpendINR,
            totalEstimatedUSD: totalEstimatedSpendUSD,
            totalEstimatedINR: totalEstimatedSpendINR,
            activeChannels: (brevoData.isConnected ? 1 : 0) + (whatsAppData.isConnected ? 1 : 0),
            billingPeriod: `${currentMonthName} 1, ${currentYear} – ${currentMonthName} ${new Date(currentYear, now.getMonth() + 1, 0).getDate()}, ${currentYear}`
          },
          brevo: {
            ...brevoData,
            planCostINR: brevoData.estimatedCostINR,
            planCostUSD: brevoData.estimatedCostUSD
          },
          whatsapp: {
            ...whatsAppData,
            estimatedCostINR: whatsAppData.estimatedChargesINR,
            estimatedCostUSD: whatsAppData.estimatedChargesUSD,
            totalConversations: whatsAppData.totalSent,
            phoneNumber: whatsAppData.displayPhoneNumber
          },
          rates,
          invoices: invoiceHistory
        }
      });
    } catch (error) {
      console.error("Billing usage error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch billing and usage data"
      });
    }
  }
}

module.exports = new BillingController();

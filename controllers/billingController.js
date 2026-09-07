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
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          let emailCampaigns = [];
          if (userId) {
            emailCampaigns = await Campaign.find({
              userId,
              createdAt: { $gte: startOfMonth }
            }).lean().catch(() => []);
          }
          if (emailCampaigns.length === 0) {
            emailCampaigns = await Campaign.find({
              createdAt: { $gte: startOfMonth }
            }).lean().catch(() => []);
          }

          const monthlySent = emailCampaigns.reduce((acc, c) => acc + (c.sentCount || 0), 0);
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

          // Aggregate WhatsApp Campaigns
          let campaigns = [];
          if (userId) {
            campaigns = await WhatsAppCampaign.find({ userId }).lean().catch(() => []);
          }
          if (campaigns.length === 0) {
            campaigns = await WhatsAppCampaign.find({}).lean().catch(() => []);
          }

          let marketingCount = 0;
          let utilityCount = 0;
          let authCount = 0;

          campaigns.forEach(camp => {
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

          // Aggregate 1-on-1 Outbound Chat Messages (Service conversations)
          let serviceMessagesCount = 0;
          if (userId) {
            serviceMessagesCount = await WhatsAppMessage.countDocuments({
              userId,
              direction: 'outbound'
            }).catch(() => 0);
          }
          if (serviceMessagesCount === 0) {
            serviceMessagesCount = await WhatsAppMessage.countDocuments({
              direction: 'outbound'
            }).catch(() => 0);
          }

          whatsAppData.totalSent += serviceMessagesCount;

          // Calculate estimated Meta rate charges
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

      const now = new Date();
      const currentMonthName = now.toLocaleString('default', { month: 'short' });
      const currentYear = now.getFullYear();

      const invoiceHistory = [
        {
          id: `INV-${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`,
          date: `${currentMonthName} 1, ${currentYear}`,
          channel: "Combined (WhatsApp + Brevo)",
          amountUSD: `$${totalEstimatedSpendUSD}`,
          amountINR: `₹${totalEstimatedSpendINR}`,
          status: "Current Cycle",
          whatsappVolume: whatsAppData.totalSent,
          brevoVolume: brevoData.monthlyEmailsSent
        }
      ];

      res.json({
        success: true,
        data: {
          summary: {
            totalSpendUSD: totalEstimatedSpendUSD,
            totalSpendINR: totalEstimatedSpendINR,
            activeChannels: (brevoData.isConnected ? 1 : 0) + (whatsAppData.isConnected ? 1 : 0),
            billingPeriod: `${currentMonthName} 1, ${currentYear} – ${currentMonthName} ${new Date(currentYear, now.getMonth() + 1, 0).getDate()}, ${currentYear}`
          },
          brevo: brevoData,
          whatsapp: whatsAppData,
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

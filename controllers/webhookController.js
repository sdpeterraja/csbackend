// controllers/webhookController.js
const Campaign = require('../models/Campaign');
const CampaignEvent = require('../models/CampaignEvent');
const Subscriber = require('../models/Subscriber');

const handleBrevoWebhook = async (req, res) => {
  try {
    console.log('📨 Webhook received:', JSON.stringify(req.body, null, 2));
    
    const event = req.body;
    const { 
      event: eventType, 
      email, 
      camp_id,
      'message-id': messageId,
      date_event,
      link,
      user_agent,
      device_used,
      subject
    } = event;
    
    // Find campaign by multiple methods
    let campaign = null;
    
    // Method 1: Try to find by brevoCampaignId (numeric - for list campaigns)
    if (camp_id) {
      campaign = await Campaign.findOne({ brevoCampaignId: camp_id });
      if (campaign) console.log(`✅ Found campaign by brevoCampaignId: ${camp_id}`);
    }
    
    // Method 2: Try by brevoMessageId (string - for transactional emails)
    if (!campaign && messageId) {
      campaign = await Campaign.findOne({ brevoMessageId: messageId });
      if (campaign) console.log(`✅ Found campaign by brevoMessageId: ${messageId}`);
    }
    
    // Method 3: Try by recipient's messageId
    if (!campaign && messageId) {
      campaign = await Campaign.findOne({ 'recipients.messageId': messageId });
      if (campaign) console.log(`✅ Found campaign by recipient messageId: ${messageId}`);
    }
    
    // Method 4: Try by subject (most recent sent campaign with matching subject)
    if (!campaign && subject) {
      campaign = await Campaign.findOne({ 
        subject: subject,
        status: 'sent'
      }).sort({ sentAt: -1 });
      if (campaign) console.log(`✅ Found campaign by subject: ${subject}`);
    }
    
    // Method 5: Try by email and recent date (last resort)
    if (!campaign && email) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      campaign = await Campaign.findOne({
        status: 'sent',
        sentAt: { $gte: oneHourAgo },
        $or: [
          { targetEmails: email },
          { 'recipients.email': email }
        ]
      }).sort({ sentAt: -1 });
      if (campaign) console.log(`✅ Found campaign by email: ${email}`);
    }
    
    if (!campaign) {
      console.log(`⚠️ Campaign not found for camp_id: ${camp_id}, messageId: ${messageId}, subject: ${subject}, email: ${email}`);
      return res.status(200).send('OK');
    }
    
    console.log(`📊 Processing event for campaign: ${campaign.name} (${campaign._id})`);
    console.log(`   Event: ${eventType}, Email: ${email}`);
    
    // Map Brevo event types to internal types
    const eventTypeMap = {
      'delivered': 'delivered',
      'opened': 'opened',
      'unique_opened': 'opened',
      'click': 'clicked',
      'hard_bounce': 'bounced',
      'soft_bounce': 'bounced',
      'unsubscribe': 'unsubscribed',
      'spam': 'complained',
      'complaint': 'complained',
      'request': 'sent'
    };
    
    const mappedType = eventTypeMap[eventType];
    if (!mappedType) {
      console.log(`⚠️ Unknown event type: ${eventType}, skipping...`);
      return res.status(200).send('OK');
    }
    
    // Calculate expected sent count
    const expectedSentCount = campaign.recipients?.length || campaign.targetEmails?.length || 0;
    
    // Handle 'sent' events carefully to avoid double counting
    if (mappedType === 'sent') {
      // Check if sentCount is already correct
      if (campaign.statistics.sentCount >= expectedSentCount && expectedSentCount > 0) {
        console.log(`⏭️ Skipping 'sent' event - sentCount already correct (${campaign.statistics.sentCount}/${expectedSentCount})`);
      } else {
        // Update sent count only if needed
        await campaign.updateStatistics(mappedType, email);
        console.log(`✅ Updated sent count from ${campaign.statistics.sentCount - 1} to ${campaign.statistics.sentCount}`);
      }
    } else {
      // For non-sent events (opened, clicked, delivered, etc.), always update
      try {
        await campaign.updateStatistics(mappedType, email);
        console.log(`✅ Updated ${mappedType} count via model method`);
        
        // Fetch fresh campaign data to log current stats
        const freshCampaign = await Campaign.findById(campaign._id);
        console.log(`   Current stats - Delivered: ${freshCampaign.statistics.deliveredCount}, Opens: ${freshCampaign.statistics.uniqueOpens}, Clicks: ${freshCampaign.statistics.uniqueClicks}`);
        console.log(`   Open Rate: ${freshCampaign.statistics.openRate}%, Click Rate: ${freshCampaign.statistics.clickRate}%`);
        
      } catch (statsError) {
        console.error('Failed to update statistics:', statsError.message);
      }
    }
    
    // Store individual event for detailed tracking (skip 'sent' to reduce noise)
    if (mappedType !== 'sent') {
      try {
        await CampaignEvent.create({
          campaignId: campaign._id,
          type: mappedType,
          email: email,
          timestamp: date_event ? new Date(date_event) : new Date(),
          metadata: { 
            link, 
            userAgent: user_agent,
            device: device_used,
            messageId: messageId,
            campId: camp_id,
            rawEvent: event 
          }
        });
        console.log(`✅ Event record created for ${email} - ${mappedType}`);
      } catch (eventError) {
        console.error('Failed to create campaign event:', eventError.message);
      }
    }
    
    // Update subscriber activity (skip 'sent' events)
    if (mappedType !== 'sent') {
      await updateSubscriberActivity(campaign.userId, email, mappedType);
    }
    
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    console.error('Error stack:', error.stack);
    // Always return 200 to prevent Brevo from retrying
    res.status(200).send('OK');
  }
};

// Update subscriber activity
const updateSubscriberActivity = async (userId, email, eventType) => {
  try {
    const updateData = { lastActivity: new Date() };
    const incData = {};
    const setData = {};
    
    switch(eventType) {
      case 'opened':
        incData['statistics.openCount'] = 1;
        setData['statistics.lastOpenAt'] = new Date();
        break;
      case 'clicked':
        incData['statistics.clickCount'] = 1;
        setData['statistics.lastClickAt'] = new Date();
        break;
      case 'bounced':
        setData.status = 'bounced';
        break;
      case 'unsubscribed':
        setData.status = 'unsubscribed';
        setData.unsubscribedAt = new Date();
        break;
      case 'delivered':
        // Just update last activity
        break;
      default:
        // No updates needed
        break;
    }
    
    // Only update if there are changes
    if (Object.keys(incData).length > 0 || Object.keys(setData).length > 0) {
      const result = await Subscriber.findOneAndUpdate(
        { userId, email },
        { 
          $inc: incData, 
          $set: { ...updateData, ...setData },
          $setOnInsert: { subscribedAt: new Date() }
        },
        { upsert: true, new: true }
      );
      console.log(`✅ Subscriber activity updated for ${email} - ${eventType}`);
      return result;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to update subscriber activity:', error.message);
  }
};

// Debug endpoint to test webhook
const testWebhook = async (req, res) => {
  try {
    const testEvent = req.body;
    console.log('🧪 Test webhook received:', testEvent);
    
    res.status(200).json({
      success: true,
      message: 'Test webhook received',
      received: testEvent
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Endpoint to manually fix sentCount for a campaign
const fixSentCount = async (req, res) => {
  try {
    const { id } = req.params;
    
    const campaign = await Campaign.findOne({
      _id: id,
      userId: req.user?.userId
    });
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }
    
    // Calculate actual recipient count
    const actualRecipientCount = campaign.recipients?.length || campaign.targetEmails?.length || 0;
    const oldSentCount = campaign.statistics.sentCount;
    
    if (oldSentCount !== actualRecipientCount) {
      campaign.statistics.sentCount = actualRecipientCount;
      campaign.sentCount = actualRecipientCount;
      await campaign.save();
      
      console.log(`✅ Fixed sentCount for campaign ${campaign.name}: ${oldSentCount} -> ${actualRecipientCount}`);
    }
    
    res.json({
      success: true,
      message: 'Sent count fixed',
      data: {
        oldSentCount: oldSentCount,
        actualRecipientCount: actualRecipientCount,
        currentSentCount: campaign.statistics.sentCount
      }
    });
  } catch (error) {
    console.error('Fix sent count error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Endpoint to get campaign debug info
const debugCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    
    const campaign = await Campaign.findOne({
      _id: id,
      userId: req.user?.userId
    }).select('name status sentCount recipientCount statistics brevoCampaignId brevoMessageId recipients targetEmails');
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }
    
    const actualRecipientCount = campaign.recipients?.length || campaign.targetEmails?.length || 0;
    
    res.json({
      success: true,
      data: {
        name: campaign.name,
        status: campaign.status,
        sentCount: campaign.sentCount,
        actualRecipientCount: actualRecipientCount,
        recipientCount: campaign.recipientCount,
        statistics: campaign.statistics,
        brevoCampaignId: campaign.brevoCampaignId,
        brevoMessageId: campaign.brevoMessageId,
        needsFix: campaign.statistics.sentCount !== actualRecipientCount
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Endpoint to manually update a specific event (for testing)
const simulateEvent = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { eventType, email } = req.body;
    
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userId: req.user?.userId
    });
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }
    
    // Map event type
    const eventTypeMap = {
      'delivered': 'delivered',
      'opened': 'opened',
      'clicked': 'clicked',
      'bounced': 'bounced'
    };
    
    const mappedType = eventTypeMap[eventType];
    if (!mappedType) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event type'
      });
    }
    
    // Update statistics
    await campaign.updateStatistics(mappedType, email);
    
    res.json({
      success: true,
      message: `Event ${eventType} simulated for ${email}`,
      data: campaign.statistics
    });
  } catch (error) {
    console.error('Simulate event error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { 
  handleBrevoWebhook,
  testWebhook,
  fixSentCount,
  debugCampaign,
  simulateEvent
};
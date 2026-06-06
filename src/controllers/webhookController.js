// controllers/webhookController.js
const Campaign = require('../models/Campaign');
const CampaignEvent = require('../models/CampaignEvent');
const Subscriber = require('../models/Subscriber');

class WebhookController {
  async handleBrevoWebhook(req, res) {
    try {
      const event = req.body;
      
      const { event: eventType, email, campaign_id, message_id, timestamp, tag, id } = event;
      
      // Find campaign by Brevo campaign ID or message ID
      let campaign = null;
      if (campaign_id) {
        campaign = await Campaign.findOne({ brevoCampaignId: parseInt(campaign_id) });
      }
      if (!campaign && message_id) {
        campaign = await Campaign.findOne({ brevoMessageId: message_id });
      }
      
      if (!campaign) {
        console.log(`Campaign not found for event: ${eventType}`);
        return res.status(200).send('OK');
      }
      
      // Map Brevo event to our event type
      const eventTypeMap = {
        'delivered': 'delivered',
        'opened': 'opened',
        'clicked': 'clicked',
        'bounced': 'bounced',
        'complained': 'complained',
        'unsubscribed': 'unsubscribed',
        'hard_bounce': 'bounced',
        'soft_bounce': 'bounced',
        'spam': 'complained'
      };
      
      const mappedEvent = eventTypeMap[eventType];
      if (!mappedEvent) {
        return res.status(200).send('OK');
      }
      
      // Update campaign statistics
      const updateField = {};
      switch (mappedEvent) {
        case 'delivered':
          updateField['statistics.deliveredCount'] = 1;
          break;
        case 'opened':
          updateField['statistics.openCount'] = 1;
          updateField['statistics.uniqueOpens'] = 1;
          break;
        case 'clicked':
          updateField['statistics.clickCount'] = 1;
          updateField['statistics.uniqueClicks'] = 1;
          break;
        case 'bounced':
          updateField['statistics.bounceCount'] = 1;
          break;
        case 'complained':
          updateField['statistics.complaintCount'] = 1;
          break;
      }
      
      if (Object.keys(updateField).length > 0) {
        await Campaign.findByIdAndUpdate(campaign._id, {
          $inc: updateField
        });
        
        // Recalculate rates
        await this.recalculateRates(campaign._id);
      }
      
      // Update subscriber activity
      if (email && mappedEvent !== 'sent') {
        await Subscriber.findOneAndUpdate(
          { email, userId: campaign.userId },
          {
            $inc: {
              'statistics.openCount': mappedEvent === 'opened' ? 1 : 0,
              'statistics.clickCount': mappedEvent === 'clicked' ? 1 : 0,
              'statistics.bounceCount': mappedEvent === 'bounced' ? 1 : 0,
              'statistics.complaintCount': mappedEvent === 'complained' ? 1 : 0
            },
            $set: {
              'statistics.lastOpenAt': mappedEvent === 'opened' ? new Date() : undefined,
              'statistics.lastClickAt': mappedEvent === 'clicked' ? new Date() : undefined,
              lastActivity: new Date(),
              status: mappedEvent === 'unsubscribed' ? 'unsubscribed' : 
                      mappedEvent === 'bounced' ? 'bounced' :
                      mappedEvent === 'complained' ? 'complained' : 'subscribed'
            }
          },
          { upsert: true }
        );
      }
      
      // Store event
      const eventData = {
        campaignId: campaign._id,
        type: mappedEvent,
        email: email,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        metadata: {
          rawEvent: event,
          linkUrl: event.link || event.url
        }
      };
      
      // Add subscriberId if found
      if (email) {
        const subscriber = await Subscriber.findOne({ email, userId: campaign.userId });
        if (subscriber) {
          eventData.subscriberId = subscriber._id;
        }
      }
      
      await CampaignEvent.create(eventData);
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(200).send('OK'); // Always return 200 to Brevo
    }
  }
  
  async recalculateRates(campaignId) {
    const campaign = await Campaign.findById(campaignId);
    
    if (campaign && campaign.statistics.deliveredCount > 0) {
      const openRate = (campaign.statistics.uniqueOpens / campaign.statistics.deliveredCount) * 100;
      const clickRate = (campaign.statistics.uniqueClicks / campaign.statistics.deliveredCount) * 100;
      const bounceRate = (campaign.statistics.bounceCount / campaign.statistics.sentCount) * 100;
      
      await Campaign.findByIdAndUpdate(campaignId, {
        'statistics.openRate': Math.round(openRate * 100) / 100,
        'statistics.clickRate': Math.round(clickRate * 100) / 100,
        'statistics.bounceRate': Math.round(bounceRate * 100) / 100
      });
    }
  }
}

module.exports = new WebhookController();
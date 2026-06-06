// controllers/campaignController.js
const Campaign = require('../models/Campaign');
const Template = require('../models/Template');
const BrevoConfig = require('../models/BrevoConfig');
const CampaignEvent = require('../models/CampaignEvent');
const Subscriber = require('../models/Subscriber');
const BrevoService = require('../services/brevoService');
const mongoose = require('mongoose');

class CampaignController {
  // Get all campaigns
  async getCampaigns(req, res) {
    try {
      const { status, type, page = 1, limit = 10, search } = req.query;
      const query = { userId: req.user.userId };
      
      if (status) query.status = status;
      if (type) query.type = type;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { subject: { $regex: search, $options: 'i' } }
        ];
      }
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [campaigns, total] = await Promise.all([
        Campaign.find(query)
          .populate('templateId', 'name previewImage')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Campaign.countDocuments(query)
      ]);
      
      res.json({
        success: true,
        data: campaigns,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get campaigns error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch campaigns'
      });
    }
  }
  
  // Get single campaign
  async getCampaign(req, res) {
    try {
      const { id } = req.params;
      
      const campaign = await Campaign.findOne({
        _id: id,
        userId: req.user.userId
      }).populate('templateId');
      
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }
      
      // Get recent events
      const recentEvents = await CampaignEvent.find({ campaignId: id })
        .sort({ timestamp: -1 })
        .limit(50);
      
      res.json({
        success: true,
        data: { campaign, recentEvents }
      });
    } catch (error) {
      console.error('Get campaign error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch campaign'
      });
    }
  }
  
  // Create campaign
  async createCampaign(req, res) {
    try {
      const {
        name,
        subject,
        templateId,
        content,
        type,
        audienceList,
        segments,
        targetEmails,
        scheduledFor,
        settings,
        automation
      } = req.body;
      
      // Validate required fields
      if (!name || !subject) {
        return res.status(400).json({
          success: false,
          message: 'Name and subject are required'
        });
      }
      
      // Check Brevo connection
      const brevoConfig = await BrevoConfig.findOne({ userId: req.user.userId });
      if (!brevoConfig || !brevoConfig.isConnected) {
        return res.status(400).json({
          success: false,
          message: 'Please connect your Brevo account first'
        });
      }
      
      const campaignData = {
        userId: req.user.userId,
        name,
        subject,
        templateId: templateId || null,
        content: content || null,
        type: type || 'regular',
        audienceList,
        segments,
        targetEmails: targetEmails || [],
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        settings: settings || {},
        automation: automation || {},
        status: scheduledFor ? 'scheduled' : 'draft'
      };
      
      const campaign = await Campaign.create(campaignData);
      
      // If scheduled, add to job queue (implement with Bull or similar)
      if (scheduledFor) {
        await this.scheduleCampaign(campaign._id, new Date(scheduledFor));
      }
      
      res.status(201).json({
        success: true,
        data: campaign
      });
    } catch (error) {
      console.error('Create campaign error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create campaign'
      });
    }
  }
  
  // Update campaign
  async updateCampaign(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const campaign = await Campaign.findOne({
        _id: id,
        userId: req.user.userId
      });
      
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }
      
      if (campaign.status === 'sent') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update a sent campaign'
        });
      }
      
      // Don't allow updating certain fields
      delete updateData.statistics;
      delete updateData.brevoCampaignId;
      delete updateData.brevoMessageId;
      delete updateData.sentAt;
      
      if (updateData.scheduledFor) {
        updateData.scheduledFor = new Date(updateData.scheduledFor);
        updateData.status = 'scheduled';
      }
      
      Object.assign(campaign, updateData);
      campaign.updatedAt = new Date();
      await campaign.save();
      
      res.json({
        success: true,
        data: campaign
      });
    } catch (error) {
      console.error('Update campaign error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update campaign'
      });
    }
  }
  
  // Send campaign
  async sendCampaign(req, res) {
    try {
      const { id } = req.params;
      
      const campaign = await Campaign.findOne({
        _id: id,
        userId: req.user.userId
      }).populate('templateId');
      
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }
      
      if (campaign.status === 'sent') {
        return res.status(400).json({
          success: false,
          message: 'Campaign already sent'
        });
      }
      
      const brevoConfig = await BrevoConfig.findOne({ userId: req.user.userId });
      if (!brevoConfig || !brevoConfig.isConnected) {
        return res.status(400).json({
          success: false,
          message: 'Brevo account not connected'
        });
      }
      
      // Update status to sending
      campaign.status = 'sending';
      await campaign.save();
      
      // Send via Brevo
      const result = await BrevoService.sendCampaign(campaign, brevoConfig);
      
      // Update campaign with results
      campaign.status = 'sent';
      campaign.sentAt = new Date();
      campaign.brevoCampaignId = result.campaignId;
      campaign.brevoMessageId = result.messageId;
      campaign.statistics.totalRecipients = result.recipients;
      await campaign.save();
      
      // Log event
      await CampaignEvent.create({
        campaignId: campaign._id,
        type: 'sent',
        metadata: { recipients: result.recipients }
      });
      
      res.json({
        success: true,
        data: campaign,
        message: 'Campaign sent successfully'
      });
    } catch (error) {
      console.error('Send campaign error:', error);
      
      await Campaign.findByIdAndUpdate(req.params.id, {
        status: 'failed'
      });
      
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to send campaign'
      });
    }
  }
  
  // Send test email
  async sendTestEmail(req, res) {
    try {
      const { id } = req.params;
      const { testEmails } = req.body;
      
      if (!testEmails || testEmails.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one test email is required'
        });
      }
      
      const campaign = await Campaign.findOne({
        _id: id,
        userId: req.user.userId
      }).populate('templateId');
      
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }
      
      const brevoConfig = await BrevoConfig.findOne({ userId: req.user.userId });
      if (!brevoConfig || !brevoConfig.isConnected) {
        return res.status(400).json({
          success: false,
          message: 'Brevo account not connected'
        });
      }
      
      const results = await BrevoService.sendTestEmail(campaign, brevoConfig, testEmails);
      
      res.json({
        success: true,
        data: results,
        message: 'Test emails sent successfully'
      });
    } catch (error) {
      console.error('Send test error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test emails'
      });
    }
  }
  
  // Get campaign statistics
  async getCampaignStats(req, res) {
    try {
      const { id } = req.params;
      
      const campaign = await Campaign.findOne({
        _id: id,
        userId: req.user.userId
      });
      
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }
      
      // Get event timeline
      const timeline = await CampaignEvent.getTimeline(id, 72);
      
      // Get top performing links (for click events)
      const topLinks = await CampaignEvent.aggregate([
        {
          $match: {
            campaignId: new mongoose.Types.ObjectId(id),
            type: 'clicked',
            'metadata.linkUrl': { $exists: true }
          }
        },
        {
          $group: {
            _id: '$metadata.linkUrl',
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: '$email' }
          }
        },
        {
          $project: {
            url: '$_id',
            clicks: '$count',
            uniqueClicks: { $size: '$uniqueUsers' },
            _id: 0
          }
        },
        { $sort: { clicks: -1 } },
        { $limit: 10 }
      ]);
      
      const stats = {
        summary: campaign.statistics,
        timeline,
        topLinks,
        performance: campaign.performance
      };
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics'
      });
    }
  }
  
  // Duplicate campaign
  async duplicateCampaign(req, res) {
    try {
      const { id } = req.params;
      
      const original = await Campaign.findOne({
        _id: id,
        userId: req.user.userId
      });
      
      if (!original) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }
      
      const campaignData = original.toObject();
      delete campaignData._id;
      delete campaignData.createdAt;
      delete campaignData.updatedAt;
      delete campaignData.statistics;
      delete campaignData.brevoCampaignId;
      delete campaignData.brevoMessageId;
      delete campaignData.sentAt;
      
      campaignData.name = `${original.name} (Copy)`;
      campaignData.status = 'draft';
      
      const duplicated = await Campaign.create(campaignData);
      
      res.status(201).json({
        success: true,
        data: duplicated
      });
    } catch (error) {
      console.error('Duplicate campaign error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to duplicate campaign'
      });
    }
  }
  
  // Delete campaign
  async deleteCampaign(req, res) {
    try {
      const { id } = req.params;
      
      const campaign = await Campaign.findOne({
        _id: id,
        userId: req.user.userId
      });
      
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }
      
      if (campaign.status === 'sending') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete a campaign while it is being sent'
        });
      }
      
      // Delete associated events
      await CampaignEvent.deleteMany({ campaignId: id });
      
      // Delete campaign
      await campaign.deleteOne();
      
      res.json({
        success: true,
        message: 'Campaign deleted successfully'
      });
    } catch (error) {
      console.error('Delete campaign error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete campaign'
      });
    }
  }
  
  // Schedule campaign helper
  async scheduleCampaign(campaignId, scheduledTime) {
    // This is a placeholder - implement with a job queue like Bull
    console.log(`Campaign ${campaignId} scheduled for ${scheduledTime}`);
    // You would add to Redis queue here
  }
}

module.exports = new CampaignController();
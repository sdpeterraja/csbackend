// services/brevoTemplateService.js
const SibApiV3Sdk = require('sib-api-v3-sdk');

class BrevoTemplateService {
  constructor(apiKey) {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKeyAuth = defaultClient.authentications['api-key'];
    apiKeyAuth.apiKey = apiKey;
    
    this.transactionalApi = new SibApiV3Sdk.TransactionalEmailsApi();
    this.campaignApi = new SibApiV3Sdk.EmailCampaignsApi();
  }

  // ============ TRANSACTIONAL TEMPLATES (SMTP) ============

  // Get all transactional templates
  async getSmtpTemplates(templateStatus = true, page = 1, limit = 50) {
    try {
      const response = await this.transactionalApi.getSmtpTemplates(templateStatus, page, limit);
      return {
        success: true,
        data: response.body.templates,
        count: response.body.count
      };
    } catch (error) {
      console.error('Get SMTP templates error:', error);
      throw error;
    }
  }

  // Get single transactional template by ID
  async getSmtpTemplate(templateId) {
    try {
      const response = await this.transactionalApi.getSmtpTemplate(templateId);
      return {
        success: true,
        data: response.body
      };
    } catch (error) {
      console.error('Get SMTP template error:', error);
      throw error;
    }
  }

  // Create transactional template
  async createSmtpTemplate(templateData) {
    try {
      const createTemplate = new SibApiV3Sdk.CreateSmtpTemplate();
      createTemplate.templateName = templateData.templateName;
      createTemplate.subject = templateData.subject;
      createTemplate.htmlContent = templateData.htmlContent;
      createTemplate.sender = templateData.sender || {};
      createTemplate.isActive = templateData.isActive !== false;
      
      const response = await this.transactionalApi.createSmtpTemplate(createTemplate);
      return {
        success: true,
        data: response.body,
        templateId: response.body.id
      };
    } catch (error) {
      console.error('Create SMTP template error:', error);
      throw error;
    }
  }

  // Update transactional template
  async updateSmtpTemplate(templateId, updateData) {
    try {
      const updateTemplate = new SibApiV3Sdk.UpdateSmtpTemplate();
      if (updateData.templateName) updateTemplate.templateName = updateData.templateName;
      if (updateData.subject) updateTemplate.subject = updateData.subject;
      if (updateData.htmlContent) updateTemplate.htmlContent = updateData.htmlContent;
      if (updateData.sender) updateTemplate.sender = updateData.sender;
      if (updateData.isActive !== undefined) updateTemplate.isActive = updateData.isActive;
      
      const response = await this.transactionalApi.updateSmtpTemplate(templateId, updateTemplate);
      return {
        success: true,
        message: 'Template updated successfully'
      };
    } catch (error) {
      console.error('Update SMTP template error:', error);
      throw error;
    }
  }

  // Delete transactional template
  async deleteSmtpTemplate(templateId) {
    try {
      await this.transactionalApi.deleteSmtpTemplate(templateId);
      return {
        success: true,
        message: 'Template deleted successfully'
      };
    } catch (error) {
      console.error('Delete SMTP template error:', error);
      throw error;
    }
  }

  // Send test email for transactional template
  async sendTestSmtpTemplate(templateId, testEmails) {
    try {
      const testData = {
        to: testEmails.map(email => ({ email })),
        body: {}
      };
      const response = await this.transactionalApi.sendTestTemplate(templateId, testData);
      return {
        success: true,
        message: 'Test email sent successfully'
      };
    } catch (error) {
      console.error('Send test template error:', error);
      throw error;
    }
  }

  // Preview transactional template
  async previewSmtpTemplate(templateId, previewData = {}) {
    try {
      const response = await this.transactionalApi.postPreviewSmtpEmailTemplates({
        templateId,
        ...previewData
      });
      return {
        success: true,
        data: response.body
      };
    } catch (error) {
      console.error('Preview template error:', error);
      throw error;
    }
  }

  // ============ CAMPAIGN TEMPLATES (Marketing) ============

  // Get all campaign templates
  async getCampaignTemplates(page = 1, limit = 50) {
    try {
      const response = await this.campaignApi.getEmailCampaigns(page, limit, null, null, null, null, null, 'template');
      return {
        success: true,
        data: response.body.campaigns,
        count: response.body.count
      };
    } catch (error) {
      console.error('Get campaign templates error:', error);
      throw error;
    }
  }

  // Create campaign template
  async createCampaignTemplate(templateData) {
    try {
      const emailCampaign = new SibApiV3Sdk.CreateEmailCampaign();
      emailCampaign.name = templateData.name;
      emailCampaign.subject = templateData.subject;
      emailCampaign.htmlContent = templateData.htmlContent;
      emailCampaign.sender = templateData.sender;
      
      if (templateData.listIds) {
        emailCampaign.recipients = { listIds: templateData.listIds };
      }
      
      const response = await this.campaignApi.createEmailCampaign(emailCampaign);
      return {
        success: true,
        data: response.body,
        campaignId: response.body.id
      };
    } catch (error) {
      console.error('Create campaign template error:', error);
      throw error;
    }
  }

  // Update campaign template
  async updateCampaignTemplate(campaignId, updateData) {
    try {
      const updateCampaign = new SibApiV3Sdk.UpdateEmailCampaign();
      if (updateData.name) updateCampaign.name = updateData.name;
      if (updateData.subject) updateCampaign.subject = updateData.subject;
      if (updateData.htmlContent) updateCampaign.htmlContent = updateData.htmlContent;
      if (updateData.sender) updateCampaign.sender = updateData.sender;
      
      const response = await this.campaignApi.updateEmailCampaign(campaignId, updateCampaign);
      return {
        success: true,
        message: 'Campaign updated successfully'
      };
    } catch (error) {
      console.error('Update campaign template error:', error);
      throw error;
    }
  }

  // Delete campaign template
  async deleteCampaignTemplate(campaignId) {
    try {
      await this.campaignApi.deleteEmailCampaign(campaignId);
      return {
        success: true,
        message: 'Campaign deleted successfully'
      };
    } catch (error) {
      console.error('Delete campaign template error:', error);
      throw error;
    }
  }
}

module.exports = BrevoTemplateService;
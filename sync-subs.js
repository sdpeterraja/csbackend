require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const campaigns = await mongoose.connection.collection('campaigns').find({status: 'sent'}).sort({_id:-1}).limit(10).toArray();
  for (const campaign of campaigns) {
    if (campaign.recipients && campaign.recipients.length > 0) {
      const bulkOps = campaign.recipients.map(r => ({
        updateOne: {
          filter: { userId: campaign.userId, email: r.email.toLowerCase() },
          update: { 
            $setOnInsert: { 
              name: r.name || '', 
              status: 'subscribed', 
              lists: ['Campaign Added'] 
            } 
          },
          upsert: true
        }
      }));
      try {
        await mongoose.connection.collection('subscribers').bulkWrite(bulkOps, {ordered: false});
        console.log('Synced', campaign.recipients.length, 'contacts for campaign', campaign._id);
      } catch(e) {
        console.log('Error:', e.message);
      }
    }
  }
  mongoose.disconnect();
});

const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const configs = await mongoose.connection.db.collection('whatsappconfigs').find({}).toArray();
  const config = configs.find(c => c.accessToken && c.accessToken.length > 10);
  const token = config.accessToken;
  const res = await fetch(`https://graph.facebook.com/v20.0/debug_token?input_token=${token}&access_token=${token}`);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
});

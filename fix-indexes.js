require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const col = mongoose.connection.collection('subscribers');
  try { await col.dropIndex('userId_1_email_1'); } catch(e){}
  try { await col.dropIndex('userId_1_phone_1'); } catch(e){}
  await col.createIndex({userId: 1, email: 1}, {unique: true, partialFilterExpression: { email: { $type: 'string' } }});
  await col.createIndex({userId: 1, phone: 1}, {unique: true, partialFilterExpression: { phone: { $type: 'string' } }});
  console.log('Fixed indexes');
  mongoose.disconnect();
});

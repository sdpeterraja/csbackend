const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { r2 } = require('../utils/r2Client');

const R2_PUBLIC_BASE_URL = "https://pub-6f4d77c393db4338aa185e08795dcb35.r2.dev";

exports.uploadBase64Image = async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ success: false, message: 'No image data provided' });
    }

    // Check if it's a valid base64 image string (data:image/png;base64,...)
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, message: 'Invalid base64 image data' });
    }

    const type = matches[1];
    const base64Data = matches[2];
    
    // Determine extension
    let ext = 'png';
    if (type.includes('jpeg') || type.includes('jpg')) ext = 'jpg';
    if (type.includes('gif')) ext = 'gif';
    if (type.includes('webp')) ext = 'webp';

    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `${crypto.randomUUID()}.${ext}`;
    
    const key = `templates/${filename}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || 'shopify-sender-pro-images',
        Key: key,
        Body: buffer,
        ContentType: type,
      })
    );

    const imageUrl = `${R2_PUBLIC_BASE_URL}/${key}`;

    res.status(200).json({
      success: true,
      imageUrl,
      filename
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during upload' });
  }
};

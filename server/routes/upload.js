const express = require('express');
const router = express.Router();
const { uploadDocument, uploadImage, uploadFile, cloudinary, uploadToCloudinary } = require('../config/cloudinary');
const authenticateToken = require('../middleware/auth');

// Upload single image (profile picture, portfolio)
router.post('/upload/image', authenticateToken, uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const result = await uploadToCloudinary(req.file.buffer, 'images', 'image');

    res.json({
      success: true,
      file: {
        url: result.secure_url,
        publicId: result.public_id,
        size: result.bytes,
        format: result.format,
        width: result.width,
        height: result.height
      }
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Image upload failed', details: error.message });
  }
});

// Upload multiple images
router.post('/upload/images', authenticateToken, uploadImage.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const uploadPromises = req.files.map(file => uploadToCloudinary(file.buffer, 'images', 'image'));
    const results = await Promise.all(uploadPromises);

    const files = results.map(result => ({
      url: result.secure_url,
      publicId: result.public_id,
      size: result.bytes,
      format: result.format
    }));

    res.json({
      success: true,
      files: files
    });
  } catch (error) {
    console.error('Images upload error:', error);
    res.status(500).json({ error: 'Images upload failed', details: error.message });
  }
});

// Upload document (PDF, DOC, etc.)
router.post('/upload/document', authenticateToken, uploadDocument.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document file provided' });
    }

    const result = await uploadToCloudinary(req.file.buffer, 'documents', 'raw');

    res.json({
      success: true,
      file: {
        url: result.secure_url,
        publicId: result.public_id,
        size: result.bytes,
        format: result.format,
        originalName: req.file.originalname
      }
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Document upload failed', details: error.message });
  }
});

// Upload general file
router.post('/upload/file', authenticateToken, uploadFile.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const resourceType = req.file.mimetype.startsWith('image/') ? 'image' : 'raw';
    const result = await uploadToCloudinary(req.file.buffer, 'files', resourceType);

    res.json({
      success: true,
      file: {
        url: result.secure_url,
        publicId: result.public_id,
        size: result.bytes,
        format: result.format,
        originalName: req.file.originalname
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed', details: error.message });
  }
});

// Delete file from Cloudinary
router.delete('/delete/:publicId', authenticateToken, async (req, res) => {
  try {
    const { publicId } = req.params;
    
    // Replace URL encoding
    const decodedPublicId = decodeURIComponent(publicId);
    
    const result = await cloudinary.uploader.destroy(decodedPublicId);
    
    if (result.result === 'ok') {
      res.json({ success: true, message: 'File deleted successfully' });
    } else {
      res.status(404).json({ error: 'File not found or already deleted' });
    }
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ error: 'File deletion failed', details: error.message });
  }
});

// Get file info
router.get('/file-info/:publicId', authenticateToken, async (req, res) => {
  try {
    const { publicId } = req.params;
    const decodedPublicId = decodeURIComponent(publicId);
    
    const result = await cloudinary.api.resource(decodedPublicId);
    
    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes,
      width: result.width,
      height: result.height,
      createdAt: result.created_at
    });
  } catch (error) {
    console.error('File info error:', error);
    res.status(404).json({ error: 'File not found', details: error.message });
  }
});

module.exports = router;

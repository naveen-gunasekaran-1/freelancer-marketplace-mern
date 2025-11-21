const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { fileTypeFromBuffer } = require('file-type');
const logger = require('../utils/logger');

// Create uploads directory if it doesn't exist
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 5 // Maximum 5 files per request
  }
});

// Image processing middleware
const processImage = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    const processedFiles = [];

    for (const file of req.files) {
      // Check file type using file-type library for additional security
      const fileType = await fileTypeFromBuffer(file.buffer);
      
      if (!fileType) {
        throw new Error('Unable to determine file type');
      }

      // Validate file type
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/zip',
        'application/x-rar-compressed'
      ];

      if (!allowedMimeTypes.includes(fileType.mime)) {
        throw new Error(`File type ${fileType.mime} is not allowed`);
      }

      let processedFile = {
        originalName: file.originalname,
        mimeType: fileType.mime,
        size: file.buffer.length,
        uploadedAt: new Date()
      };

      // Process images
      if (fileType.mime.startsWith('image/')) {
        try {
          // Generate unique filename
          const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileType.ext}`;
          const filepath = path.join(uploadsDir, filename);

          // Process image with Sharp
          const imageBuffer = await sharp(file.buffer)
            .resize(1200, 1200, { 
              fit: 'inside',
              withoutEnlargement: true 
            })
            .jpeg({ quality: 85 })
            .toBuffer();

          // Save processed image
          fs.writeFileSync(filepath, imageBuffer);

          processedFile.filename = filename;
          processedFile.filepath = filepath;
          processedFile.url = `/uploads/${filename}`;
          processedFile.processedSize = imageBuffer.length;

          logger.info('Image processed successfully', {
            originalName: file.originalname,
            originalSize: file.buffer.length,
            processedSize: imageBuffer.length,
            filename: filename
          });

        } catch (imageError) {
          logger.error('Image processing failed', {
            error: imageError.message,
            filename: file.originalname
          });
          throw new Error('Failed to process image');
        }
      } else {
        // Handle non-image files
        const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileType.ext}`;
        const filepath = path.join(uploadsDir, filename);

        fs.writeFileSync(filepath, file.buffer);

        processedFile.filename = filename;
        processedFile.filepath = filepath;
        processedFile.url = `/uploads/${filename}`;

        logger.info('File uploaded successfully', {
          originalName: file.originalname,
          size: file.buffer.length,
          filename: filename
        });
      }

      processedFiles.push(processedFile);
    }

    req.processedFiles = processedFiles;
    next();

  } catch (error) {
    logger.error('File processing error', {
      error: error.message,
      stack: error.stack
    });
    res.status(400).json({ error: error.message });
  }
};

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected field' });
    }
  }
  
  if (error.message.includes('File type')) {
    return res.status(400).json({ error: error.message });
  }
  
  next(error);
};

// Cleanup function to remove files
const cleanupFiles = (files) => {
  if (!files || files.length === 0) return;

  files.forEach(file => {
    if (file.filepath && fs.existsSync(file.filepath)) {
      try {
        fs.unlinkSync(file.filepath);
        logger.info('File cleaned up', { filename: file.filename });
      } catch (error) {
        logger.error('File cleanup failed', {
          error: error.message,
          filename: file.filename
        });
      }
    }
  });
};

// Middleware to serve uploaded files
const serveUploadedFiles = (req, res, next) => {
  const filename = req.params.filename;
  const filepath = path.join(uploadsDir, filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Security check - prevent directory traversal
  const resolvedPath = path.resolve(filepath);
  const resolvedUploadsDir = path.resolve(uploadsDir);
  
  if (!resolvedPath.startsWith(resolvedUploadsDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.sendFile(resolvedPath);
};

module.exports = {
  upload,
  processImage,
  handleUploadError,
  cleanupFiles,
  serveUploadedFiles
};

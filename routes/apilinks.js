const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const ApiLink = require('../models/ApiLink');
const User = require('../models/User');

/**
 * @swagger
 * components:
 *   schemas:
 *     ApiLink:
 *       type: object
 *       required:
 *         - matchId
 *         - type
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated API link ID
 *         userId:
 *           type: string
 *           description: User who created the link
 *         linkId:
 *           type: string
 *           description: Random unique link identifier
 *         matchId:
 *           type: string
 *           description: Match ID for the data
 *         type:
 *           type: string
 *           enum: [full, alive_status, points_table]
 *           description: Type of data to expose
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Whether the link is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *         lastAccessed:
 *           type: string
 *           format: date-time
 *         accessCount:
 *           type: number
 *           default: 0
 *           description: Number of times accessed
 *     ApiLinkCreate:
 *       type: object
 *       required:
 *         - matchId
 *         - type
 *       properties:
 *         matchId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [full, alive_status, points_table]
 */

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    req.userId = decoded.userId;
    next();
  });
};

/**
 * @swagger
 * /api/apilinks:
 *   post:
 *     summary: Create new API link
 *     description: Create a new random API link for specific match data
 *     tags: [ApiLinks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiLinkCreate'
 *           example:
 *             matchId: "cb5ffa72-03d2-4d9a-9549-d65ad20a1797"
 *             type: "full"
 *     responses:
 *       201:
 *         description: API link created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ApiLink'
 *                 publicUrl:
 *                   type: string
 *                   description: Public URL for accessing the data
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// POST /api/apilinks - Create new API link
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { matchId, type } = req.body;

    // Validate required fields
    if (!matchId || !type) {
      return res.status(400).json({
        success: false,
        error: 'Match ID and type are required'
      });
    }

    // Validate type
    if (!['full', 'alive_status', 'points_table'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid type. Use: full, alive_status, or points_table'
      });
    }

    // Generate unique link ID
    let linkId;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      linkId = ApiLink.generateLinkId();
      const existingLink = await ApiLink.findOne({ linkId });
      if (!existingLink) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate unique link ID'
      });
    }

    // Create new API link (trim matchId to remove whitespace)
    const apiLink = await ApiLink.create({
      userId: req.userId,
      linkId,
      matchId: matchId.trim(),
      type
    });

    // Get the public URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const publicUrl = `${baseUrl}/api/public/${linkId}`;

    res.status(201).json({
      success: true,
      data: apiLink,
      publicUrl
    });

  } catch (error) {
    console.error('Error creating API link:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

/**
 * @swagger
 * /api/apilinks:
 *   get:
 *     summary: Get user's API links
 *     description: Get all API links created by the authenticated user
 *     tags: [ApiLinks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of API links
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ApiLink'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// GET /api/apilinks - Get user's API links
router.get('/', authenticateToken, async (req, res) => {
  try {
    const apiLinks = await ApiLink.find({ userId: req.userId })
      .sort({ createdAt: -1 });

    // Add public URLs to each link
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const linksWithUrls = apiLinks.map(link => ({
      ...link.toObject(),
      publicUrl: `${baseUrl}/api/public/${link.linkId}`
    }));

    res.json({
      success: true,
      count: linksWithUrls.length,
      data: linksWithUrls
    });

  } catch (error) {
    console.error('Error fetching API links:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

/**
 * @swagger
 * /api/apilinks/{linkId}:
 *   delete:
 *     summary: Delete API link
 *     description: Delete a specific API link (only by the creator)
 *     tags: [ApiLinks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: linkId
 *         required: true
 *         schema:
 *           type: string
 *         description: Link ID to delete
 *     responses:
 *       200:
 *         description: API link deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Link not found
 *       500:
 *         description: Server error
 */
// DELETE /api/apilinks/:linkId - Delete API link
router.delete('/:linkId', authenticateToken, async (req, res) => {
  try {
    const { linkId } = req.params;

    const apiLink = await ApiLink.findOne({ 
      linkId, 
      userId: req.userId 
    });

    if (!apiLink) {
      return res.status(404).json({
        success: false,
        error: 'API link not found'
      });
    }

    await ApiLink.findByIdAndDelete(apiLink._id);

    res.json({
      success: true,
      message: 'API link deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting API link:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

/**
 * @swagger
 * /api/apilinks/{linkId}/update:
 *   patch:
 *     summary: Update API link
 *     description: Update matchId and type for an existing API link
 *     tags: [ApiLinks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: linkId
 *         required: true
 *         schema:
 *           type: string
 *         description: Link ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               matchId:
 *                 type: string
 *                 description: New match ID
 *               type:
 *                 type: string
 *                 enum: [full, alive_status, points_table]
 *                 description: New data type
 *           example:
 *             matchId: "new-match-id-here"
 *             type: "alive_status"
 *     responses:
 *       200:
 *         description: API link updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Link not found
 *       500:
 *         description: Server error
 */
// PATCH /api/apilinks/:linkId/update - Update API link
router.patch('/:linkId/update', authenticateToken, async (req, res) => {
  try {
    const { linkId } = req.params;
    const { matchId, type } = req.body;

    // Validate required fields
    if (!matchId || !type) {
      return res.status(400).json({
        success: false,
        error: 'Match ID and type are required'
      });
    }

    // Validate type
    if (!['full', 'alive_status', 'points_table'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid type. Use: full, alive_status, or points_table'
      });
    }

    const apiLink = await ApiLink.findOne({ 
      linkId, 
      userId: req.userId 
    });

    if (!apiLink) {
      return res.status(404).json({
        success: false,
        error: 'API link not found'
      });
    }

    // Update the link (trim matchId to remove whitespace)
    apiLink.matchId = matchId.trim();
    apiLink.type = type;
    await apiLink.save();

    // Get the public URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const publicUrl = `${baseUrl}/api/public/${linkId}`;

    res.json({
      success: true,
      data: apiLink,
      publicUrl,
      message: 'API link updated successfully'
    });

  } catch (error) {
    console.error('Error updating API link:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

/**
 * @swagger
 * /api/apilinks/{linkId}/toggle:
 *   patch:
 *     summary: Toggle API link status
 *     description: Enable or disable an API link
 *     tags: [ApiLinks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: linkId
 *         required: true
 *         schema:
 *           type: string
 *         description: Link ID to toggle
 *     responses:
 *       200:
 *         description: API link status updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Link not found
 *       500:
 *         description: Server error
 */
// PATCH /api/apilinks/:linkId/toggle - Toggle API link status
router.patch('/:linkId/toggle', authenticateToken, async (req, res) => {
  try {
    const { linkId } = req.params;

    const apiLink = await ApiLink.findOne({ 
      linkId, 
      userId: req.userId 
    });

    if (!apiLink) {
      return res.status(404).json({
        success: false,
        error: 'API link not found'
      });
    }

    apiLink.isActive = !apiLink.isActive;
    await apiLink.save();

    res.json({
      success: true,
      data: apiLink,
      message: `API link ${apiLink.isActive ? 'enabled' : 'disabled'} successfully`
    });

  } catch (error) {
    console.error('Error toggling API link:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

/**
 * @swagger
 * /api/apilinks/{linkId}/status:
 *   patch:
 *     summary: Set API link status
 *     description: Explicitly enable or disable an API link
 *     tags: [ApiLinks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: linkId
 *         required: true
 *         schema:
 *           type: string
 *         description: Link ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: Set to true to enable, false to disable
 *           example:
 *             isActive: false
 *     responses:
 *       200:
 *         description: API link status updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Link not found
 *       500:
 *         description: Server error
 */
// PATCH /api/apilinks/:linkId/status - Set API link status explicitly
router.patch('/:linkId/status', authenticateToken, async (req, res) => {
  try {
    const { linkId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isActive must be a boolean value'
      });
    }

    const apiLink = await ApiLink.findOne({ 
      linkId, 
      userId: req.userId 
    });

    if (!apiLink) {
      return res.status(404).json({
        success: false,
        error: 'API link not found'
      });
    }

    apiLink.isActive = isActive;
    await apiLink.save();

    res.json({
      success: true,
      data: apiLink,
      message: `API link ${isActive ? 'enabled' : 'disabled'} successfully`
    });

  } catch (error) {
    console.error('Error setting API link status:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

module.exports = router; 
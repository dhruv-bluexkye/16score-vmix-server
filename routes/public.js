const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ApiLink = require('../models/ApiLink');

/**
 * @swagger
 * /api/public/{linkId}:
 *   get:
 *     summary: Access public API link
 *     description: Access match data through a public API link (no authentication required)
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: linkId
 *         required: true
 *         schema:
 *           type: string
 *         description: Random link ID
 *     responses:
 *       200:
 *         description: Match data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 matchId:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 data:
 *                   type: object
 *                   description: Match data based on link type
 *       404:
 *         description: Link not found or inactive
 *       500:
 *         description: Server error
 */
// GET /api/public/:linkId - Access public API link
router.get('/:linkId', async (req, res) => {
  try {
    const { linkId } = req.params;

    // Find the API link (only active ones)
    const apiLink = await ApiLink.findOne({ 
      linkId, 
      isActive: true 
    });

    if (!apiLink) {
      return res.status(404).json({
        success: false,
        error: 'Not found'
      });
    }

    // Update access statistics
    apiLink.accessCount += 1;
    apiLink.lastAccessed = new Date();
    await apiLink.save();

    // Get the collection name based on matchId (convert hyphens to underscores and trim whitespace)
    const cleanMatchId = apiLink.matchId.trim();
    const collectionName = `match_${cleanMatchId.replace(/-/g, '_')}`;
    
    console.log('Looking for collection:', collectionName);
    console.log('Original matchId:', apiLink.matchId);
    console.log('Clean matchId:', cleanMatchId);
    
    // Check if collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionExists = collections.some(col => col.name === collectionName);
    
    console.log('Available collections:', collections.map(col => col.name));
    console.log('Collection exists:', collectionExists);
    
    if (!collectionExists) {
      return res.status(404).json({
        success: false,
        error: 'Match data not found'
      });
    }

    // Get the latest document from the collection
    const collection = mongoose.connection.db.collection(collectionName);
    const latestMatch = await collection.findOne({}, { sort: { timestamp: -1 } });

    if (!latestMatch) {
      return res.status(404).json({
        success: false,
        error: 'No match data found'
      });
    }

    // Extract data based on link type
    let responseData = {};
    
    if (apiLink.type === 'points_table') {
      responseData = {
        pointsTable: latestMatch.pointsTable || [],
        matchSummary: latestMatch.MatchSummary1 || {}
      };
    } else if (apiLink.type === 'alive_status') {
      responseData = {
        teamStats: latestMatch.TeamStats1 || [],
        matchSummary: latestMatch.MatchSummary1 || {}
      };
    } else if (apiLink.type === 'full') {
      responseData = latestMatch;
    }

    res.json({
      success: true,
      matchId: latestMatch.matchId,
      timestamp: latestMatch.timestamp,
      data: responseData
    });

  } catch (error) {
    console.error('Error accessing public API link:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

module.exports = router; 
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     LiveScoreResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         matchId:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 *         data:
 *           type: object
 *           description: Match data based on requested type
 *         error:
 *           type: string
 *           description: Error message if any
 */

/**
 * @swagger
 * /api/livescore/{matchId}:
 *   get:
 *     summary: Get live score data
 *     description: Fetch live score data for a specific match based on type
 *     tags: [LiveScore]
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Match ID to fetch data for
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [alive_status, points_table]
 *         description: Type of data to fetch
 *     responses:
 *       200:
 *         description: Live score data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LiveScoreResponse'
 *       400:
 *         description: Invalid type parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Invalid type parameter. Use 'alive_status' or 'points_table'
 *       404:
 *         description: Match not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Match not found
 *       500:
 *         description: Server error
 */
// GET /api/livescore/:matchId
router.get('/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { type } = req.query;

    // Validate type parameter
    if (!type || !['alive_status', 'points_table'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: "Invalid type parameter. Use 'alive_status' or 'points_table'"
      });
    }

    // Get the collection name based on matchId (convert hyphens to underscores)
    const collectionName = `match_${matchId.replace(/-/g, '_')}`;

    
    // Check if collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionExists = collections.some(col => col.name === collectionName);
    
    if (!collectionExists) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
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

    // Extract data based on type
    let responseData = {};
    
    if (type === 'points_table') {
      responseData = {
        pointsTable: latestMatch.pointsTable || [],
        matchSummary: latestMatch.MatchSummary1 || {}
      };
    } else if (type === 'alive_status') {
      responseData = {
        teamStats: latestMatch.TeamStats1 || [],
        matchSummary: latestMatch.MatchSummary1 || {}
      };
    }

    res.json({
      success: true,
      matchId: latestMatch.matchId,
      timestamp: latestMatch.timestamp,
      data: responseData
    });

  } catch (error) {
    console.error('Error fetching live score:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

/**
 * @swagger
 * /api/livescore/{matchId}/full:
 *   get:
 *     summary: Get full match data
 *     description: Fetch complete match data including all information
 *     tags: [LiveScore]
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Match ID to fetch data for
 *     responses:
 *       200:
 *         description: Full match data retrieved successfully
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
 *                   description: Complete match data
 *       404:
 *         description: Match not found
 *       500:
 *         description: Server error
 */
// GET /api/livescore/:matchId/full
router.get('/:matchId/full', async (req, res) => {
  try {
    const { matchId } = req.params;

    // Get the collection name based on matchId (convert hyphens to underscores)
    const collectionName = `match_${matchId.replace(/-/g, '_')}`;
    console.log(collectionName);
    
    // Check if collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionExists = collections.some(col => col.name === collectionName);
    
    if (!collectionExists) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
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

    res.json({
      success: true,
      matchId: latestMatch.matchId,
      timestamp: latestMatch.timestamp,
      data: latestMatch
    });

  } catch (error) {
    console.error('Error fetching full match data:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

module.exports = router; 
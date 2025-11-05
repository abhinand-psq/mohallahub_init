import express from 'express';
import { 
  createCommunity, 
  getCommunity, 
  joinCommunity, 
  leaveCommunity,
  getCommunityPosts,
  searchCommunities 
} from '../controllers/communityController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { uploadFields } from '../middleware/upload.js';

const router = express.Router();

router.get('/search', optionalAuth, searchCommunities);
router.get('/:id', optionalAuth, getCommunity);
router.get('/:id/posts', optionalAuth, getCommunityPosts);
router.post('/', authenticateToken, uploadFields([
  { name: 'icon', maxCount: 1 },
  { name: 'coverPic', maxCount: 1 }
]), createCommunity);
router.post('/:id/join', authenticateToken, joinCommunity);
router.delete('/:id/leave', authenticateToken, leaveCommunity);

export default router;



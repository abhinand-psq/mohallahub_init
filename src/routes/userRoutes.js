import express from 'express';
import { 
  getUserProfile, 
  updateProfile, 
  followUser, 
  unfollowUser, 
  getUserPosts,
  searchUsers 
} from '../controllers/userController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();

router.get('/search', authenticateToken, searchUsers);
router.get('/:username', optionalAuth, getUserProfile);
router.get('/:username/posts', optionalAuth, getUserPosts);
router.put('/profile', authenticateToken, uploadSingle('profilePic'), updateProfile);
router.post('/:userId/follow', authenticateToken, followUser);
router.delete('/:userId/follow', authenticateToken, unfollowUser);

export default router;




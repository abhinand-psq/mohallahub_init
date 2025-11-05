import express from 'express';
import { 
  createPost, 
  getPost, 
  getFeed, 
  likePost, 
  unlikePost, 
  savePost, 
  unsavePost,
  deletePost 
} from '../controllers/postController.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadMultiple } from '../middleware/upload.js';

const router = express.Router();

router.get('/feed', authenticateToken, getFeed);
router.get('/:id', authenticateToken, getPost);
router.post('/', authenticateToken, uploadMultiple('media', 3), createPost);
router.post('/:id/like', authenticateToken, likePost);
router.delete('/:id/like', authenticateToken, unlikePost);
router.post('/:id/save', authenticateToken, savePost);
router.delete('/:id/save', authenticateToken, unsavePost);
router.delete('/:id', authenticateToken, deletePost);

export default router;



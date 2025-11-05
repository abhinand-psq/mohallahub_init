import express from 'express';
import { 
  createComment, 
  getComments, 
  likeComment, 
  unlikeComment, 
  deleteComment 
} from '../controllers/commentController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();

router.get('/post/:id', optionalAuth, getComments);
router.post('/post/:id', authenticateToken, uploadSingle('media'), createComment);
router.post('/:id/like', authenticateToken, likeComment);
router.delete('/:id/like', authenticateToken, unlikeComment);
router.delete('/:id', authenticateToken, deleteComment);

export default router;

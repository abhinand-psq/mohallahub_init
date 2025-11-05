import express from 'express';
import { 
  register, 
  login, 
  refreshToken, 
  logout, 
  getCurrentUser 
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();

router.post('/register', uploadSingle('profilePic'), register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.get('/me', authenticateToken, getCurrentUser);

export default router;



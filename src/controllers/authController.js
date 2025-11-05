import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  saveRefreshToken, 
  deleteRefreshToken,
  verifyRefreshToken
} from '../utils/tokenHelpers.js';
import { uploadToCloudinary } from '../utils/cloudinaryHelpers.js';

// Register
export const register = async (req, res) => {
  try {
    const { email, username, password, firstName, lastName } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.email === email ? 'Email already exists' : 'Username already exists' 
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Handle profile picture upload
    let profilePic = {};
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'profiles');
      profilePic = {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height
      };
    }

    // Create user
    const user = new User({
      email,
      username,
      passwordHash,
      firstName,
      lastName,
      profilePic
    });

    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    await saveRefreshToken(user._id, refreshToken);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePic: user.profilePic
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    await saveRefreshToken(user._id, refreshToken);

    res.json({
      message: 'Login successful',
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePic: user.profilePic,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Refresh token
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(token);

    // Check if token exists in database
    const storedToken = await RefreshToken.findOne({ token });
    if (!storedToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Generate new access token
    const accessToken = generateAccessToken(decoded.userId);

    res.json({ accessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Failed to refresh token' });
  }
};

// Logout
export const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (token) {
      await deleteRefreshToken(token);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

// Get current user
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('addressReference')
      .select('-passwordHash');

    res.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};



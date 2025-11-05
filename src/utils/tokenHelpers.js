import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import RefreshToken from '../models/RefreshToken.js';

dotenv.config();

export const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '15m'
  });
};

export const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d'
  });
};

export const saveRefreshToken = async (userId, token) => {
  try {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const refreshToken = new RefreshToken({
      user: userId,
      token,
      expiresAt
    });
    await refreshToken.save();
    return refreshToken;
  } catch (error) {
    throw new Error('Failed to save refresh token');
  }
};

export const deleteRefreshToken = async (token) => {
  try {
    await RefreshToken.findOneAndDelete({ token });
  } catch (error) {
    throw new Error('Failed to delete refresh token');
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};



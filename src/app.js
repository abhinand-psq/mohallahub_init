import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';


// Import routes
// import authRoutes from './routes/authRoutes.js';
// import userRoutes from './routes/userRoutes.js';
// import communityRoutes from './routes/communityRoutes.js';
// import postRoutes from './routes/postRoutes.js';
// import commentRoutes from './routes/commentRoutes.js';

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import communityRoutes from "./routes/community.routes.js";
import postRoutes from "./routes/post.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import interactionRoutes from "./routes/interaction.routes.js";
import reportRoutes from "./routes/report.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import marketplaceRoutes from "./routes/marketplace.routes.js";
import auction from "./routes/auction.routes.js"
import feedRoutes from "./routes/feed.routes.js";
import servicesRoutes from "./routes/services.routes.js";



dotenv.config();

const app = express();

//Connect to database


// Middleware
app.use(cors({
  origin: 'http://localhost:5173' || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/communities', communityRoutes);
// app.use('/api/posts', postRoutes);
// app.use('/api/comments', commentRoutes);
app.use("/api/v1", feedRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/communities", communityRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/comments", commentRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/interactions", interactionRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/", marketplaceRoutes);
app.use("/api/v1", servicesRoutes);
app.use('/auction',auction)

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'MohallaHub Backend is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler


// Error handler

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

export default app;




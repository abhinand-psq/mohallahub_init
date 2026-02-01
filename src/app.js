import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import axios from 'axios';

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
import interactionRoutes from "./routes/interaction.routes.js";
import reportRoutes from "./routes/report.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import marketplaceRoutes from "./routes/marketplace.routes.js";
import auction from "./routes/auction.routes.js"
import feedRoutes from "./routes/feed.routes.js";
import servicesRoutes from "./routes/services.routes.js";
import userAuction from "./routes/auction.user.route.js"
import locationRoutes from "./routes/location.routes.js"
import communityAdminRoutes from "./routes/community.admin.routes.js"


dotenv.config();

const app = express();

//Connect to database
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5500",
    "https://mohalla-react.vercel.app",
    /https:\/\/.+\.vercel\.app$/, // RegExp for all Vercel previews
];;

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like Postman, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
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
app.use("/api/v1/location", locationRoutes);
app.use("/api/v1/communities", communityRoutes);
app.use("/api/v1/communities/admin", communityAdminRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/comments", commentRoutes);
app.use("/api/v1/interactions", interactionRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/", marketplaceRoutes);
app.use("/api/v1", servicesRoutes);
app.use('/api/v1/auction',auction)
app.use('/api/v1/auction/user',userAuction)

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'MohallaHub Backend is running',
    timestamp: new Date().toISOString()
  });
});

// app.get('/api/v1/get-address',async(req,res)=>{
// const { lat, lon } = req.query;

// if (!lat || !lon) {
//   return res.status(400).json({ error: 'Latitude and Longitude are required' });
// }  
// try { 
//   const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
//             params: {
//                 format: 'jsonv2', // v2 provides more structured data
//                 lat: lat,
//                 lon: lon,
//                 addressdetails: 1
//             },
//             headers: {
//                'User-Agent': 'mohallahub-backend/1.0 (http://localhost:8000; abhinandpsq2@gmail.com)'
//             }
//         });

//         // 2. Check if OSM actually found a place
//         if (response.data && response.data.address) {
//             res.status(200).json(response.data.address);
//         } else {
//             res.status(404).json({ error: "No address found for these coordinates" });
//         }
// }catch (error) {
//   console.error('Error fetching address:', error);
//   res.status(500).json({ error: 'Failed to fetch address' })
// }
// })

// // 404 handle


// // Error handler

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

export default app;




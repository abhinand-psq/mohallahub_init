# MohallaHub Backend

**Version:** 1.0  
**Type:** Production-Grade Hyperlocal Community Platform Backend  
**Stack:** Node.js (Express) + MongoDB (Mongoose) + JWT + Multer + Cloudinary

---

## 📋 Overview

MohallaHub is a hyperlocal community platform connecting users within a defined geographic hierarchy:
**State → District → Taluk → Block → Gram Panchayath → Ward**

Each geographic unit hosts multiple communities for local discussions, events, posts, and micro-commerce.

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- Cloudinary account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mohallahub-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your configurations:
   - `MONGO_URI` - MongoDB connection string
   - `JWT_SECRET` - Secret for access tokens
   - `JWT_REFRESH_SECRET` - Secret for refresh tokens
   - `CLOUDINARY_*` - Cloudinary credentials
   - `FRONTEND_URL` - Frontend application URL

4. **Start the server**
   ```bash
   npm start
   ```
   For development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Verify the installation**
   Visit `http://localhost:8000/api/health`

## 📁 Project Structure

```
mohallahub-backend/
├── src/
│   ├── config/
│   │   ├── db.js                 # MongoDB connection
│   │   └── cloudinary.js         # Cloudinary setup
│   │
│   ├── models/                   # Mongoose schemas
│   │   ├── Ward.js
│   │   ├── User.js
│   │   ├── Community.js
│   │   ├── Post.js
│   │   ├── Comment.js
│   │   ├── Like.js
│   │   ├── Follow.js
│   │   ├── Notification.js
│   │   ├── Report.js
│   │   ├── RefreshToken.js
│   │   └── Admin.js
│   │
│   ├── controllers/              # Business logic
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── communityController.js
│   │   ├── postController.js
│   │   └── commentController.js
│   │
│   ├── routes/                   # Express routes
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── communityRoutes.js
│   │   ├── postRoutes.js
│   │   └── commentRoutes.js
│   │
│   ├── middleware/               # Custom middleware
│   │   ├── auth.js
│   │   ├── upload.js
│   │   └── logger.js
│   │
│   ├── utils/                    # Helper functions
│   │   ├── tokenHelpers.js
│   │   └── cloudinaryHelpers.js
│   │
│   ├── app.js                    # Express app configuration
│   └── server.js                 # Server entry point
│
├── logs/                         # Application logs
├── .env                          # Environment variables
├── .env.example                  # Environment template
├── package.json
└── README.md
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/search?q=<query>` - Search users
- `GET /api/users/:username` - Get user profile
- `GET /api/users/:username/posts` - Get user's posts
- `PUT /api/users/profile` - Update profile
- `POST /api/users/:userId/follow` - Follow user
- `DELETE /api/users/:userId/follow` - Unfollow user

### Communities
- `GET /api/communities/search?q=<query>&hierarchy=<hierarchy>` - Search communities
- `GET /api/communities/:id` - Get community details
- `GET /api/communities/:id/posts` - Get community posts
- `POST /api/communities` - Create community
- `POST /api/communities/:id/join` - Join community
- `DELETE /api/communities/:id/leave` - Leave community

### Posts
- `GET /api/posts/feed` - Get feed
- `GET /api/posts/:id` - Get post details
- `POST /api/posts` - Create post
- `POST /api/posts/:id/like` - Like post
- `DELETE /api/posts/:id/like` - Unlike post
- `POST /api/posts/:id/save` - Save post
- `DELETE /api/posts/:id/save` - Unsave post
- `DELETE /api/posts/:id` - Delete post

### Comments
- `GET /api/comments/post/:id` - Get comments for a post
- `POST /api/comments/post/:id` - Create comment
- `POST /api/comments/:id/like` - Like comment
- `DELETE /api/comments/:id/like` - Unlike comment
- `DELETE /api/comments/:id` - Delete comment

## 🗄️ Database Models

The application uses MongoDB with the following key collections:

- **User** - User accounts and profiles
- **Community** - Hyperlocal communities
- **Post** - User-generated posts
- **Comment** - Post comments (with threading support)
- **Like** - Post and comment likes
- **Follow** - User-to-user following relationships
- **CommunityMembership** - User membership in communities
- **Notification** - User notifications
- **Report** - Content moderation reports
- **RefreshToken** - JWT refresh tokens
- **Ward** - Geographic hierarchy master data
- **UserCommunityAccess** - Location references

## 🔒 Authentication

The application uses JWT with access tokens (15 minutes) and refresh tokens (7 days).

- Include access token in headers: `Authorization: Bearer <token>`
- Refresh tokens are stored in MongoDB and auto-expire after 7 days

## 📤 File Uploads

Media uploads are handled via Multer and stored in Cloudinary:

- Profile pictures (jpeg, jpg, png, gif)
- Post media (up to 3 files)
- Video support included
- File size limit: 10MB

## 🛠️ Technology Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB with Mongoose |
| File Storage | Cloudinary |
| Authentication | JWT (Access + Refresh) |
| File Upload | Multer |
| Logging | Morgan + Winston |
| Validation | express-validator |

## 📝 Environment Variables

Required environment variables (see `.env.example`):

```env
PORT=8000
MONGO_URI=mongodb://localhost:27017/mohallahub
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=http://localhost:3000
```

## 🧪 Development

### Running in Development Mode
```bash
npm run dev
```

### Project Commands
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload

### Logging
Logs are stored in the `logs/` directory:
- `error.log` - Error logs
- `combined.log` - All logs

## 🎯 Features Implemented

✅ User registration and authentication  
✅ Profile management with media uploads  
✅ Community creation and management  
✅ Post creation with media support  
✅ Comments with threading  
✅ Like/unlike posts and comments  
✅ Follow/unfollow users  
✅ Save posts  
✅ Search users and communities  
✅ Geographic hierarchy support  
✅ JWT authentication with refresh tokens  
✅ Cloudinary integration for media storage  

## 📌 Future Enhancements

- [ ] Notification system implementation
- [ ] Report and moderation features
- [ ] Admin panel endpoints
- [ ] Analytics collection
- [ ] Real-time features with WebSockets
- [ ] Email verification
- [ ] OAuth integration

## 📄 License

ISC

## 👤 Author

Abhinand (Founder, MohallaHub)

---

For more information, please refer to the complete PRD document.




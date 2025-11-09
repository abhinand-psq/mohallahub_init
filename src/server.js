import app from './app.js';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 8000;

connectDB().then((message)=>{
console.log(`MongoDB Connected: ${message.connection.host}`);
app.listen(PORT, () => {
  console.log(`🚀 MohallaHub Backend Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
}).catch((error)=>{
  console.log(`MongoDB Connected: ${error.message}`);
process.exit(1)
})





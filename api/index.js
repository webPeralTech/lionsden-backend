import app from '../src/app.js';
import { connectDatabase } from '../src/config/db.js';

export default async function handler(req, res) {
  try {
    await connectDatabase();
  } catch (error) {
    console.error('Database connection error in Vercel Serverless handler:', error);
    // Allow root / and health endpoints to respond even if DB is still connecting
    if (req.url === '/' || req.url === '/health') {
      return app(req, res);
    }
    return res.status(500).json({
      success: false,
      message: 'Database connection failed. Please ensure MONGODB_URI is configured in Vercel Environment Variables and MongoDB Atlas allows access from 0.0.0.0/0.',
      error: error.message,
    });
  }

  return app(req, res);
}

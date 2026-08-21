import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  impossibleTravelThresholdKmh: parseFloat(process.env.IMPOSSIBLE_TRAVEL_THRESHOLD_KMH || '500'),
  duplicateScanWindowSeconds: parseInt(process.env.DUPLICATE_SCAN_WINDOW_SECONDS || '300', 10),
  excessiveScanThreshold: parseInt(process.env.EXCESSIVE_SCAN_THRESHOLD || '5', 10),
};

import 'dotenv/config';
import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import { initSocket } from './socket.js';

// Stop early with a clear message if the .env file is incomplete.
for (const key of ['MONGO_URI', 'JWT_SECRET']) {
  if (!process.env[key]) {
    console.error(`Missing ${key} in .env file`);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 5000;

// Express and Socket.IO share one HTTP server.
const server = http.createServer(app);
initSocket(server);

connectDB().then(() => {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

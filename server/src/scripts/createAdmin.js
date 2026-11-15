import 'dotenv/config';
import mongoose from 'mongoose';
import { pathToFileURL } from 'url';
import User from '../models/User.js';

// Creates an admin account, or promotes an existing account to admin.
export const createAdmin = async ({ name = 'Platform Admin', email, password }) => {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('A valid ADMIN_EMAIL is required');
  if (typeof password !== 'string' || password.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters');

  const cleanEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: cleanEmail });
  if (existing) {
    existing.role = 'admin';
    existing.isBlocked = false;
    existing.password = password; // set to the password you provided
    await existing.save();
    return { user: existing, created: false };
  }
  const user = await User.create({ name, email: cleanEmail, password, role: 'admin' });
  return { user, created: true };
};

// Runs only when started from the command line:  npm run seed:admin
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const { user, created } = await createAdmin({
      name: process.env.ADMIN_NAME || 'Platform Admin',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    console.log(`${created ? 'Created' : 'Updated'} admin account: ${user.email}`);
  } catch (err) {
    console.error('Could not create admin:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';

const run = async () => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(); const password = process.env.ADMIN_PASSWORD; const fullName = process.env.ADMIN_FULL_NAME?.trim() || 'HireFlow Administrator';
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('ADMIN_EMAIL must be a valid email address');
  if (!password || password.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters');
  await connectDB();
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await User.findOne({ email });
  if (existing && existing.role !== 'admin') throw new Error('Refusing to convert an existing non-admin account');
  await User.findOneAndUpdate({ email }, { $set: { fullName, passwordHash, role: 'admin', isEmailVerified: true } }, { upsert: true, runValidators: true });
  console.log(`Admin account provisioned for ${email}`);
  await disconnectDB();
};
run().catch(async (error: unknown) => { console.error(error instanceof Error ? error.message : 'Admin bootstrap failed'); await disconnectDB(); process.exit(1); });

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

mongoose.set('strictQuery', true);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1); 
  }
}

export default connectDB;

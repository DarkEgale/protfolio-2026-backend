import {v2 as cloudinary} from 'cloudinary';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
})

console.log("Cloudinary Configured with:", {
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY ? "set" : "missing",
    api_secret: process.env.CLOUD_API_SECRET ? "set" : "missing"
});

export default cloudinary;

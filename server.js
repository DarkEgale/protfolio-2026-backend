import app from "./app.js";
import dotenv from 'dotenv';
import connectDB from "./Config/db.js";
import { fileURLToPath } from 'url';

dotenv.config({ path: fileURLToPath(new URL("./.env", import.meta.url)) });
connectDB();
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

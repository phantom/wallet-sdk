import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables from .env file if it exists
// In CI/GitHub Actions, environment variables are provided directly
const envPath = path.resolve(__dirname, "../.env.example");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

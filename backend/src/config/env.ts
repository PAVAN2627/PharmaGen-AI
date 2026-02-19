import dotenv from 'dotenv';
import path from 'path';

// Load environment variables before anything else
dotenv.config({ path: path.join(__dirname, '../../.env') });

export default process.env;

import dotenv from 'dotenv';
dotenv.config();
import pkg from 'pg';
const {Pool} = pkg;

export const pool = new Pool({
    user: process.env.SUPABASE_USER_NAME,
    host: process.env.SUPABASE_HOST,
    database: process.env.SUPABASE_DATABASE_NAME,
    password: process.env.SUPABASE_PASSWORD,
    port: process.env.SUPABASE_PORT
})
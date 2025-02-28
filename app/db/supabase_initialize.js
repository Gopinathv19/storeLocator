import {createClient} from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAPI = process.env.SUPABASE_API;

export const supabase = createClient(supabaseUrl, supabaseAPI)
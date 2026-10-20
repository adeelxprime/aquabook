import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'aquabook_supabase_config';
const DEFAULT_URL = 'https://zegkjflmmvovexvnamwi.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZ2tqZmxtbXZvdmV4dm5hbXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzNDE1NDUsImV4cCI6MjEwNzkxNzU0NX0.KNPhiHIej95N7u2cSX5btUJCfvD4jXH2h6MX6kQi4dg';

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  // Check localStorage first (user-configured in UI)
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Clear dead legacy placeholder URL
      if (parsed.url && parsed.url.includes('wrkczabwwcemmjyxlpli')) {
        localStorage.removeItem(STORAGE_KEY);
      } else if (parsed.url && parsed.anonKey && parsed.url.startsWith('https://')) {
        return parsed;
      }
    }
  } catch {
    // Ignore JSON error
  }

  // Fallback to environment variables or verified project credentials
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || DEFAULT_URL;
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_ANON_KEY;

  return {
    url: envUrl,
    anonKey: envKey,
  };
}

export function saveSupabaseConfig(url: string, anonKey: string) {
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = `https://${cleanUrl}`;
  }
  cleanUrl = cleanUrl.replace(/\/+$/, '');
  const cleanKey = anonKey.trim();

  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url: cleanUrl, anonKey: cleanKey }));
  // Reinitialize client
  cachedClient = null;
  initClient();
}

export function clearSupabaseConfig() {
  localStorage.removeItem(STORAGE_KEY);
  cachedClient = null;
}

let cachedClient: SupabaseClient | null = null;

function initClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    cachedClient = null;
    return null;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    cachedClient = null;
    return null;
  }
}

export function getSupabase(): SupabaseClient | null {
  if (!cachedClient) {
    cachedClient = initClient();
  }
  return cachedClient;
}

export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey && config.url.startsWith('https://') && !config.url.includes('wrkczabwwcemmjyxlpli'));
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return {
      success: false,
      message: 'Supabase Project URL aur Anon Key dono darj karna zaroori hain.',
    };
  }

  const client = getSupabase();
  if (!client) {
    return {
      success: false,
      message: 'Supabase client initialize nahi ho saka. Baraye meharbani URL aur Key check karein.',
    };
  }

  try {
    // Try pinging businesses table or health
    const { data, error } = await client.from('businesses').select('count', { count: 'exact', head: true });
    if (error) {
      const msg = error.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('fetch')) {
        return {
          success: false,
          message: `Network/URL Error: Supabase server tak pohnch nahi ho saki (${config.url}). Check karein ke Project URL theek hai aur Supabase project active hai.`,
        };
      }
      if (msg.toLowerCase().includes('jwt') || msg.toLowerCase().includes('apikey') || msg.toLowerCase().includes('invalid api key')) {
        return {
          success: false,
          message: `API Key Error: Anon Key durust nahi hai. Supabase Dashboard -> Project Settings -> API se 'anon public' key dobara copy karein.`,
        };
      }
      if (msg.toLowerCase().includes('does not exist') || msg.toLowerCase().includes('relation') || msg.toLowerCase().includes('404')) {
        return {
          success: false,
          message: `Database connect hai magar tables nahi mili! Baraye meharbani 'supabase_schema.sql' ko Supabase SQL Editor me paste karke RUN karein.`,
        };
      }
      return {
        success: false,
        message: `Supabase Error: ${msg}`,
      };
    }
    return {
      success: true,
      message: 'Mubarak ho! Supabase PostgreSQL Database kamyabi ke sath connect ho gaya hai.',
    };
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.includes('Failed to fetch') || msg.includes('fetch')) {
      return {
        success: false,
        message: `Network/URL Error: Supabase Project URL tak pohnch nahi ho saki (${config.url}). Check karein ke internet chal raha hai aur project active hai.`,
      };
    }
    return {
      success: false,
      message: `Failed to connect: ${msg || 'Unknown network error'}`,
    };
  }
}

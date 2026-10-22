declare module "*.svg?raw" { const s: string; export default s; }
interface ImportMetaEnv { readonly VITE_SUPABASE_URL: string; readonly VITE_SUPABASE_ANON_KEY: string } interface ImportMeta { readonly env: ImportMetaEnv }

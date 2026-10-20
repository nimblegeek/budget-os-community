import {fileURLToPath} from 'node:url';
if(process.env.NODE_ENV!=='development')throw new Error('Local test harness: use npm run dev:local, never deploy this directory.');
export default {
  devIndicators:false,
  serverExternalPackages:['@electric-sql/pglite'],
  webpack(config) {
    config.resolve.alias['@clerk/nextjs$']=fileURLToPath(new URL('./clerk-ui.tsx',import.meta.url));
    config.resolve.alias['@/lib/server$']=fileURLToPath(new URL('./server.ts',import.meta.url));
    return config;
  },
};

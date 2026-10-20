import { clerkMiddleware } from '@clerk/nextjs/server';
// Identity only here; every data endpoint independently enforces membership.
export default clerkMiddleware({authorizedParties:[new URL(process.env.APP_URL||'https://budgetos.app').origin,...(process.env.NODE_ENV==='development'?['http://localhost:3000']:[])]});
export const config={matcher:['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ico|woff2?)).*)','/(api|trpc)(.*)']};

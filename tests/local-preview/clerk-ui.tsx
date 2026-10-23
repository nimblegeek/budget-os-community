// Test-only account chrome. Production continues to use the actual Clerk SDK.
export function ClerkProvider({children}:React.PropsWithChildren<{signInUrl?:string;signUpUrl?:string;afterSignOutUrl?:string}>){return <>{children}</>;}
export function UserButton(){return <span className="badge">Lokalt testkonto</span>;}
export function SignOutButton(_:React.PropsWithChildren<{redirectUrl?:string}>){return <span className="badge" title="Endast den lokala testmiljön. Ingen riktig inloggning.">Testläge</span>;}
export function useClerk(){return {signOut:async()=>{}};}

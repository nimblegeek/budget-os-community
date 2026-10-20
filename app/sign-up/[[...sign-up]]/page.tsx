import { SignUp } from '@clerk/nextjs';
import Brand from '../../brand';
export default function Page(){return <main className="login"><Brand/><p>Skapa ditt konto och verifiera din e-postadress. Du får en egen tom, privat ekonomi. Ingen annan får se den utan att du uttryckligen delar läsbehörighet.</p><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/"/></main>;}

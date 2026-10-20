import { SignIn } from '@clerk/nextjs';
import Brand from '../../brand';
export default function Page(){return <main className="login"><Brand/><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/"/></main>;}

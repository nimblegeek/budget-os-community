import { auth } from '@clerk/nextjs/server';
import BudgetApp from './ui';
import Landing from './landing';
import InactivitySignOut from './inactivity-signout';
export const metadata={title:'Budget OS — mer koll, mindre brus',description:'En avskalad överblick över budget, sparande, intäkter och skulder. På dina villkor.'};
export const dynamic='force-dynamic';
export default async function Home(){
 const {userId}=await auth();
 if(!userId)return <Landing/>;
 return <><InactivitySignOut/><BudgetApp/></>;
}

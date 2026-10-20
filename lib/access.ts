export type VerifiedUser={id:string;primaryEmailAddressId:string|null;emailAddresses:{id:string;emailAddress:string;verification?:{status:string}|null}[]};
export function verifiedEmail(user:VerifiedUser):string|null {
 const address=user.emailAddresses.find(x=>x.id===user.primaryEmailAddressId&&x.verification?.status==='verified');
 return address?.emailAddress.toLowerCase()??null;
}
export function memberMatches(member:{user_id:string|null}|null,id:string){return !!member&&!!member.user_id&&member.user_id===id;}

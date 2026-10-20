import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedEmail,memberMatches} from '../lib/access.ts';
const user={id:'user_test',primaryEmailAddressId:'e1',emailAddresses:[{id:'e1',emailAddress:'Owner@Example.invalid',verification:{status:'verified'}}]};
test('only a verified primary email can resolve a budget identity',()=>{
 assert.equal(verifiedEmail(user),'owner@example.invalid');
 assert.equal(verifiedEmail({...user,emailAddresses:[{...user.emailAddresses[0],verification:{status:'unverified'}}]}),null);
 assert.equal(verifiedEmail({...user,primaryEmailAddressId:'missing'}),null);
});
test('membership binds a specific provider user, never just an arbitrary email',()=>{
 assert.equal(memberMatches(null,'user_test'),false);
 assert.equal(memberMatches({user_id:null},'user_test'),false);
 assert.equal(memberMatches({user_id:'other'},'user_test'),false);
 assert.equal(memberMatches({user_id:'user_test'},'user_test'),true);
});

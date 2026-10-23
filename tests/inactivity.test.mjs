import test from 'node:test';
import assert from 'node:assert/strict';
import {INACTIVITY_STORAGE_KEY,INACTIVITY_TIMEOUT_MS,inactivityExpired} from '../lib/inactivity.ts';

test('Authenticated inactivity timeout is exactly five minutes',()=>{
 assert.equal(INACTIVITY_TIMEOUT_MS,300000);
 assert.equal(INACTIVITY_STORAGE_KEY,'budgetos:last-activity:v1');
 assert.equal(inactivityExpired(1000,300999),false);
 assert.equal(inactivityExpired(1000,301000),true);
});

test('Invalid activity timestamps expire instead of extending a session',()=>{
 assert.equal(inactivityExpired(Number.NaN,1000),true);
 assert.equal(inactivityExpired(Number.POSITIVE_INFINITY,1000),true);
});

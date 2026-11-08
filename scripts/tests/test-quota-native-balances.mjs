#!/usr/bin/env node
import assert from 'node:assert/strict';
import {normalizeBalanceBuckets} from '../../dist/server/quota.js';
const live={balance:5,accountBalance:{total:88.94563796,tier:73.79805622,paid:15.14758174}};
assert.deepEqual(normalizeBalanceBuckets(live,63.7543),{totalBalance:5,questBalance:5,walletBalance:5});
assert.deepEqual(normalizeBalanceBuckets({balance:0,accountBalance:{tier:73,paid:15}},63),{totalBalance:0,questBalance:0,walletBalance:0});
assert.deepEqual(normalizeBalanceBuckets({balance:3,accountBalance:{tier:0,paid:12}},22),{totalBalance:3,questBalance:0,walletBalance:3});
assert.deepEqual(normalizeBalanceBuckets({balance:5,allowance:2,pack:3},0),{totalBalance:5,questBalance:2,walletBalance:3});
assert.deepEqual(normalizeBalanceBuckets({balance:5},2),{totalBalance:5,questBalance:2,walletBalance:3});
assert.deepEqual(normalizeBalanceBuckets({balance:5,total:99},2),{totalBalance:5,questBalance:2,walletBalance:3});
console.log('QUOTA_NATIVE_BUCKETS_TEST_OK 6 scenarios, capped by key balance, legacy compatibility');

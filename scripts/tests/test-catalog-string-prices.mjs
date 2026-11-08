#!/usr/bin/env node
// Regression for live Pollinations API prices represented by strings.
import assert from 'node:assert/strict';
import {numericCatalogPrice,estimateImageCost,estimateVideoCost,formatCost} from '../../dist/tools/pollinations/shared.js';
import {checkCostControl} from '../../dist/tools/pollinations/cost-guard.js';
const tests=[['0.004',0.004],['0.03',0.03],[0.15,0.15],['0',0],[' 0.02 ',0.02]];
for (const [input,expected] of tests) assert.equal(numericCatalogPrice(input),expected);
for (const bad of ['',null,undefined,'not-a-number','Infinity','-2']) assert.equal(numericCatalogPrice(bad),undefined);
assert.equal(typeof estimateImageCost('unindexed'), 'number');
assert.equal(typeof estimateVideoCost('unindexed',2), 'number');
assert.ok(formatCost(0.004).includes('0.0040'));
for (const bad of [NaN,Infinity,-1]) {
 const r=checkCostControl('polli_gen_image',{},'invalid',bad,'image');
 assert.equal(r.allowed,false);assert.equal(r.reason,'invalid_cost_estimate');
}
console.log('CATALOG_NUMERIC_PRICING_REGRESSION_OK');

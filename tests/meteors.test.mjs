import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMeteorTimeline } from '../src/meteors.ts';

test('meteors wait between passes, brighten, fade, and leave no lingering trail',()=>{
  const at=createMeteorTimeline(10,()=>0.5);
  assert.equal(at(0,16/9),undefined);
  assert.equal(at(11,16/9),undefined);
  const first=at(11.5,16/9);assert.equal(first.strength,0);
  const middle=at(12.05,16/9);assert.ok(middle.strength>0.8);
  assert.ok(middle.x<first.x,'head must move in its chosen direction');
  assert.ok(at(12.59,16/9).strength<0.1);
  assert.equal(at(12.7,16/9),undefined);
  assert.equal(at(20,16/9),undefined);
});

test('random directions cover every quadrant and stay inside narrow and wide viewports',()=>{
  for(const aspect of [0.45,1,3.2])for(const seed of [0.125,0.375,0.625,0.875]){
    const at=createMeteorTimeline(10,()=>seed);at(0,aspect);
    const start=10*(0.7+seed*0.9),duration=0.85+seed*0.5;
    const first=at(start,aspect),last=at(start+duration*0.999,aspect);
    assert.ok(Math.abs(Math.hypot(first.dx,first.dy)-1)<1e-10);
    assert.equal(Math.sign(first.dx),seed<0.25||seed>0.75?1:-1);
    assert.equal(Math.sign(first.dy),seed<0.5?1:-1);
    for(const frame of [first,last]){
      assert.ok(Math.abs(frame.x)<aspect/2);assert.ok(Math.abs(frame.y)<0.5);
      assert.ok(frame.tail>0&&frame.width>0);
    }
  }
});

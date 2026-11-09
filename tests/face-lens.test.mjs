import {test} from 'node:test';import assert from 'node:assert/strict';import {lensPoint,createFaceLens} from '../face-lens.js';
test('fisheye disables at zero and preserves the center and every frame edge',()=>{
 for(const strength of [0,.25,1]){assert.deepEqual(lensPoint(0,0,strength),{x:0,y:0});for(const v of [-1,-.5,0,.5,1]){assert.deepEqual(lensPoint(v,1,strength),{x:v,y:1});assert.deepEqual(lensPoint(-1,v,strength),{x:-1,y:v});}}
 assert.deepEqual(lensPoint(.4,-.7,0),{x:.4,y:-.7});
});
test('fisheye grows smoothly with slider strength without folding the image',()=>{
 let previous=-Infinity;
 for(let i=0;i<=100;i++){const x=i/100,p=lensPoint(x,.3,1);assert.ok(p.x>previous);previous=p.x;}
 assert.ok(lensPoint(.5,.4,1).x<lensPoint(.5,.4,.25).x);assert.ok(lensPoint(.5,.4,.25).x<.5);
});

test('lens renders opaque pixels, caches repeated source frames and refreshes slider changes',()=>{
 let reads=0,output;
 const lens=createFaceLens(()=>({width:0,height:0,getContext(){return {drawImage(){},getImageData(x,y,w,h){reads++;return {data:new Uint8ClampedArray(w*h*4).fill(255)};},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(p){output=p.data;}};}}));
 const crop={x:0,y:0,w:10,h:8},source={};const first=lens.image(source,crop,.25,1);assert.ok(output.every(v=>v===255));assert.equal(lens.image(source,crop,.25,1),first);assert.equal(reads,1);lens.image(source,crop,.5,1);assert.equal(reads,2);lens.image(source,crop,.5,2);assert.equal(reads,3);
});

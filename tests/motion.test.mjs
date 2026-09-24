import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MotionDetector,detectGlobalMotion} from '../motion.js';
import {mirrorForCamera} from '../presentation.js';
const w=80,h=60;
function texture(){let seed=71;return Float32Array.from({length:w*h},()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return 40+seed%170;});}
function rgba(a){return Uint8ClampedArray.from({length:w*h*4},(_,i)=>i%4===3?255:a[i>>2]);}
function shift(a,dx,dy){return Float32Array.from({length:w*h},(_,i)=>{const x=i%w-dx,y=Math.floor(i/w)-dy;return x>=0&&x<w&&y>=0&&y<h?a[y*w+x]:80;});}
const base=texture();
test('global translation is estimated without generating background blobs',()=>{const next=shift(base,2,1),g=detectGlobalMotion(base,next,w,h);assert.equal(g.reliable,true);assert.ok(Math.abs(g.transform[2]-2)<.1);const d=new MotionDetector({STABILIZATION_FRAMES:0});d.update(rgba(base));assert.equal(d.update(rgba(next)).length,0);});
test('independent object remains detectable with stationary camera',()=>{const next=base.slice();for(let y=20;y<35;y++)for(let x=30;x<45;x++)next[y*w+x]=250;const d=new MotionDetector({STABILIZATION_FRAMES:0});d.update(rgba(base));assert.ok(d.update(rgba(next)).length>0);});
test('independent object remains detectable while camera pans',()=>{const next=shift(base,2,1);for(let y=20;y<35;y++)for(let x=30;x<45;x++)next[y*w+x]=250;const d=new MotionDetector({STABILIZATION_FRAMES:0});d.update(rgba(base));assert.ok(d.update(rgba(next)).length>0);});
test('large scene change enters stabilization then recovers',()=>{const d=new MotionDetector({STABILIZATION_FRAMES:3});d.update(rgba(base));const other=Float32Array.from(base,v=>255-v);assert.equal(d.update(rgba(other)).length,0);assert.equal(d.blocked,true);for(let i=0;i<4;i++)d.update(rgba(other));assert.equal(d.blocked,false);});
test('reset discards history and stabilizes without old candidates',()=>{const d=new MotionDetector();d.update(rgba(base));d.reset();assert.equal(d.previous,null);assert.equal(d.blocked,true);assert.deepEqual(d.update(rgba(shift(base,5,4))),[]);});
test('mirror follows actual facing and falls back to requested camera',()=>{assert.equal(mirrorForCamera({facingMode:'user'},'environment'),true);assert.equal(mirrorForCamera({facingMode:'environment'},'user'),false);assert.equal(mirrorForCamera({},'user'),true);assert.equal(mirrorForCamera({},'user','Back Camera'),false);});
test('small rotation is compensated',()=>{const angle=.045,c=Math.cos(angle),s=Math.sin(angle);const next=Float32Array.from({length:w*h},(_,i)=>{const x=i%w-40,y=Math.floor(i/w)-30;const u=Math.round(c*x+s*y+40),v=Math.round(-s*x+c*y+30);return u>=0&&u<w&&v>=0&&v<h?base[v*w+u]:80;});const d=new MotionDetector({STABILIZATION_FRAMES:0});d.update(rgba(base));assert.equal(d.update(rgba(next)).length,0);});

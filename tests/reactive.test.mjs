import {test} from 'node:test';
import assert from 'node:assert/strict';
import {audioFeatures,containPoint} from '../reactive.js';
import {Sampler} from '../audio.js';
test('silent output stays still, actual amplitude drives the envelope',()=>{
 const spectrum=new Uint8Array(512),silence=new Float32Array(1024);
 assert.deepEqual(audioFeatures(silence,spectrum,48000,1024),{level:0,bass:0,treble:0});
 const tone=Float32Array.from({length:1024},(_,i)=>Math.sin(i*.2)*.1);
 const loud=Float32Array.from(tone,v=>v*2);
 const a=audioFeatures(tone,spectrum,48000,1024),b=audioFeatures(loud,spectrum,48000,1024);
 assert.ok(a.level>0);assert.ok(Math.abs(b.level-2*a.level)<1e-6);
});
test('bass and treble separately reflect the measured spectrum',()=>{
 const samples=new Float32Array(1024),low=new Uint8Array(512),high=new Uint8Array(512);
 low[3]=255;high[85]=255;
 const a=audioFeatures(samples,low,48000,1024),b=audioFeatures(samples,high,48000,1024);
 assert.ok(a.bass>0);assert.equal(a.treble,0);assert.equal(b.bass,0);assert.ok(b.treble>0);
});
test('muted or stopped playback supplies no visual audio energy',()=>{
 const sampler=new Sampler();assert.equal(sampler.reaction().level,0);
 sampler.analyser={};sampler.ctx={state:'suspended'};assert.equal(sampler.reaction().level,0);
 sampler.ctx.state='running';sampler.muted=true;assert.equal(sampler.reaction().level,0);
});
test('contain mapping preserves the whole source in fullscreen and portrait layouts',()=>{
 const rect={left:0,top:0,width:1200,height:600};
 assert.deepEqual(containPoint({x:.5,y:.5},640,480,rect,1200,600),{x:.5,y:.5});
 const topLeft=containPoint({x:0,y:0},640,480,rect,1200,600);
 const bottomRight=containPoint({x:1,y:1},640,480,rect,1200,600);
 assert.equal(topLeft.x,1/6);assert.equal(topLeft.y,0);
 assert.equal(bottomRight.x,5/6);assert.equal(bottomRight.y,1);
 const phone={left:10,top:100,width:360,height:600};
 for(const point of [{x:0,y:0},{x:1,y:1}]){
  const shown=containPoint(point,640,480,phone,380,800);
  assert.ok(shown.x>=0&&shown.x<=1&&shown.y>=0&&shown.y<=1);
 }
});
import {cameraConstraints,titlePosition} from '../reactive.js';
test('desktop capture requests native 960x540 and a widescreen aspect ratio',()=>{
 const c=cameraConstraints(true);assert.equal(c.width.ideal,960);assert.equal(c.height.ideal,540);assert.equal(c.aspectRatio.ideal,16/9);
 assert.equal(cameraConstraints(false).aspectRatio.ideal,4/3);
});
test('each title window traverses both ends instead of staying in a local zone',()=>{
 for(let i=0;i<4;i++){
  const positions=Array.from({length:400},(_,step)=>titlePosition(step*.05,i));
  assert.ok(Math.min(...positions.map(p=>p.x))<.01);
  assert.ok(Math.max(...positions.map(p=>p.x))>.99);
  assert.ok(positions.every(p=>p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1));
 }
});

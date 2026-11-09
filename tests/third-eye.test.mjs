import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MouthTrigger,EYE_DURATION,eyeGeometry,createThirdEye} from '../third-eye.js';
import {createWanderer} from '../reactive.js';
function face(open=true){const f=Array.from({length:468},()=>({x:.5,y:.5}));Object.assign(f,{10:{x:.5,y:.18},9:{x:.5,y:.32},159:{x:.39,y:.4},145:{x:.39,y:.44},33:{x:.35,y:.42},133:{x:.43,y:.42},263:{x:.65,y:.42},13:{x:.5,y:.6},14:{x:.5,y:open?.69:.61}});return f;}
test('mouth opening is edge triggered with hysteresis and ten second lifetime',()=>{
 const gate=new MouthTrigger();assert.equal(EYE_DURATION,10000);assert.equal(gate.update(.3,100),true);assert.equal(gate.until,10100);
 assert.equal(gate.update(.3,12000),false);gate.update(.09,12100);assert.equal(gate.update(.3,12200),true);
 gate.reset();assert.equal(gate.update(.3,13000,false),false);assert.equal(gate.update(.3,13100),true);
});
test('forehead patch preserves geometry and source bounds for mirrored and tilted heads',()=>{
 const f=face(),g=eyeGeometry(f,1280,720);assert.ok(g.y<f[33].y*720);assert.ok(g.sx>=0&&g.sx+g.sw<=1280);assert.ok(g.sy>=0&&g.sy+g.sh<=720);
 const mirror=f.map(p=>({...p,x:1-p.x}));assert.equal(eyeGeometry(mirror,1280,720).angle,0);
 f[263].y=.47;const a=eyeGeometry(f,1280,720).angle,b=eyeGeometry(f.map(p=>({...p,x:1-p.x})),1280,720).angle;assert.ok(Math.abs(a+b)<1e-10);
});
test('opaque stamps keep their frame positions and expire independently after ten seconds',()=>{
 const calls=[],transforms=[],alphas=[];const ctx={save(){},restore(){},translate(x,y){transforms.push([x,y]);},rotate(){},drawImage(...args){calls.push(args);},set globalAlpha(value){alphas.push(value);}};
 const eye=createThirdEye(()=>({getContext:()=>({drawImage(){}})}));
 eye.update(face(),100,1280,720);eye.draw(ctx,{},100);
 const original=transforms[0];const moved=face().map(p=>({...p,x:p.x+.05}));
 eye.update(moved,200,1280,720);eye.draw(ctx,{},200);
 assert.deepEqual(transforms[1],original);assert.notDeepEqual(transforms[2],original);assert.ok(alphas.every(a=>a===1));
 calls.length=0;transforms.length=0;eye.draw(ctx,{},10099);assert.equal(calls.length,2);assert.deepEqual(transforms[0],original);
 calls.length=0;transforms.length=0;eye.draw(ctx,{},10100);assert.equal(calls.length,1);assert.notDeepEqual(transforms[0],original);
 calls.length=0;eye.draw(ctx,{},10200);assert.equal(calls.length,0);
 eye.update(face(false),10300,1280,720);eye.update(face(),10400,1280,720);eye.reset();eye.draw(ctx,{},10500);assert.equal(calls.length,0);
});
test('mouth palette state follows opening, closing and loss of face tracking',()=>{
 const eye=createThirdEye();eye.update(face(),100,1280,720);assert.equal(eye.isMouthOpen(200),true);
 eye.update(face(false),250,1280,720);assert.equal(eye.isMouthOpen(300),false);
 eye.update(face(),400,1280,720);assert.equal(eye.isMouthOpen(500),true);assert.equal(eye.isMouthOpen(1100),false);
 eye.reset();assert.equal(eye.isMouthOpen(1200),false);
});
test('random title paths stay bounded and remain continuous across destinations',()=>{
 let seed=17;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
 const path=createWanderer(random);let previous=path(0),xs=[],ys=[];
 for(let time=10;time<60000;time+=10){const p=path(time);assert.ok(p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1);assert.ok(Math.hypot(p.x-previous.x,p.y-previous.y)<.04);xs.push(p.x);ys.push(p.y);previous=p;}
 assert.ok(Math.max(...xs)-Math.min(...xs)>.7);assert.ok(Math.max(...ys)-Math.min(...ys)>.7);
});
test('eye stamps use the synchronized analysis patch, mirror correctly and release bitmaps',()=>{
 const pixels=[],scales=[];let closed=0;
 const pc={save(){},restore(){},translate(){},scale(...args){scales.push(args);},drawImage(...args){pixels.push(args);}};
 const eye=createThirdEye(()=>({getContext:()=>pc}));
 const analyzed={close(){closed++;}},next={close(){closed++;}};
 const ctx={save(){},restore(){},translate(){},rotate(){},drawImage(){}};
 eye.update(face(),0,1280,720,true,analyzed,true);eye.draw(ctx,{},0);eye.draw(ctx,{},24);eye.draw(ctx,{},48);
 assert.equal(pixels.length,1);assert.ok(pixels.every(args=>args[0]===analyzed));assert.ok(scales.every(args=>args[0]===-1));
 eye.update(face(),100,1280,720,true,next,true);assert.equal(closed,1);eye.reset();assert.equal(closed,2);
});

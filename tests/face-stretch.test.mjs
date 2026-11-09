import {test} from 'node:test';import assert from 'node:assert/strict';
import {createFaceStretch,pinchControl} from '../face-stretch.js';
function face(){const f=Array.from({length:468},()=>({x:.5,y:.5}));f[234]={x:.3,y:.4};f[454]={x:.7,y:.4};f[10]={x:.5,y:.2};f[152]={x:.5,y:.8};return f;}
function hand(dx=.02,dy=.02,offset=0){const h=Array.from({length:21},()=>({x:.65+offset,y:.6}));h[5]={x:.6+offset,y:.6};h[17]={x:.7+offset,y:.6};h[4]={x:.6+offset,y:.45};h[8]={x:.6+offset+dx,y:.45+dy};return h;}
function context(){const draws=[];return {draws,save(){},restore(){},drawImage(...args){draws.push(args);},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};}
test('pinch must begin near face; an open hand or distant pinch cannot activate',()=>{for(const h of [hand(.2,.2),hand(.02,.02,.7)]){const s=createFaceStretch(),ctx=context();s.update([h],face(),100,1000,600);s.draw(ctx,{},100);assert.equal(ctx.draws.length,0);}});
test('a near-face pinch activates and independent finger axes stretch the face',()=>{
 const s=createFaceStretch(),ctx=context();s.update([hand()],face(),100,1000,600);s.draw(ctx,{},100);const first=ctx.draws.at(-1);
 s.update([hand(.15,.02)],face(),200,1000,600);s.draw(ctx,{},200);const horizontal=ctx.draws.at(-1);assert.ok(horizontal[7]>first[7]);assert.equal(horizontal[8],first[8]);
 s.update([hand(.15,.15)],face(),300,1000,600);s.draw(ctx,{},300);assert.ok(ctx.draws.at(-1)[8]>horizontal[8]);
});
test('missing or invalid fingertips, missing face and stale tracking remove the effect',()=>{
 for(const loss of ['hands','tip','face','timeout']){const s=createFaceStretch(),ctx=context();s.update([hand()],face(),100,1000,600);s.draw(ctx,{},100);assert.equal(ctx.draws.length,1);
 if(loss==='hands')s.update([],face(),200,1000,600);if(loss==='tip'){const h=hand();h[8]=null;s.update([h],face(),200,1000,600);}if(loss==='face')s.update([hand()],null,200,1000,600);
 s.draw(ctx,{},1701);assert.equal(ctx.draws.length,1);
 }
});
test('reset clears the pinch and rejects invalid fingertip coordinates',()=>{const h=hand();h[4].x=NaN;assert.equal(pinchControl(h,1000,600),null);const s=createFaceStretch(),ctx=context();s.update([hand()],face(),100,1000,600);s.reset();s.draw(ctx,{},101);assert.equal(ctx.draws.length,0);});
test('two near-face pinches activate a shared face blob and require both hands to remain tracked',()=>{
 const s=createFaceStretch(),ctx=context();s.update([hand(.02,.02,-.15),hand(.02,.02,.15)],face(),100,1000,600);s.draw(ctx,{},100);assert.equal(ctx.draws.length,1);const first=ctx.draws[0];
 s.update([hand(.02,.02,-.25),hand(.02,.02,.25)],face(),200,1000,600);s.draw(ctx,{},200);assert.ok(ctx.draws.at(-1)[7]>first[7]);
 const before=ctx.draws.length;s.update([hand()],face(),300,1000,600);s.draw(ctx,{},1800);assert.equal(ctx.draws.length,before);
});

test('two open L hands define the visible face rectangle without a prior pinch',()=>{
 const left=hand(),right=hand();left[4]={x:.3,y:.7};left[8]={x:.25,y:.3};right[4]={x:.7,y:.7};right[8]={x:.75,y:.3};
 const stretch=createFaceStretch(),ctx=context();stretch.update([left,right],face(),100,1000,600);stretch.draw(ctx,{width:1000,height:600},100,7);
 assert.equal(ctx.draws.length,1);const draw=ctx.draws[0];assert.equal(draw[7],450);assert.equal(draw[8],240);assert.equal(draw[5]+draw[7]/2,500);assert.equal(draw[6]+draw[8]/2,300);assert.equal(ctx.lineWidth,7);
});

test('MediaPipe-style visibility zero does not discard valid hand or face detections',()=>{
 const left=hand(),right=hand();left[4]={x:.3,y:.7};left[8]={x:.25,y:.3};right[4]={x:.7,y:.7};right[8]={x:.75,y:.3};
 const raw=points=>points.map(p=>({...p,z:0,visibility:0}));
 const effect=createFaceStretch(),ctx=context();effect.update([raw(left),raw(right)],raw(face()),100,1000,600);effect.draw(ctx,{width:1000,height:600},100);
 assert.equal(effect.isActive(),true);assert.equal(ctx.draws.length,1);
 effect.update([raw(right),raw(left)],raw(face()),200,1000,600);effect.draw(ctx,{width:1000,height:600},200);assert.equal(ctx.draws.length,2);
 effect.update([],raw(face()),300,1000,600);effect.draw(ctx,{},1800);assert.equal(effect.isActive(),false);
});
test('latest detection is immediate, with bounded motion between detector frames',()=>{
 const s=createFaceStretch(),ctx=context();s.update([hand()],face(),100,1000,600);s.draw(ctx,{},100);const initial=ctx.draws.at(-1)[7];
 s.update([hand(.15,.02)],face(),200,1000,600);s.draw(ctx,{},200);const width=ctx.draws.at(-1)[7];assert.ok(width>initial);s.draw(ctx,{},216);assert.ok(ctx.draws.at(-1)[7]>=width);assert.ok(ctx.draws.at(-1)[7]<width+100);
});

test('brief losses hold the frame, reacquisition preserves the scale baseline, sustained loss removes it',()=>{
 const s=createFaceStretch(),ctx=context();s.update([hand()],face(),100,1000,600);s.draw(ctx,{},100);const initial=ctx.draws.at(-1)[7];
 s.update([hand(.15,.02)],face(),200,1000,600);s.draw(ctx,{},200);const wider=ctx.draws.at(-1)[7];assert.ok(wider>initial);
 s.update([],null,250,1000,600);s.draw(ctx,{},300);assert.equal(s.isActive(),true);
 s.update([hand(.15,.02)],face(),350,1000,600);s.draw(ctx,{},400);assert.ok(ctx.draws.at(-1)[7]>=wider);
 s.update([],null,450,1000,600);s.draw(ctx,{},1900);assert.equal(s.isActive(),false);
});

test('two-hand rectangle stays tied to the fingertips through dropouts, swaps and face size changes',()=>{
 function pair(dx,dy){const a=hand(),b=hand();a[4]={x:.5-dx/2,y:.5+dy/2};a[8]={x:.5-dx/2,y:.5-dy/2};b[4]={x:.5+dx/2,y:.5+dy/2};b[8]={x:.5+dx/2,y:.5-dy/2};return [a,b];}
 const s=createFaceStretch(),ctx=context(),source={width:1000,height:600};
 s.update(pair(.4,.4),face(),100,1000,600);s.draw(ctx,source,100);assert.equal(ctx.draws.at(-1)[7],400);
 s.update([],null,250,1000,600);s.draw(ctx,source,500);assert.equal(s.isActive(),true);
 const largerFace=face().map(p=>({...p,x:.5+(p.x-.5)*1.5}));
 s.update(pair(.65,.22).reverse(),largerFace,550,1000,600);s.draw(ctx,source,550);
 const drawn=ctx.draws.at(-1);assert.ok(Math.abs(drawn[5]-175)<1e-8);assert.ok(Math.abs(drawn[6]-234)<1e-8);assert.ok(Math.abs(drawn[7]-650)<1e-8);assert.ok(Math.abs(drawn[8]-132)<1e-8);
 // A new sample at the same fingertip positions must not recalibrate or drift.
 s.update(pair(.65,.22),largerFace,650,1000,600);s.draw(ctx,source,650);assert.deepEqual(ctx.draws.at(-1).slice(5),drawn.slice(5));
 s.update([],null,700,1000,600);s.draw(ctx,source,1700);assert.equal(s.isActive(),true);s.draw(ctx,source,2200);assert.equal(s.isActive(),false);
});

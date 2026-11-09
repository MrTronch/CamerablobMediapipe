import {test} from 'node:test';import assert from 'node:assert/strict';import {outsideStrips,invertOutside,createFrameTrail,drawFrameOutlines,clipOutsideFrames} from '../compositing.js';import {contrastPixels} from '../camera-filter.js';
test('outside strips cover each exterior pixel exactly once and leave the rectangle untouched',()=>{
 const visits=Array(80).fill(0);for(const [x,y,w,h]of outsideStrips(10,8,{x:2,y:2,w:5,h:3}))for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++)visits[row*10+col]++;
 for(let y=0;y<8;y++)for(let x=0;x<10;x++)assert.equal(visits[y*10+x],x>=2&&x<7&&y>=2&&y<5?0:1);
 const expanded=outsideStrips(10,8,{x:2,y:2,w:5,h:3},1);assert.equal(expanded.reduce((n,r)=>n+r[2]*r[3],0),80-7*5);
});
test('outside inversion uses an opaque white difference pass for RGB and grayscale, and skips inactive frames',()=>{
 const operations=[];let paths=[];const ctx={save(){},restore(){},beginPath(){paths=[];},rect(...r){paths.push(r);},fill(){operations.push({paths,mode:this.globalCompositeOperation,color:this.fillStyle,alpha:this.globalAlpha});}};
 invertOutside(ctx,10,8,null);assert.equal(operations.length,0);invertOutside(ctx,10,8,{x:2,y:2,w:5,h:3,opacity:1});assert.equal(operations.length,1);assert.equal(operations[0].paths.length,4);assert.ok(operations.every(o=>o.mode==='difference'&&o.color==='#fff'&&o.alpha===1));
});
test('eye contrast increases channel separation and can preserve a grayscale result',()=>{
 const color=contrastPixels(new Uint8ClampedArray([180,120,60,255]),1.6,false);assert.ok(color[0]>180);assert.ok(color[2]<60);assert.equal(color[3],255);
 const mono=contrastPixels(new Uint8ClampedArray([180,120,60,255]),1.6,true);assert.equal(mono[0],mono[1]);assert.equal(mono[1],mono[2]);
});

test('moving frame retains twenty-four frozen captures at their actual bounds and replaces oldest',()=>{
 const captures=[],draws=[],outlines=[];
 const trail=createFrameTrail(()=>({getContext:()=>({drawImage(...a){captures.push(a);}})}));
 const ctx={canvas:{width:960,height:540},beginPath(){},rect(){},clip(){},save(){},restore(){},drawImage(...a){draws.push(a);},strokeRect(...r){outlines.push(r);}};
 const source={},rect={x:100,y:100,w:100,h:80,source:{x:0,y:0,w:100,h:80}};
 let copies=trail.draw(ctx,source,rect,0);assert.equal(captures.length,1);
 trail.draw(ctx,source,{...rect,x:110},99);assert.equal(captures.length,1);
 for(let i=1;i<=26;i++)copies=trail.draw(ctx,source,{...rect,x:100+i*10,h:80+i},i*100+100);
 assert.equal(copies.length,25);assert.equal(copies[0].x,130);assert.equal(copies[0].h,83);assert.equal(copies[23].x,360);
 drawFrameOutlines(ctx,copies,1.5);assert.equal(ctx.strokeStyle,'#23f415');assert.equal(outlines.length,25);
 assert.deepEqual(trail.draw(ctx,source,null,2000),[]);copies=trail.draw(ctx,source,rect,2100);assert.equal(copies.length,2);
 copies=trail.draw(ctx,source,rect,2200,0,2200,0);assert.equal(copies.length,1);
 for(let i=1;i<=50;i++)copies=trail.draw(ctx,source,{...rect,x:100+i*10},2200+i*100,0,i,48);assert.equal(copies.length,49);
 copies=trail.draw(ctx,source,rect,8000,0,8000,3);assert.equal(copies.length,4);
});

test('graphics masks exclude both the live frame and historical copies',()=>{
 let mask=Array(80).fill(true),path=[];
 const ctx={beginPath(){path=[];},rect(...r){path.push(r);},clip(){mask=mask.map((v,i)=>v&&path.some(([x,y,w,h])=>i%10>=x&&i%10<x+w&&Math.floor(i/10)>=y&&Math.floor(i/10)<y+h));}};
 clipOutsideFrames(ctx,10,8,[{x:2,y:2,w:4,h:3},{x:5,y:3,w:3,h:3}]);
 for(let y=0;y<8;y++)for(let x=0;x<10;x++)assert.equal(mask[y*10+x],!((x>=2&&x<6&&y>=2&&y<5)||(x>=5&&x<8&&y>=3&&y<6)));
});

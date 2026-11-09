import {createFaceLens} from './face-lens.js';
// Four non-overlapping strips keep the rectangle interior untouched.
export function outsideStrips(width,height,rect,padding=0){
 const clamp=(v,max)=>Math.max(0,Math.min(max,v));
 const left=clamp(rect.x-padding,width),top=clamp(rect.y-padding,height),right=clamp(rect.x+rect.w+padding,width),bottom=clamp(rect.y+rect.h+padding,height);
 return [[0,0,width,top],[0,bottom,width,height-bottom],[0,top,left,bottom-top],[right,top,width-right,bottom-top]].filter(r=>r[2]>0&&r[3]>0);
}
export function invertOutside(ctx,width,height,rect,stroke=0){
 if(!rect)return;
 ctx.save();ctx.globalAlpha=rect.opacity??1;ctx.globalCompositeOperation='difference';ctx.fillStyle='#fff';
 ctx.beginPath();for(const r of outsideStrips(width,height,rect,stroke/2))ctx.rect(...r);ctx.fill();
 ctx.restore();
}

// Frozen samples follow actual hand movement, never a synthetic offset.
export function createFrameTrail(makeCanvas=()=>document.createElement('canvas')){
 let samples=[],lastSample=-Infinity;const lens=createFaceLens(makeCanvas);
 function reset(){samples=[];lastSample=-Infinity;}
 function draw(ctx,source,rect,now,strength=0,revision=now,count=24){
  if(!rect?.source){reset();return [];}
  const limit=Math.max(0,Math.min(48,Math.round(count)));
  if(samples.length>limit)samples=samples.slice(-limit);
  if(limit===0)samples=[];
  const live=strength>0?lens.image(source,rect.source,strength,revision):null;
  const previous=samples.at(-1);
  const moved=!previous||['x','y','w','h'].some(k=>Math.abs(previous[k]-rect[k])>1.5);
  if(limit>0&&moved&&now-lastSample>=100){
   const patch=makeCanvas(),scale=Math.min(1,480/Math.max(rect.source.w,rect.source.h));
   patch.width=Math.max(1,Math.round(rect.source.w*scale));patch.height=Math.max(1,Math.round(rect.source.h*scale));
   const c=rect.source;const pc=patch.getContext('2d');if(live)pc.drawImage(live,0,0,patch.width,patch.height);else pc.drawImage(source,c.x,c.y,c.w,c.h,0,0,patch.width,patch.height);
   samples.push({x:rect.x,y:rect.y,w:rect.w,h:rect.h,patch});if(samples.length>limit)samples.shift();lastSample=now;
  }
  ctx.save();ctx.globalAlpha=rect.opacity??1;
  for(const s of samples)ctx.drawImage(s.patch,s.x,s.y,s.w,s.h);
  const c=rect.source;if(live)ctx.drawImage(live,rect.x,rect.y,rect.w,rect.h);else ctx.drawImage(source,c.x,c.y,c.w,c.h,rect.x,rect.y,rect.w,rect.h);ctx.restore();
  return [...samples,rect];
 }
 return {draw,reset};
}
// Intersect exterior masks so graphics stay behind every opaque hand capture.
export function clipOutsideFrames(ctx,width,height,rectangles){
 for(const r of rectangles){ctx.beginPath();for(const strip of outsideStrips(width,height,r))ctx.rect(...strip);ctx.clip();}
}
export function drawFrameOutlines(ctx,rectangles,stroke=1.5){
 ctx.save();ctx.strokeStyle='#23f415';ctx.lineWidth=stroke;
 rectangles.forEach((r,i)=>{
  ctx.save();clipOutsideFrames(ctx,ctx.canvas.width,ctx.canvas.height,rectangles.slice(i+1));
  ctx.globalAlpha=r.opacity??1;ctx.strokeRect(r.x,r.y,r.w,r.h);ctx.restore();
 });
 ctx.restore();
}

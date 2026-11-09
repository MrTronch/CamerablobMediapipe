import {monochromePixels} from './camera-filter.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const EYE_DURATION=10000;
export function eyeGeometry(face,width,height){
 if(!face?.[263]||!face[10]||!face[9])return null;
 const a=face[33],b=face[133],upper=face[159]??a,lower=face[145]??b;
 const center={x:(a.x+b.x+upper.x+lower.x)/4,y:(a.y+b.y+upper.y+lower.y)/4};
 const eyeWidth=Math.hypot((a.x-b.x)*width,(a.y-b.y)*height);
 if(eyeWidth<2)return null;
 const left=face[33].x<face[263].x?face[33]:face[263],right=left===face[33]?face[263]:face[33];
 const sw=Math.min(width,eyeWidth*1.4),sh=Math.min(height,Math.max(eyeWidth*.55,Math.abs(upper.y-lower.y)*height*1.7));
 return {sx:clamp(center.x*width-sw/2,0,width-sw),sy:clamp(center.y*height-sh/2,0,height-sh),sw,sh,
 x:(face[10].x*.35+face[9].x*.65)*width,y:(face[10].y*.35+face[9].y*.65)*height,
 width:sw,height:sh,angle:Math.atan2((right.y-left.y)*height,(right.x-left.x)*width)};
}
export function mouthRatio(face){
 if(!face?.[263]||!face[14]||!face[13]||!face[33])return 0;
 return Math.hypot(face[13].x-face[14].x,face[13].y-face[14].y)/Math.max(.001,Math.hypot(face[33].x-face[263].x,face[33].y-face[263].y));
}
export class MouthTrigger{
 constructor(){this.reset();}
 reset(){this.open=false;this.until=-Infinity;}
 update(ratio,now,enabled=true){
  if(ratio<.12)this.open=false;
  if(ratio>.2&&!this.open&&enabled){this.open=true;if(now>=this.until){this.until=now+EYE_DURATION;return true;}}
  return false;
 }
}
export function createThirdEye(makeCanvas=()=>document.createElement('canvas')){
 const trigger=new MouthTrigger();
 let until=0,geometry=null,faceAt=0,lastStamp=-Infinity,trail=[],trackedPatch=null,mirror=false,lastCapturedPatch=null,filterSupport=null,grayCache=new WeakMap();
 function reset(){trackedPatch?.close?.();trackedPatch=null;lastCapturedPatch=null;grayCache=new WeakMap();trigger.reset();until=0;geometry=null;faceAt=0;lastStamp=-Infinity;trail=[];}
 function update(face,now,width,height,enabled=true,patch=null,mirrored=false){
  trackedPatch?.close?.();trackedPatch=patch;mirror=mirrored;
  if(!face){geometry=null;trigger.open=false;return;}
  geometry=eyeGeometry(face,width,height);faceAt=now;
  if(trigger.update(mouthRatio(face),now,enabled)&&geometry){until=now+EYE_DURATION;lastStamp=-Infinity;}
 }
 function draw(ctx,source,now,monochrome=false){
  trail=trail.filter(stamp=>now-stamp.born<EYE_DURATION);
  if(now>=until&&!trail.length)return;
  if(now<until&&geometry&&now-faceAt<650&&now-lastStamp>=24){
   const previous=trail.at(-1);
   const reused=trackedPatch&&trackedPatch===lastCapturedPatch&&previous;
   const patch=reused?previous.patch:makeCanvas();
   if(!reused){patch.width=128;patch.height=90;
   const pc=patch.getContext('2d');
   if(trackedPatch){pc.save();if(mirror){pc.translate(128,0);pc.scale(-1,1);}pc.drawImage(trackedPatch,0,0,128,90);pc.restore();}
   else pc.drawImage(source,geometry.sx,geometry.sy,geometry.sw,geometry.sh,0,0,128,90);
   }
   lastCapturedPatch=trackedPatch;trail.push({patch,...geometry,born:now});lastStamp=now;
   if(trail.length>420)trail.shift();
  }
  if(filterSupport===null)filterSupport=typeof ctx.filter==='string';
  ctx.save();ctx.globalAlpha=1;if(filterSupport)ctx.filter=monochrome?'grayscale(1)':'none';
  for(const stamp of trail){
   // Each opaque stamp stays at its original frame coordinates and size.
   ctx.save();ctx.translate(stamp.x,stamp.y);
   let image=stamp.patch;
   if(monochrome&&!filterSupport){
    if(!grayCache.has(image)){const copy=makeCanvas();copy.width=image.width;copy.height=image.height;const cc=copy.getContext('2d');cc.drawImage(image,0,0);if(cc.getImageData){const pixels=cc.getImageData(0,0,copy.width,copy.height);monochromePixels(pixels.data);cc.putImageData(pixels,0,0);}grayCache.set(image,copy);}
    image=grayCache.get(image);
   }
   ctx.drawImage(image,-stamp.width/2,-stamp.height/2,stamp.width,stamp.height);
   ctx.restore();
  }
  ctx.restore();
 }
 return {update,draw,reset,isMouthOpen(now){return !!geometry&&now-faceAt<650&&trigger.open;}};
}

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Hand/face landmark lists are already gated by their detectors. MediaPipe
// emits visibility:0 when that optional protobuf value is not populated.
const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
export function pinchControl(hand,width,height){
 if(![0,4,8,5,17].every(i=>valid(hand?.[i])))return null;
 const thumb={x:hand[4].x*width,y:hand[4].y*height},index={x:hand[8].x*width,y:hand[8].y*height};
 const palm=Math.max(Math.hypot((hand[5].x-hand[17].x)*width,(hand[5].y-hand[17].y)*height),Math.hypot((hand[0].x-hand[5].x)*width,(hand[0].y-hand[5].y)*height)*.55);
 if(palm<2)return null;
 return {kind:'single',thumb,index,palm,wrist:{x:hand[0].x*width,y:hand[0].y*height},x:(thumb.x+index.x)/2,y:(thumb.y+index.y)/2,dx:Math.abs(index.x-thumb.x),dy:Math.abs(index.y-thumb.y),pinched:Math.hypot(index.x-thumb.x,index.y-thumb.y)<palm*.95};
}
export function faceRegion(face,width,height){
 if(![234,454,10,152].every(i=>valid(face?.[i])))return null;
 const xs=[234,454].map(i=>face[i].x*width),ys=[10,152].map(i=>face[i].y*height);
 const x=clamp(Math.min(...xs),0,width),y=clamp(Math.min(...ys),0,height);
 const w=Math.min(width-x,Math.abs(xs[1]-xs[0])*1.1),h=Math.min(height-y,Math.abs(ys[1]-ys[0])*1.05);
 if(w<10||h<10)return null;return {x,y,w,h,cx:x+w/2,cy:y+h/2};
}
export const FRAME_HOLD_MS=1200;
export const FRAME_RELEASE_MS=300;
export function createFaceStretch(){
 let active=false,mode=null,base=null,control=null,region=null,faceSeen=-Infinity,updated=-Infinity;
 let display=null,crop1=null,previous=null,velocity={x:0,y:0,dx:0,dy:0};
 function reset(){active=false;mode=base=control=region=display=crop1=null;faceSeen=updated=-Infinity;previous=null;velocity={x:0,y:0,dx:0,dy:0};}
 function update(hands,face,now,width,height){
  const detected=faceRegion(face,width,height);
  if(detected){region=detected;faceSeen=now;}
  const box=region;
  if(!box||(!active&&!detected))return;
  const singles=hands.map(h=>pinchControl(h,width,height)).filter(Boolean);
  let pair=null;
  if(singles.length>=2){
   const [a,b]=singles;
   const left=(Math.min(a.index.x,b.index.x)+Math.min(a.thumb.x,b.thumb.x))/2,right=(Math.max(a.index.x,b.index.x)+Math.max(a.thumb.x,b.thumb.x))/2;
   const top=(a.index.y+b.index.y)/2,bottom=(a.thumb.y+b.thumb.y)/2;
   const dx=right-left,dy=Math.abs(bottom-top);
   pair={kind:'pair',x:(left+right)/2,y:(top+bottom)/2,dx,dy,
    thumb:{x:(a.x<b.x?a:b).thumb.x,y:(a.thumb.y+b.thumb.y)/2},
    index:{x:(a.x<b.x?b:a).index.x,y:(a.index.y+b.index.y)/2},
    framed:dx>box.w*.3&&dy>box.h*.12&&(a.index.y+b.index.y)<(a.thumb.y+b.thumb.y)};
  }
  let next;
  if(active){
   // A two-hand session never falls back to a one-hand gesture during occlusion.
   // Its original scale reference survives every short loss and reacquisition.
   next=mode==='pair'?pair:singles.sort((a,b)=>Math.hypot(a.x-control.x,a.y-control.y)-Math.hypot(b.x-control.x,b.y-control.y))[0];
   if(mode==='single'&&pair?.framed){
    // Explicit promotion only once; start from the already displayed rectangle.
    next=pair;mode='pair';base.dx=pair.dx;base.dy=pair.dy;base.refX=Math.max(pair.dx,box.w*.2);base.refY=Math.max(pair.dy,box.h*.15);
    if(display){base.w=display.w;base.h=display.h;}
   }
   if(!next||now-faceSeen>FRAME_HOLD_MS)return;
  }else{
   const near=p=>p&&p.x>box.x-box.w*.9&&p.x<box.x+box.w*1.9&&p.y>box.y-box.h*.8&&p.y<box.y+box.h*1.8;
   next=pair&&(pair.framed||singles.every(p=>p.pinched))&&near(pair)?pair:singles.find(p=>p.pinched&&near(p));
   if(!next)return;
   active=true;mode=next.kind;
   base={dx:next.dx,dy:next.dy,w:box.w*1.3,h:box.h*1.3,refX:Math.max(next.dx,box.w*.2),refY:Math.max(next.dy,box.h*.15)};
  }
  if(previous&&previous.kind===next.kind&&now>updated){const dt=Math.max(16,now-updated);for(const key of ['x','y','dx','dy'])velocity[key]=(next[key]-previous[key])/dt;}
  else velocity={x:0,y:0,dx:0,dy:0};
  control=next;previous={...next};updated=now;
 }
 function draw(ctx,source,now,stroke=1.5){
  if(!active)return;
  const missing=now-updated;
  if(missing>=FRAME_HOLD_MS+FRAME_RELEASE_MS){reset();return;}
  // At every detector result the rectangle exactly matches the fingertips.
  // Between results, short bounded prediction fills the display frames without
  // introducing a delayed smoothing buffer. Freeze during a tracking dropout.
  const horizon=mode==='pair'?Math.min(missing,45):0;
  const current={...control};
  for(const key of ['x','y','dx','dy'])current[key]+=clamp(velocity[key]*horizon,-region.w*.07,region.w*.07);
  const sx=clamp(1+(current.dx-base.dx)/base.refX,.25,2.8),sy=clamp(1+(current.dy-base.dy)/base.refY,.25,2.8);
  const w=mode==='pair'?Math.max(8,current.dx):Math.min(base.w*sx,(source.width||base.w*3)*1.5),h=mode==='pair'?Math.max(8,current.dy):Math.min(base.h*sy,(source.height||base.h*3)*1.5);
  const center=mode==='pair'?current:{x:region.cx,y:region.cy};
  const target={x:center.x-w/2,y:center.y-h/2,w,h};
  // Direct tracking: no temporal lag or extrapolation. Keep only dropout hold.
  display={...target};crop1={x:region.x,y:region.y,w:region.w,h:region.h};
  ctx.save();ctx.globalAlpha=missing<=FRAME_HOLD_MS?1:clamp(1-(missing-FRAME_HOLD_MS)/FRAME_RELEASE_MS,0,1);
  ctx.drawImage(source,crop1.x,crop1.y,crop1.w,crop1.h,display.x,display.y,display.w,display.h);
  ctx.strokeStyle='#23f415';ctx.lineWidth=stroke;ctx.strokeRect(display.x,display.y,display.w,display.h);ctx.restore();
 }
 return {update,draw,reset,isActive(){return active;},scale(){return display&&base?{x:display.w/base.w,y:display.h/base.h}:{x:1,y:1};}};
}

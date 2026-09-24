export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function isPeace(h){
  if(!h||h.length<21)return false;
  const extended=(tip,pip,mcp)=>distance(h[tip],h[0])>distance(h[pip],h[0])*1.12&&distance(h[tip],h[mcp])>distance(h[pip],h[mcp])*1.3;
  return extended(8,6,5)&&extended(12,10,9)&&!extended(16,14,13)&&!extended(20,18,17)&&distance(h[8],h[12])>distance(h[5],h[17])*.22;
}
export function growth(age,life,maxZoom){const t=clamp(age/life,0,1);return {radius:8+60*Math.pow(t,1.15),zoom:1+(maxZoom-1)*Math.pow(t,.8),alpha:age<life?Math.min(1,age*5):0};}
export function crop(x,y,r,zoom,width,height){const side=Math.min(2*r/zoom,width,height);return {x:clamp(x-side/2,0,width-side),y:clamp(y-side/2,0,height-side),side};}

export function shouldInvert(blob,zones){return blob.kind!=='face'&&zones.some(h=>h.peace&&blob.x>=h.left&&blob.x<=h.right&&blob.y>=h.top&&blob.y<=h.bottom);}

export function randomLife(maximum,random=Math.random){const max=clamp(maximum,2,6);return Math.max(2,max-3)+random()*(max-Math.max(2,max-3));}
export function hasSpace(point,blobs,now,width,height){const scale=Math.min(width,height);return blobs.every(b=>{if(point.anchor&&point.anchor===b.anchor)return false;if(point.kind==='face'&&b.kind==='face')return Math.hypot((point.x-b.x)*width,(point.y-b.y)*height)>18*scale/480;const age=(now-b.born)/1000;const radius=growth(age,b.life,3).radius;const gap=Math.max(42,radius*.9+12)*scale/480;return Math.hypot((point.x-b.x)*width,(point.y-b.y)*height)>gap;});}
// Ratio of wrist separation to the shoulder width plus both arm bone lengths.
export function armOpenness(world){const ids=[11,12,13,14,15,16];if(!world||ids.some(i=>!world[i]||(world[i].visibility??0)<.6))return null;const d=(a,b)=>Math.hypot(world[a].x-world[b].x,world[a].y-world[b].y,world[a].z-world[b].z);const span=d(11,12)+d(11,13)+d(13,15)+d(12,14)+d(14,16);return span>.01?clamp(d(15,16)/span,0,1):null;}

export function nextShape(state,now,random=Math.random){if(now<state.until)return state;return {shape:state.shape==='circle'?'square':'circle',until:now+5000+random()*3000};}
export function followFace(blob,anchors,delta){const target=anchors.find(p=>p.anchor===blob.anchor);if(!target)return;const blend=1-Math.exp(-Math.min(delta,100)/65);blob.x+=(target.x-blob.x)*blend;blob.y+=(target.y-blob.y)*blend;}

// Body-relative audio mapping. No screen-edge pitch normalization.
export function bodyAudio(point,image,world,aspect=4/3){
 const ids=[11,12,13,14,15,16];
 if(!image||!world||ids.some(i=>!image[i]||!world[i]||(image[i].visibility??0)<.6))return null;
 const d=(a,b)=>Math.hypot(world[a].x-world[b].x,world[a].y-world[b].y,world[a].z-world[b].z);
 const arm=(d(11,13)+d(13,15)+d(12,14)+d(14,16))/2;
 const shoulder=d(11,12),screenShoulder=Math.hypot((image[11].x-image[12].x)*aspect,image[11].y-image[12].y);
 if(arm<.05||screenShoulder<.03||shoulder<.05)return null;
 const scale=shoulder/screenShoulder,span=2*arm+shoulder;
 const center={x:(image[11].x+image[12].x)/2,y:(image[11].y+image[12].y)/2};
 const x=clamp((point.x-center.x)*aspect*scale/(span/2),-1,1);
 const y=clamp((center.y-point.y)*scale/arm,-1,1);
 const anchor=point.kind==='hand'?[15,16].sort((a,b)=>Math.hypot(image[a].x-point.x,image[a].y-point.y)-Math.hypot(image[b].x-point.x,image[b].y-point.y))[0]:point.kind==='face'?0:point.poseIndex??null;
 const z=anchor!==null&&world[anchor]?clamp(((world[11].z+world[12].z)/2-world[anchor].z)/arm,-1,1):0;
 // Horizontal sweep retains the original 0.1–5 range; height and depth add octaves.
 return {rate:clamp((.1+(x+1)*2.45)*2**(y*.8+z*.7),.1,5),mouthRate:clamp(1+x*.2+y*.15+z*.15,.65,1.5),reverb:clamp((y+1)*1.75,0,3.5),pan:x};
}

export function blobZoom(blob,maximum){const amount=clamp(maximum,1.25,4);const factor=blob.part==='finger'?.3:blob.part==='secondary-face'?.45:blob.part==='body'?.65:1;return 1+(amount-1)*factor;}
export function spawnWeight(point){return point.part==='wrist'?8:point.part==='finger'?.3:point.part==='primary-face'?4:point.part==='secondary-face'?2:point.part==='body'?3:1;}

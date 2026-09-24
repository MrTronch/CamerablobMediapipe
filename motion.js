import {MOTION} from './config.js';
const identity=[1,0,0,0,1,0];
const median=a=>{a.sort((x,y)=>x-y);return a[Math.floor(a.length/2)]??0;};
function solve(rows,values){const m=rows.map((r,i)=>[...r,values[i]]);for(let i=0;i<3;i++){let pivot=i;for(let j=i+1;j<3;j++)if(Math.abs(m[j][i])>Math.abs(m[pivot][i]))pivot=j;[m[i],m[pivot]]=[m[pivot],m[i]];if(Math.abs(m[i][i])<1e-7)return null;const scale=m[i][i];for(let k=i;k<4;k++)m[i][k]/=scale;for(let j=0;j<3;j++)if(j!==i){const scale=m[j][i];for(let k=i;k<4;k++)m[j][k]-=scale*m[i][k];}}return m.map(r=>r[3]);}
function affine(points){const rows=points.map(p=>[p.x,p.y,1]),x=solve(rows,points.map(p=>p.u)),y=solve(rows,points.map(p=>p.v));return x&&y?[...x,...y]:null;}
function error(t,p){return Math.hypot(t[0]*p.x+t[1]*p.y+t[2]-p.u,t[3]*p.x+t[4]*p.y+t[5]-p.v);}
export function detectGlobalMotion(previous,current,w,h,c=MOTION){
 const matches=[],r=c.PATCH_RADIUS,margin=c.SEARCH_RADIUS+r+1;
 // One textured feature per grid cell; bounded work and spatial coverage.
 for(let y=margin;y<h-margin&&matches.length<c.MAX_TRACKING_POINTS;y+=6)for(let x=margin;x<w-margin&&matches.length<c.MAX_TRACKING_POINTS;x+=7){
  let texture=0;for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++)texture+=Math.abs(previous[(y+j)*w+x+i]-previous[y*w+x]);
  if(texture/((2*r+1)**2)<c.FEATURE_TEXTURE)continue;
  let best=Infinity,bx=x,by=y;
  for(let dy=-c.SEARCH_RADIUS;dy<=c.SEARCH_RADIUS;dy++)for(let dx=-c.SEARCH_RADIUS;dx<=c.SEARCH_RADIUS;dx++){
   let cost=0;for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++)cost+=Math.abs(previous[(y+j)*w+x+i]-current[(y+j+dy)*w+x+i+dx]);
   cost/=(2*r+1)**2;if(cost<best){best=cost;bx=x+dx;by=y+dy;}
  }
  if(best<c.MATCH_ERROR)matches.push({x,y,u:bx,v:by});
 }
 if(matches.length<6)return {transform:identity,reliable:false,magnitude:0};
 const dx=median(matches.map(p=>p.u-p.x)),dy=median(matches.map(p=>p.v-p.y));let best=[1,0,dx,0,1,dy],inliers=matches.filter(p=>error(best,p)<c.INLIER_DISTANCE);
 // Deterministic RANSAC: ignore independently moving foreground features.
 let seed=17;const pick=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%matches.length;};
 for(let k=0;k<72;k++){const t=affine([matches[pick()],matches[pick()],matches[pick()]]);if(!t||Math.abs(t[0]-1)>.25||Math.abs(t[4]-1)>.25||Math.abs(t[1])>.3||Math.abs(t[3])>.3)continue;const selected=matches.filter(p=>error(t,p)<c.INLIER_DISTANCE);if(selected.length>inliers.length||(selected.length===inliers.length&&selected.reduce((sum,p)=>sum+error(t,p),0)<inliers.reduce((sum,p)=>sum+error(best,p),0))){best=t;inliers=selected;}}
 const cells=new Set(inliers.map(p=>(p.x<w/2?0:1)+(p.y<h/2?0:2)));
 const reliable=inliers.length>=6&&inliers.length/matches.length>=c.GLOBAL_SUPPORT&&cells.size>=3;
 let magnitude=0;for(const [x,y]of [[w*.2,h*.2],[w*.8,h*.2],[w*.2,h*.8],[w*.8,h*.8]])magnitude+=Math.hypot(best[0]*x+best[1]*y+best[2]-x,best[3]*x+best[4]*y+best[5]-y)/4;
 return {transform:reliable?best:identity,reliable,magnitude:reliable?magnitude:0};
}
export class MotionDetector{
 constructor(config={}){this.c={...MOTION,...config};this.reset();}
 reset(){this.previous=null;this.current=new Float32Array(this.c.WIDTH*this.c.HEIGHT);this.remaining=this.c.STABILIZATION_FRAMES;this.blocked=true;}
 update(rgba){const c=this.c,w=c.WIDTH,h=c.HEIGHT,current=this.current;
  for(let i=0;i<current.length;i++)current[i]=rgba[i*4]*.299+rgba[i*4+1]*.587+rgba[i*4+2]*.114;
  if(!this.previous){this.previous=current;this.current=new Float32Array(w*h);return [];}
  const global=detectGlobalMotion(this.previous,current,w,h,c),t=global.transform;
  const residual=[],offsets=[];
  // Warp previous coordinates into the current image. Newly exposed edges are ignored.
  for(let y=4;y<h-4;y+=4)for(let x=4;x<w-4;x+=4){const u=Math.round(t[0]*x+t[1]*y+t[2]),v=Math.round(t[3]*x+t[4]*y+t[5]);if(u<3||v<3||u>=w-3||v>=h-3)continue;let diff=current[v*w+u]-this.previous[y*w+x];
   // Tolerate one analysis pixel of warp quantization, only for coherent camera motion.
   if(global.reliable&&global.magnitude>c.GLOBAL_MOTION_THRESHOLD){for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const candidate=current[(v+dy)*w+u+dx]-this.previous[y*w+x];if(Math.abs(candidate)<Math.abs(diff))diff=candidate;}}offsets.push(diff);residual.push({x:u/w,y:v/h,diff});}
  const brightness=median(offsets),active=residual.filter(p=>Math.abs(p.diff-brightness)>c.RESIDUAL_THRESHOLD);
  const abrupt=global.magnitude>c.CAMERA_SHAKE_THRESHOLD||active.length/Math.max(1,residual.length)>c.BROAD_CHANGE_FRACTION;
  if(abrupt)this.remaining=c.STABILIZATION_FRAMES;
  this.blocked=this.remaining>0;if(this.remaining>0&&!abrupt)this.remaining--;
  const old=this.previous;this.previous=current;this.current=old;
  this.global=global;
  if(this.blocked)return [];
  // On a coherent pan, patch mismatch around edges must not become background blobs.
  const moving=global.reliable&&global.magnitude>c.GLOBAL_MOTION_THRESHOLD;
  return active.filter(p=>{let neighbors=0;for(const q of active)if(Math.abs(p.x-q.x)<.08&&Math.abs(p.y-q.y)<.09)neighbors++;return neighbors>=(moving?4:2);}).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff)).slice(0,c.MAX_BLOBS);
 }
}

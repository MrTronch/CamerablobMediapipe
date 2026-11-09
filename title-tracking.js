import {createWanderer} from './reactive.js';
// Magnified tracking windows over the actual heading, like the camera's blobs.
export function createTitleTracking(title,sampleAudio){
 const host=title.parentElement,canvas=document.createElement('canvas');
 canvas.className='title-tracking';canvas.setAttribute('aria-hidden','true');host.append(canvas);
 const ctx=canvas.getContext('2d'),source=document.createElement('canvas'),sc=source.getContext('2d');
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const walkers=Array.from({length:6},()=>createWanderer());
 const sizes=Array.from({length:6},()=>createWanderer());
 let elapsed=0;
 let width=0,height=0,last=0,phase=0,raf,dirty=true,dpr=1;
 function snapshot(){
  const box=host.getBoundingClientRect();width=box.width;height=box.height;dpr=Math.min(2,devicePixelRatio||1);
  canvas.width=source.width=Math.ceil(width*dpr);canvas.height=source.height=Math.ceil(height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);sc.setTransform(dpr,0,0,dpr,0,0);sc.clearRect(0,0,width,height);
  const walker=document.createTreeWalker(title,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())){
   const style=getComputedStyle(node.parentElement),size=parseFloat(style.fontSize);
   sc.font=`${style.fontWeight} ${size}px ${style.fontFamily}`;sc.fillStyle=style.color;sc.textBaseline='alphabetic';
   for(let i=0;i<node.textContent.length;i++){
    const char=node.textContent[i];if(!char.trim())continue;
    const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);
    const rect=range.getBoundingClientRect();
    sc.fillText(char.toUpperCase(),rect.left-box.left,rect.top-box.top+(rect.height-size)/2+size*.82);
   }
  }
  dirty=false;
 }
 const observer=new ResizeObserver(()=>{dirty=true;});observer.observe(host);
 document.fonts.ready.then(()=>{dirty=true;});
 function draw(now){
  raf=requestAnimationFrame(draw);if(document.hidden||now-last<30)return;
  const dt=Math.min(100,now-last||64);last=now;if(dirty)snapshot();if(!width||!height)return;
  const enabled=document.getElementById('visualMotion')?.checked!==false;
  const level=sampleAudio().level;
  if(enabled){const speed=(reduce.matches?.45:1)*(1+level*2);phase+=dt*.00095*speed;elapsed+=dt*speed;}
  ctx.clearRect(0,0,width,height);
  const side=Math.min(58,Math.max(28,height*.72));
  const positions=walkers.map((walk,i)=>{
   const p=walk(elapsed),growth=sizes[i](elapsed*.8),s=10+side*Math.pow(growth.x,1.5);
   return {x:s/2+p.x*Math.max(0,width-s),y:s/2+p.y*Math.max(0,height-s),side:s,zoom:1.1+3.2*Math.pow(growth.x,1.3)+level*.6};
  });
  ctx.strokeStyle='#d1d1d18c';ctx.lineWidth=2.8;ctx.beginPath();
  positions.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
  positions.forEach((p,i)=>{
   const s=p.side,zoom=p.zoom,from=s/zoom,x=p.x-s/2,y=p.y-s/2;
   ctx.fillStyle='#0f0f0fe8';ctx.fillRect(x,y,s,s);
   ctx.drawImage(source,(p.x-from/2)*dpr,(p.y-from/2)*dpr,from*dpr,from*dpr,x,y,s,s);
   ctx.strokeRect(x,y,s,s);ctx.fillStyle='#d1d1d1';ctx.fillRect(p.x-1,p.y-1,2,2);
   ctx.font='6px Arial';ctx.fillText((.38+i*.23+Math.sin(phase+i)*.04).toFixed(3),x+3,y+s-3);
  });
 }
 raf=requestAnimationFrame(draw);
 window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);});
 window.addEventListener('pageshow',event=>{if(event.persisted){dirty=true;raf=requestAnimationFrame(draw);}});
}

import {createFieldRenderer} from './atmosphere-field.js';
// Background rendering is isolated from camera/UI work when OffscreenCanvas exists.
export function createAtmosphere(canvas,sampleAudio=()=>({level:0,bass:0,treble:0}),mouthOpen=()=>false){
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 let targets=[],worker=null,render=null,pending=false,last=0,raf;
 if(canvas.transferControlToOffscreen&&typeof Worker!=='undefined'){
  try{
   worker=new Worker(new URL('./atmosphere-worker.js',import.meta.url),{type:'module'});
   const offscreen=canvas.transferControlToOffscreen();worker.postMessage({type:'init',canvas:offscreen},[offscreen]);
   worker.onmessage=()=>{pending=false;};
   worker.onerror=()=>{worker.terminate();canvas.style.opacity='0';};
  }catch{worker?.terminate();worker=null;}
 }
 if(!worker)render=createFieldRenderer(canvas);
 function draw(now){
  raf=requestAnimationFrame(draw);if(document.hidden||pending||now-last<100)return;
  last=now;const data={now,audio:sampleAudio(),targets,motion:document.getElementById('visualMotion')?.checked===false?0:reduce.matches?.45:1,open:mouthOpen()};
  if(worker){pending=true;worker.postMessage(data);}else render(data);
 }
 raf=requestAnimationFrame(draw);
 window.addEventListener('pagehide',event=>{cancelAnimationFrame(raf);if(!event.persisted)worker?.terminate();});
 window.addEventListener('pageshow',event=>{if(event.persisted){last=0;raf=requestAnimationFrame(draw);}});
 return {update(blobs){targets=blobs;}};
}

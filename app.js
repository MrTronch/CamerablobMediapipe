import {DEBUG,MOTION} from './config.js';
import {MotionDetector} from './motion.js';
import {setupPresentation,mirrorForCamera} from './presentation.js';
import {clamp,isPeace,growth,crop,shouldInvert,randomLife,hasSpace,armOpenness,nextShape,followFace,bodyAudio,blobZoom,spawnWeight} from './logic.js';
import {Sampler} from './audio.js';
const $=id=>document.getElementById(id),video=$('video'),canvas=$('view'),ctx=canvas.getContext('2d'),sampler=new Sampler();
const source=document.createElement('canvas'),sc=source.getContext('2d');
const motion=document.createElement('canvas');motion.width=MOTION.WIDTH;motion.height=MOTION.HEIGHT;const mc=motion.getContext('2d',{willReadFrequently:true});
let stream,worker,ready=false,running=false,busy=false,starting=false,session=0,facing='user',blobs=[],points=[],handZones=[],lastInfer=0,lastMotion=0,lastSpawn=0,lastSound=0,lastMouth=0,lastResult=0,lastFrame=0,fps=0,handCount=0,faceCount=0,inferenceInterval=100;
let changingCamera=false,trackerTimer;
const detector=new MotionDetector();
let motionPoints=[];
function resetMotionDetection(){detector.reset();motionPoints=[];lastMotion=0;}
let bodyImage=null,bodyWorld=null,bodyAt=0;
function soundParameters(p){const raw={...p,x:p.soundX??($('mirror').checked?1-p.x:p.x),y:p.soundY??p.y};return performance.now()-bodyAt<700?bodyAudio(raw,bodyImage,bodyWorld,video.videoWidth/video.videoHeight):null;}
let autoShape={shape:'circle',until:0};
$('shape').onchange=()=>{autoShape={shape:'circle',until:performance.now()+5000+Math.random()*3000};};
const status=(message,important=false)=>{$('status').textContent=message;$('status').hidden=!DEBUG&&!important;};
setupPresentation({stage:document.querySelector('.stage'),button:$('fullscreen'),exitButton:$('exitFullscreen'),onResize:()=>resetMotionDetection(),onError:message=>status(message,true)});
const mobileMenu=matchMedia('(max-width: 600px)');
function setMenu(collapsed){$('controls').hidden=collapsed;$('menuToggle').setAttribute('aria-expanded',String(!collapsed));$('menuToggle').textContent=collapsed?'Mostrar controles ＋':'Minimizar controles −';}
setMenu(mobileMenu.matches);
$('menuToggle').onclick=()=>setMenu(!$('controls').hidden);
mobileMenu.addEventListener('change',event=>setMenu(event.matches));
$('mirror').onchange=()=>resetTracking();
for(const [id,suffix] of [['count',''],['life',' s'],['zoom','×'],['density','%'],['volume','%']])$(id).oninput=()=>{$(`${id}Value`).value=$(id).value+suffix;if(id==='volume')sampler.volume(+$(id).value/100);};
function resetTracking(){busy=false;bodyImage=bodyWorld=null;bodyAt=0;autoShape={shape:'circle',until:performance.now()+5000+Math.random()*3000};blobs=[];points=[];resetMotionDetection();handCount=faceCount=0;handZones=[];lastResult=0;sampler.setOpenness(null);}
function startTracker(){
 return new Promise((resolve,reject)=>{
  worker=new Worker('./tracker.js');const activeWorker=worker;const timer=trackerTimer=setTimeout(()=>{activeWorker.terminate();reject(Error('La carga del seguimiento agotó el tiempo. Comprueba la conexión y vuelve a iniciar.'));},90000);
  worker.onerror=()=>{clearTimeout(timer);ready=false;busy=false;worker?.terminate();if(starting)reject(Error('No se pudo iniciar MediaPipe. Comprueba la conexión y usa un navegador actualizado.'));else status('El seguimiento se detuvo. Detén y vuelve a iniciar para recuperarlo.');};
  worker.onmessage=({data})=>{if(data.type==='ready'){clearTimeout(timer);ready=true;resolve();}else if(data.type==='error'){clearTimeout(timer);busy=false;ready=false;worker?.terminate();if(starting)reject(Error('No se pudo cargar el seguimiento: '+data.message));else status('El seguimiento falló. Detén y vuelve a iniciar.');}else if(data.type==='result'){
   if(!running||changingCamera||data.epoch!==session)return;busy=false;const now=performance.now();inferenceInterval=clamp((now-data.time)*1.2,85,250);lastResult=now;bodyImage=data.poseImage?.[0];bodyWorld=data.poseWorld?.[0];bodyAt=now;sampler.setOpenness(armOpenness(data.poseWorld?.[0]));handCount=data.hands.length;faceCount=data.faces.length;points=[];handZones=[];
   for(const hand of data.hands){const displayed=hand.map(displayPoint);const xs=displayed.map(p=>p.x),ys=displayed.map(p=>p.y);handZones.push({left:Math.min(...xs)-.035,right:Math.max(...xs)+.035,top:Math.min(...ys)-.035,bottom:Math.max(...ys)+.035,peace:isPeace(hand)});for(const i of [0,8,12])points.push({x:hand[i].x,y:hand[i].y,kind:'hand',part:i===0?'wrist':'finger',soundX:hand[0].x,soundY:hand[0].y});} 
   for(const f of data.faces){for(const [anchor,a,b] of [['eye-left',33,133],['eye-right',263,362],['mouth',13,14],['mouth-left',61,61],['mouth-right',291,291],['cheek-left',234,234],['cheek-right',454,454],['nose',1,1]])points.push({x:(f[a].x+f[b].x)/2,y:(f[a].y+f[b].y)/2,kind:'face',anchor,part:['eye-left','eye-right','mouth'].includes(anchor)?'primary-face':'secondary-face'});const mouth=Math.hypot(f[13].x-f[14].x,f[13].y-f[14].y)/Math.max(.001,Math.hypot(f[33].x-f[263].x,f[33].y-f[263].y));if(!detector.blocked&&mouth>.18&&now-lastMouth>3500){const p=displayPoint({...f[13],kind:"face"});sampler.play(4,soundParameters(p));lastMouth=now;}}
   if(bodyImage)for(const i of [11,12,13,14,23,24]){const p=bodyImage[i];if(p&&p.visibility>.65)points.push({x:p.x,y:p.y,kind:'body',part:'body',poseIndex:i,anchor:`body-${i}`});}
  }};
  worker.postMessage({type:'init'});
 });
}
function displayPoint(p){return{...p,x:$('mirror').checked?1-p.x:p.x,y:p.y};}
async function listCameras(){const devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');const selected=stream?.getVideoTracks()[0]?.getSettings().deviceId;$('camera').replaceChildren(...devices.map((d,i)=>new Option(d.label||`Cámara ${i+1}`,d.deviceId,false,d.deviceId===selected)));}
async function openCamera(deviceId){
 const epoch=++session;changingCamera=true;
 stream?.getTracks().forEach(t=>{t.onended=null;t.stop();});stream=null;video.srcObject=null;resetTracking();
 ctx.clearRect(0,0,canvas.width,canvas.height);
 const options={width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:30},...(deviceId?{deviceId:{exact:deviceId}}:{facingMode:{exact:facing}})};
 let next;
 try{
  try{next=await navigator.mediaDevices.getUserMedia({audio:false,video:options});}
  catch(error){if(deviceId||error.name!=='OverconstrainedError')throw error;next=await navigator.mediaDevices.getUserMedia({audio:false,video:{...options,facingMode:{ideal:facing}}});}
  if(epoch!==session){next.getTracks().forEach(t=>t.stop());throw Error('Inicio cancelado.');}
  stream=next;video.srcObject=stream;await video.play();
  if(epoch!==session)throw Error('Inicio cancelado.');
  const track=stream.getVideoTracks()[0],settings=track.getSettings();
  const mirror=mirrorForCamera(settings,facing,track.label);facing=mirror?'user':'environment';$('mirror').checked=mirror;
  await listCameras();resetTracking();
  track.onended=()=>{if(running&&epoch===session){stop();status('La cámara se desconectó. Conéctala y pulsa iniciar.',true);}};
 }finally{if(epoch===session)changingCamera=false;}
}

function stop(){clearTimeout(trackerTimer);session++;changingCamera=false;facing='user';$('mirror').checked=true;running=false;ready=false;busy=false;worker?.terminate();worker=null;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;sampler.stop();resetTracking();ctx.clearRect(0,0,canvas.width,canvas.height);$('welcome').hidden=false;$('start').disabled=false;for(const id of ['stop','flip','camera','audio','fullscreen'])$(id).disabled=true;$('metrics').textContent='CÁMARA EN ESPERA';}
function cameraError(error){return({NotAllowedError:'No se permitió la cámara. Activa el permiso para este sitio y vuelve a iniciar.',NotFoundError:'No se encontró una cámara conectada.',NotReadableError:'No se pudo abrir la cámara. Comprueba si otra aplicación la está usando.',OverconstrainedError:'Esa cámara ya no está disponible. Vuelve a iniciar con la cámara automática.'})[error.name]||error.message;}
$('start').onclick=async()=>{
 if(starting)return;starting=true;$('start').disabled=true;status('Preparando cámara, samples y seguimiento… La primera carga puede tardar.',true);
 try{
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('Abre esta página con HTTPS o desde localhost para usar la cámara.');
  facing='user';$('mirror').checked=true;await sampler.unlock();await openCamera();const epoch=session;await Promise.all([sampler.load(),startTracker()]);if(epoch!==session)throw Error('Inicio cancelado.');running=true;lastFrame=performance.now();$('welcome').hidden=true;for(const id of ['stop','flip','camera','audio','fullscreen'])$(id).disabled=false;sampler.volume(+$('volume').value/100);status('Listo. Muévete frente a la cámara; ✌ activa el negativo.');requestAnimationFrame(frame);
 }catch(error){stop();status(cameraError(error),true);}finally{starting=false;$('start').disabled=false;}
};
$('stop').onclick=()=>{stop();status('Sesión detenida. La cámara está apagada.');};
async function switchCamera(id){if(!running)return;$('camera').disabled=$('flip').disabled=true;try{await openCamera(id);status('Cámara conectada.');}catch(error){stop();status(cameraError(error),true);}finally{if(running)$('camera').disabled=$('flip').disabled=false;}}
$('camera').onchange=()=>switchCamera($('camera').value);
$('flip').onclick=()=>{facing=facing==='user'?'environment':'user';switchCamera();};
$('audio').onclick=async()=>{try{await sampler.unlock();sampler.muted=!sampler.muted;sampler.volume(+$('volume').value/100);$('audio').textContent=sampler.muted?'Sonido: silenciado':'Sonido: activo';}catch{status('No se pudo reactivar el audio. Pulsa el botón de sonido para intentarlo otra vez.');}};
navigator.mediaDevices?.addEventListener('devicechange',()=>{if(running)listCameras().catch(()=>status('No se pudo actualizar la lista de cámaras.'));});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(running||starting)){stop();status('Sesión detenida al salir de la página. Pulsa iniciar para continuar.');}});
window.addEventListener('pagehide',()=>stop());
function movement(now){
 mc.drawImage(source,0,0,MOTION.WIDTH,MOTION.HEIGHT);
 const result=detector.update(mc.getImageData(0,0,MOTION.WIDTH,MOTION.HEIGHT).data);
 lastMotion=now;return result;
}
function frame(now){
 if(!running)return;requestAnimationFrame(frame);if(changingCamera||video.readyState<2)return;
 const w=video.videoWidth,h=video.videoHeight;if(!w||!h)return;
 if(source.width!==w||source.height!==h){source.width=canvas.width=w;source.height=canvas.height=h;resetMotionDetection();}
 sc.save();if($('mirror').checked){sc.translate(w,0);sc.scale(-1,1);}sc.drawImage(video,0,0,w,h);sc.restore();ctx.drawImage(source,0,0);
 if(now-lastMotion>MOTION.INTERVAL_MS)motionPoints=movement(now);
 if(now-lastResult>650){points=[];handZones=[];handCount=faceCount=0;sampler.setOpenness(null);}
 const candidates=detector.blocked?[]:[...points.map(displayPoint),...motionPoints];
 for(const b of blobs)if(b.anchor)followFace(b,candidates,now-lastFrame);
 if($('shape').value==='auto')autoShape=nextShape(autoShape,now);
 const activeShape=$('shape').value==='auto'?autoShape.shape:$('shape').value;
 if(ready&&!busy&&now-lastInfer>inferenceInterval){busy=true;lastInfer=now;const token=session;createImageBitmap(video,{resizeWidth:Math.min(w,480),resizeHeight:Math.round(h*Math.min(w,480)/w)}).then(bitmap=>{if(token!==session||!running){bitmap.close();return;}worker.postMessage({type:'frame',bitmap,time:now,epoch:token},[bitmap]);}).catch(()=>{busy=false;});}
 blobs=blobs.filter(b=>(now-b.born)/1000<b.life).slice(-+$('count').value);
 if(candidates.length&&now-lastSpawn>100&&blobs.length<+$('count').value){
  let added=0;
  const ordered=candidates.map(p=>({p,key:-Math.log(Math.max(.000001,Math.random()))/spawnWeight(p)})).sort((a,b)=>a.key-b.key).map(item=>item.p);
  for(let i=0;i<ordered.length&&added<3&&blobs.length<+$('count').value;i++){const p=ordered[i];if(hasSpace(p,blobs,now,w,h)){blobs.push({...p,born:now,life:randomLife(+$('life').value)});added++;}}
  lastSpawn=now;
 }

 if(!detector.blocked&&now-lastSound>300){lastSound=now;let voices=0;
  const fresh=blobs.filter(b=>now-b.born<500&&!b.sounded);
  for(const b of fresh){if(voices>=2)break;if(Math.random()*100<+$('density').value){if(sampler.play(sampler.nextSample(),soundParameters(b))){b.sounded=true;voices++;}}}
 }
 ctx.strokeStyle='#7bff62';ctx.lineWidth=1;
 if($('lines').checked&&blobs.length>1){ctx.globalAlpha=.5;ctx.beginPath();blobs.forEach((b,i)=>i?ctx.lineTo(b.x*w,b.y*h):ctx.moveTo(b.x*w,b.y*h));ctx.stroke();ctx.globalAlpha=1;}
 for(const b of blobs){const g=growth((now-b.born)/1000,b.life,blobZoom(b,+$('zoom').value));const r=g.radius*Math.min(w,h)/480,x=clamp(b.x*w,r,w-r),y=clamp(b.y*h,r,h-r);const c=crop(b.x*w,b.y*h,r,g.zoom,w,h);ctx.save();ctx.globalAlpha=g.alpha;ctx.beginPath();if(activeShape==='circle')ctx.arc(x,y,r,0,Math.PI*2);else ctx.rect(x-r,y-r,r*2,r*2);ctx.save();ctx.clip();ctx.drawImage(source,c.x,c.y,c.side,c.side,x-r,y-r,r*2,r*2);if(shouldInvert(b,handZones)){ctx.globalCompositeOperation='difference';ctx.fillStyle='white';ctx.fillRect(x-r,y-r,r*2,r*2);}ctx.restore();ctx.stroke();ctx.restore();}
 fps=fps*.93+(1000/Math.max(1,now-lastFrame))*.07;lastFrame=now;if(DEBUG){$('metrics').textContent=`${Math.round(fps)} FPS / ${blobs.length} BLOBS / ${handCount} MANOS / ${faceCount} CARAS`;$('gesture').textContent=handZones.some(h=>h.peace)?'✌ NEGATIVO EN MANOS':'✌ PAZ → NEGATIVO';}
}

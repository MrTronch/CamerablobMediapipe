import {DEBUG,MOTION} from './config.js';
import {MotionDetector} from './motion.js';
import {setupPresentation,mirrorForCamera} from './presentation.js';
import {clamp,isPeace,growth,crop,shouldInvert,randomLife,hasSpace,armOpenness,nextShape,followFace,bodyAudio,blobZoom,spawnWeight,eyeZone,handMotionCandidates,excludePairedEyes} from './logic.js';
import {Sampler} from './audio.js';
import {trackerBitmap} from './browser-compat.js';
import {TrackingBridge} from './tracking-bridge.js';
import {invertOutside,createFrameTrail,drawFrameOutlines,clipOutsideFrames} from './compositing.js';
import {createCameraFilter} from './camera-filter.js';
const cameraFilter=createCameraFilter();
import {createThirdEye} from './third-eye.js';
import {createFaceStretch} from './face-stretch.js';
const faceStretch=createFaceStretch();
const frameTrail=createFrameTrail();
const thirdEye=createThirdEye();
import {createAtmosphere} from './atmosphere.js';
import {createTitleTracking} from './title-tracking.js';
import {containPoint,cameraConstraints} from './reactive.js';
const $=id=>document.getElementById(id),video=$('video'),canvas=$('view'),ctx=canvas.getContext('2d'),sampler=new Sampler();
const atmosphere=createAtmosphere(document.getElementById('atmosphere'),()=>sampler.reaction(),()=>thirdEye.isMouthOpen(performance.now()));
createTitleTracking(document.querySelector('h1'),()=>sampler.reaction());
const source=document.createElement('canvas'),sc=source.getContext('2d');
const motion=document.createElement('canvas');motion.width=MOTION.WIDTH;motion.height=MOTION.HEIGHT;const mc=motion.getContext('2d',{willReadFrequently:true});
let stream,worker,ready=false,running=false,busy=false,starting=false,session=0,facing='user',blobs=[],points=[],handZones=[],lastInfer=0,lastMotion=0,lastSpawn=0,lastSound=0,lastMouth=0,lastResult=0,lastFrame=0,fps=0,handCount=0,faceCount=0,inferenceInterval=100;
let changingCamera=false,trackerTimer,cancelTracker,eyeCooldownUntil=0;
const detector=new MotionDetector();
let motionPoints=[],lastVideoTime=-1,sourceRevision=0;
function resetMotionDetection(){detector.reset();motionPoints=[];lastMotion=0;}
let bodyImage=null,bodyWorld=null,bodyAt=0;
function soundParameters(p){const raw={...p,x:p.soundX??($('mirror').checked?1-p.x:p.x),y:p.soundY??p.y};return performance.now()-bodyAt<700?bodyAudio(raw,bodyImage,bodyWorld,video.videoWidth/video.videoHeight):null;}
let autoShape={shape:'circle',until:0};
$('shape').onchange=()=>{autoShape={shape:'circle',until:performance.now()+5000+Math.random()*3000};};
const status=(message,important=false)=>{$('status').textContent=message;$('status').hidden=!DEBUG&&!important;};
setupPresentation({stage:document.querySelector('.stage'),button:$('fullscreen'),exitButton:$('exitFullscreen'),onResize:()=>resetMotionDetection(),onError:message=>status(message,true)});
const mobileMenu=matchMedia('(max-width: 600px)');
function setMenu(collapsed){$('controls').hidden=collapsed;const button=$('menuToggle');button.setAttribute('aria-expanded',String(!collapsed));button.setAttribute('aria-label',collapsed?'Mostrar controles':'Ocultar controles');button.title=collapsed?'Mostrar controles':'Ocultar controles';}
setMenu(true);
$('menuToggle').onclick=()=>setMenu(!$('controls').hidden);

$('mirror').onchange=()=>resetTracking();
for(const [id,suffix] of [['count',''],['life',' s'],['zoom','×'],['density','%'],['volume','%'],['thereminVolume','%'],['stroke',' px'],['fisheye','%'],['copies','']])$(id).oninput=()=>{$(`${id}Value`).value=$(id).value+suffix;if(id==='volume')sampler.volume(+$(id).value/100);if(id==='thereminVolume')sampler.thereminVolume(+$(id).value/100);};
function resetTracking(){sampler.handFrame(null,1,1);lastVideoTime=-1;faceStretch.reset();frameTrail.reset();thirdEye.reset();atmosphere.update([]);eyeCooldownUntil=0;busy=false;bodyImage=bodyWorld=null;bodyAt=0;autoShape={shape:'circle',until:performance.now()+5000+Math.random()*3000};blobs=[];points=[];resetMotionDetection();handCount=faceCount=0;handZones=[];lastResult=0;sampler.setOpenness(null);}
function startTracker(){
 return new Promise((resolve,reject)=>{
  cancelTracker=()=>reject(Error("Inicio cancelado."));
  worker=new TrackingBridge();const activeWorker=worker;const timer=trackerTimer=setTimeout(()=>{activeWorker.terminate();reject(Error('La carga del seguimiento agotó el tiempo. Comprueba la conexión y vuelve a iniciar.'));},90000);
  worker.onerror=()=>{clearTimeout(timer);ready=false;busy=false;worker?.terminate();if(starting)reject(Error('No se pudo iniciar MediaPipe. Comprueba la conexión y usa un navegador actualizado.'));else status('El seguimiento se detuvo. El modo de movimiento sigue activo. Detén y vuelve a iniciar para recuperar los gestos.',true);};
  worker.onmessage=({data})=>{if(data.type==='ready'){clearTimeout(timer);cancelTracker=null;ready=true;resolve();}else if(data.type==='error'){clearTimeout(timer);busy=false;ready=false;worker?.terminate();if(starting)reject(Error('No se pudo cargar el seguimiento: '+data.message));else status('El seguimiento falló. El modo de movimiento sigue activo. Detén y vuelve a iniciar.',true);}else if(data.type==='result'){
   if(!running||changingCamera||data.epoch!==session){data.eyePatch?.close();return;}busy=false;const now=performance.now();inferenceInterval=clamp((now-data.time)*.75,24,100);lastResult=now;bodyImage=data.poseImage?.[0];bodyWorld=data.poseWorld?.[0];bodyAt=now;sampler.setOpenness(armOpenness(data.poseWorld?.[0]));handCount=data.hands.length;faceCount=data.faces.length;points=[];handZones=[];
   faceStretch.update(data.hands.map(h=>h.map(displayPoint)),data.faces[0]?.map(displayPoint),now,video.videoWidth,video.videoHeight);
   thirdEye.update(data.faces[0]?.map(displayPoint),now,video.videoWidth,video.videoHeight,!detector.blocked,data.eyePatch,$('mirror').checked,data.faceTime);
   for(const hand of data.hands){const displayed=hand.map(displayPoint);const xs=displayed.map(p=>p.x),ys=displayed.map(p=>p.y);handZones.push({left:Math.min(...xs)-.035,right:Math.max(...xs)+.035,top:Math.min(...ys)-.035,bottom:Math.max(...ys)+.035,peace:isPeace(hand)});for(const i of [0,8,12])points.push({x:hand[i].x,y:hand[i].y,kind:'hand',part:i===0?'wrist':'finger',soundX:hand[0].x,soundY:hand[0].y});} 
   for(const f of data.faces){for(const [anchor,a,b] of [['eye-left',33,133],['eye-right',263,362],['mouth',13,14],['mouth-left',61,61],['mouth-right',291,291],['cheek-left',234,234],['cheek-right',454,454],['nose',1,1]])points.push({x:(f[a].x+f[b].x)/2,y:(f[a].y+f[b].y)/2,kind:'face',anchor,part:['eye-left','eye-right','mouth'].includes(anchor)?'primary-face':'secondary-face'});const mouth=Math.hypot(f[13].x-f[14].x,f[13].y-f[14].y)/Math.max(.001,Math.hypot(f[33].x-f[263].x,f[33].y-f[263].y));if(!detector.blocked&&mouth>.18&&now-lastMouth>3500){const p=displayPoint({...f[13],kind:"face"});sampler.play(4,soundParameters(p));lastMouth=now;}}
   if(bodyImage)for(const i of [11,12,13,14,23,24]){const p=bodyImage[i];if(p&&p.visibility>.65)points.push({x:p.x,y:p.y,kind:'body',part:'body',poseIndex:i,anchor:`body-${i}`});}
  }};
  worker.postMessage({type:'init'});
 });
}
function displayPoint(p){return{...p,x:$('mirror').checked?1-p.x:p.x,y:p.y};}
async function listCameras(){const devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');const selected=stream?.getVideoTracks()[0]?.getSettings().deviceId;$('camera').replaceChildren(...devices.map((d,i)=>new Option(d.label||`Cámara ${i+1}`,d.deviceId,false,d.deviceId===selected)));}
async function requestCamera(constraints){
 let expired=false;
 let timer;
 const request=navigator.mediaDevices.getUserMedia(constraints).then(next=>{
  if(expired){next.getTracks().forEach(track=>track.stop());throw Error('La solicitud de cámara venció. Vuelve a iniciar.');}
  return next;
 });
 try{return await Promise.race([request,new Promise((_,reject)=>{
  timer=setTimeout(()=>{expired=true;reject(Error('La cámara no respondió. Revisa el permiso de cámara junto a la dirección del navegador, cierra otras aplicaciones que la usen y vuelve a iniciar.'));},30000);
 })]);}finally{clearTimeout(timer);}
}
async function openCamera(deviceId){
 const epoch=++session;changingCamera=true;
 stream?.getTracks().forEach(t=>{t.onended=null;t.stop();});stream=null;video.srcObject=null;resetTracking();
 ctx.clearRect(0,0,canvas.width,canvas.height);
 const desktop=matchMedia('(min-width: 901px)').matches;
 const options={...cameraConstraints(desktop),...(deviceId?{deviceId:{exact:deviceId}}:{facingMode:{exact:facing}})};
 let next;
 try{
  try{next=await requestCamera({audio:false,video:options});}
  catch(error){if(deviceId||error.name!=='OverconstrainedError')throw error;next=await requestCamera({audio:false,video:{...options,facingMode:{ideal:facing}}});}
  if(epoch!==session){next.getTracks().forEach(t=>t.stop());throw Error('Inicio cancelado.');}
  stream=next;video.srcObject=stream;await video.play();
  if(epoch!==session)throw Error('Inicio cancelado.');
  const track=stream.getVideoTracks()[0];
  if(desktop&&Math.abs((track.getSettings().aspectRatio||track.getSettings().width/track.getSettings().height)-16/9)>.02){
   try{await track.applyConstraints({...cameraConstraints(true),aspectRatio:{exact:16/9}});}catch{/* Preserve working cameras that do not offer widescreen capture. */}
  }
  const settings=track.getSettings();
  const mirror=mirrorForCamera(settings,facing,track.label);facing=mirror?'user':'environment';$('mirror').checked=mirror;
  await listCameras();resetTracking();
  track.onended=()=>{if(running&&epoch===session){stop();status('La cámara se desconectó. Conéctala y pulsa iniciar.',true);}};
 }finally{if(epoch===session)changingCamera=false;}
}

function stop(){$('frameStatus').hidden=true;document.querySelector('.stage').classList.remove('camera-active');cancelTracker?.();cancelTracker=null;clearTimeout(trackerTimer);session++;changingCamera=false;facing='user';$('mirror').checked=true;running=false;ready=false;busy=false;worker?.terminate();worker=null;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;sampler.stop();resetTracking();ctx.clearRect(0,0,canvas.width,canvas.height);$('welcome').hidden=false;$('start').disabled=false;for(const id of ['stop','flip','camera','audio','fullscreen'])$(id).disabled=true;$('metrics').textContent='CÁMARA EN ESPERA';}
function cameraError(error){return({NotAllowedError:'No se permitió la cámara. Activa el permiso para este sitio y vuelve a iniciar.',NotFoundError:'No se encontró una cámara conectada.',NotReadableError:'No se pudo abrir la cámara. Comprueba si otra aplicación la está usando.',OverconstrainedError:'Esa cámara ya no está disponible. Vuelve a iniciar con la cámara automática.'})[error.name]||error.message;}
$('start').onclick=async()=>{
 if(starting)return;starting=true;$('start').disabled=true;status('Permite el acceso a la cámara en el aviso de tu navegador para empezar.',true);
 try{
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('Abre esta página con HTTPS o desde localhost para usar la cámara.');
  facing='user';$('mirror').checked=true;
  // The video starts independently of network models and optional audio.
  const audioReady=sampler.unlock().then(()=>sampler.load()).then(()=>null,error=>error);
  await openCamera();const epoch=session;
  running=true;lastFrame=performance.now();$('welcome').hidden=true;$('frameStatus').hidden=false;
  for(const id of ['stop','flip','camera','audio','fullscreen'])$(id).disabled=false;
  requestAnimationFrame(frame);
  status('Cámara activa. Cargando seguimiento de gestos…',true);
  const [audioError,tracking]=await Promise.all([audioReady,startTracker().then(()=>null,error=>error)]);
  if(epoch!==session)return;
  sampler.volume(+$('volume').value/100);
  const notices=[];
  if(tracking)notices.push('Gestos no disponibles. El modo de movimiento sigue activo. Comprueba la conexión y vuelve a iniciar para cargar MediaPipe.');
  if(audioError)notices.push('No se pudo activar el sonido. Detén y vuelve a iniciar para reintentarlo.');
  status(notices.join(' ')||'Listo. Muévete frente a la cámara; ✌ activa el negativo.',notices.length>0);
 }catch(error){stop();status(cameraError(error),true);}finally{starting=false;$('start').disabled=false;}
};
$('stop').onclick=()=>{stop();status('Sesión detenida. La cámara está apagada.');};
async function switchCamera(id){if(!running)return;$('camera').disabled=$('flip').disabled=true;try{await openCamera(id);status('Cámara conectada.');}catch(error){stop();status(cameraError(error),true);}finally{if(running)$('camera').disabled=$('flip').disabled=false;}}
$('camera').onchange=()=>switchCamera($('camera').value);
$('flip').onclick=()=>{facing=facing==='user'?'environment':'user';switchCamera();};
$('audio').onclick=async()=>{try{await sampler.unlock();sampler.muted=!sampler.muted;sampler.volume(+$('volume').value/100);$('audio').setAttribute('aria-pressed',String(sampler.muted));$('audio').setAttribute('aria-label',sampler.muted?'Activar sonido':'Silenciar sonido');$('audio').title=sampler.muted?'Activar sonido':'Silenciar sonido';}catch{status('No se pudo reactivar el audio. Pulsa el botón de sonido para intentarlo otra vez.');}};
navigator.mediaDevices?.addEventListener('devicechange',()=>{if(running)listCameras().catch(()=>status('No se pudo actualizar la lista de cámaras.'));});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&running){lastFrame=performance.now();resetMotionDetection();if(video.paused)video.play().catch(()=>status('Pulsa la página para reanudar el video.',true));}});
window.addEventListener('pagehide',()=>stop());
function movement(now){
 mc.drawImage(source,0,0,MOTION.WIDTH,MOTION.HEIGHT);
 const result=detector.update(mc.getImageData(0,0,MOTION.WIDTH,MOTION.HEIGHT).data);
 lastMotion=now;return result;
}
function frame(now){
 if(!running)return;requestAnimationFrame(frame);if(now-lastFrame<((faceStretch.isActive()||thirdEye.isEmitting(now))?14:30))return;if(changingCamera||video.readyState<2)return;
 const w=video.videoWidth,h=video.videoHeight;if(!w||!h)return;
 const stage=document.querySelector('.stage');stage.classList.add('camera-active');stage.style.setProperty('--camera-ratio',String(w/h));
 if(source.width!==w||source.height!==h){source.width=canvas.width=w;source.height=canvas.height=h;$('cameraResolution').value=`${w} × ${h}`;resetMotionDetection();}
 if(lastVideoTime!==video.currentTime){sc.save();if($('mirror').checked){sc.translate(w,0);sc.scale(-1,1);}sc.drawImage(video,0,0,w,h);sc.restore();lastVideoTime=video.currentTime;sourceRevision++;}
 const filtered=$('cameraFilter').checked,visualSource=cameraFilter.image(source,filtered,sourceRevision);ctx.drawImage(visualSource,0,0);
 if(now-lastMotion>MOTION.INTERVAL_MS)motionPoints=movement(now);
 if(now-lastResult>650){points=[];handZones=[];handCount=faceCount=0;sampler.setOpenness(null);}
 const facePoints=points.filter(p=>p.kind==='face').map(displayPoint);
 const candidates=detector.blocked?[]:handMotionCandidates(points.map(displayPoint),motionPoints,faceCount,handCount);
 for(const b of blobs)if(b.anchor)followFace(b,candidates,now-lastFrame);
 if($('shape').value==='auto')autoShape=nextShape(autoShape,now);
 const activeShape=$('shape').value==='auto'?autoShape.shape:$('shape').value;
 if(ready&&!busy&&now-lastInfer>inferenceInterval){busy=true;lastInfer=now;const token=session;trackerBitmap(video).then(bitmap=>{if(token!==session||!running){bitmap.close();return;}return worker.postMessage({type:'frame',bitmap,time:now,epoch:token},[bitmap]);}).catch(()=>{busy=false;});}
 blobs=blobs.filter(b=>(now-b.born)/1000<b.life).slice(-+$('count').value);
 blobs=excludePairedEyes(blobs,facePoints);
 if(candidates.length&&now-lastSpawn>100&&blobs.length<+$('count').value){
  let added=0;
  const ordered=candidates.map(p=>({p,key:-Math.log(Math.max(.000001,Math.random()))/spawnWeight(p)})).sort((a,b)=>a.key-b.key).map(item=>item.p);
  for(let i=0;i<ordered.length&&added<3&&blobs.length<+$('count').value;i++){const p=ordered[i],eye=eyeZone(p,facePoints);if(eye&&(now<eyeCooldownUntil||blobs.some(b=>eyeZone(b,facePoints))))continue;if(hasSpace(p,blobs,now,w,h)){const life=randomLife(+$('life').value);blobs.push({...p,born:now,life});if(eye)eyeCooldownUntil=now+life*1000+2500;added++;}}
  lastSpawn=now;
 }

 if(!detector.blocked&&now-lastSound>300){lastSound=now;let voices=0;
  const fresh=blobs.filter(b=>now-b.born<500&&!b.sounded);
  for(const b of fresh){if(voices>=2)break;if(Math.random()*100<+$('density').value){if(sampler.play(sampler.nextSample(),soundParameters(b))){b.sounded=true;voices++;}}}
 }
 const stageRect=canvas.getBoundingClientRect();
 atmosphere.update(blobs.map(b=>containPoint(b,w,h,stageRect,innerWidth,innerHeight)).filter(Boolean));
 ctx.strokeStyle='#23f415';ctx.lineWidth=+$('stroke').value;
 for(const b of blobs){const g=growth((now-b.born)/1000,b.life,blobZoom(b,+$('zoom').value));const r=g.radius*Math.min(w,h)/480,x=clamp(b.x*w,r,w-r),y=clamp(b.y*h,r,h-r);const c=crop(b.x*w,b.y*h,r,g.zoom,w,h);ctx.save();ctx.globalAlpha=g.alpha;ctx.beginPath();if(activeShape==='circle')ctx.arc(x,y,r,0,Math.PI*2);else ctx.rect(x-r,y-r,r*2,r*2);ctx.save();ctx.clip();ctx.drawImage(visualSource,c.x,c.y,c.side,c.side,x-r,y-r,r*2,r*2);if(shouldInvert(b,handZones)){ctx.globalCompositeOperation='difference';ctx.fillStyle='white';ctx.fillRect(x-r,y-r,r*2,r*2);}ctx.restore();ctx.restore();}
 const frameRectangle=faceStretch.draw(ctx,visualSource,now,0);
 sampler.handFrame(frameRectangle,w,h);
 const frameCopies=frameTrail.draw(ctx,visualSource,frameRectangle,now,+$('fisheye').value/100,sourceRevision+':'+filtered,+$('copies').value);
 invertOutside(ctx,w,h,frameRectangle,+$('stroke').value);
 cameraFilter.grain(ctx,w,h,now,filtered);
 ctx.save();clipOutsideFrames(ctx,w,h,frameCopies);
 ctx.strokeStyle='#23f415';ctx.lineWidth=+$('stroke').value;
 if($('lines').checked&&blobs.length>1){ctx.globalAlpha=.5;ctx.beginPath();blobs.forEach((b,i)=>i?ctx.lineTo(b.x*w,b.y*h):ctx.moveTo(b.x*w,b.y*h));ctx.stroke();ctx.globalAlpha=1;}
 for(const b of blobs){const g=growth((now-b.born)/1000,b.life,blobZoom(b,+$('zoom').value));const r=g.radius*Math.min(w,h)/480,x=clamp(b.x*w,r,w-r),y=clamp(b.y*h,r,h-r);ctx.save();ctx.globalAlpha=g.alpha;ctx.beginPath();if(activeShape==='circle')ctx.arc(x,y,r,0,Math.PI*2);else ctx.rect(x-r,y-r,r*2,r*2);ctx.stroke();ctx.restore();}
 ctx.restore();
 drawFrameOutlines(ctx,frameCopies,+$('stroke').value);

 thirdEye.draw(ctx,visualSource,now,filtered);
 const stretchScale=faceStretch.scale();
 const frameLabel=`MARCO · ${handCount}/2 MANOS · ${faceCount?'ROSTRO OK':'SIN ROSTRO'} · ${faceStretch.isActive()?`ACTIVO · X ${stretchScale.x.toFixed(2)}× · Y ${stretchScale.y.toFixed(2)}×`:'FORMA EL MARCO'}`;
 if($('frameStatus').textContent!==frameLabel)$('frameStatus').textContent=frameLabel;
 fps=fps*.93+(1000/Math.max(1,now-lastFrame))*.07;lastFrame=now;if(DEBUG){$('metrics').textContent=`${Math.round(fps)} FPS / ${blobs.length} BLOBS / ${handCount} MANOS / ${faceCount} CARAS`;$('gesture').textContent=handZones.some(h=>h.peace)?'✌ NEGATIVO EN MANOS':'✌ PAZ → NEGATIVO';}
}

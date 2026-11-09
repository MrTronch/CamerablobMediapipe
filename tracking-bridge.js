export class TrackingBridge{
 constructor(makeWorker=url=>new Worker(url),cloneBitmap=image=>createImageBitmap(image)){
  this.cloneBitmap=cloneBitmap;this.readyCount=0;this.closed=false;this.faceBusy=false;this.faceAt=-Infinity;this.cache=null;this.epoch=null;
  this.hand=makeWorker(new URL('./tracker.js',import.meta.url));this.face=makeWorker(new URL('./tracker.js',import.meta.url));
  const handle=(worker,kind)=>worker.onmessage=event=>this.receive(event.data,kind);
  handle(this.hand,'hands');handle(this.face,'face');
  this.hand.onerror=this.face.onerror=event=>this.onerror?.(event);
 }
 async receive(data,kind){
  if(this.closed){data.eyePatch?.close();return;}
  if(data.type==='ready'){if(++this.readyCount===2)this.onmessage?.({data:{type:'ready'}});return;}
  if(data.type==='error'){this.onmessage?.({data});return;}
  if(kind==='face'){
   this.faceBusy=false;
   if(data.epoch!==this.epoch){data.eyePatch?.close();return;}
   this.cache?.eyePatch?.close();this.cache=data;return;
  }
  const cached=this.cache&&this.cache.epoch===data.epoch&&performance.now()-this.cache.time<1000?this.cache:null;
  let eyePatch=null;
  if(cached?.eyePatch){try{eyePatch=await this.cloneBitmap(cached.eyePatch);}catch{}}
  if(this.closed){eyePatch?.close();return;}
  this.onmessage?.({data:{...data,type:'result',faceTime:cached?.time,faces:cached?.faces||[],poseWorld:cached?.poseWorld||[],poseImage:cached?.poseImage||[],eyePatch}});
 }
 async postMessage(data){
  if(data.type==='init'){this.hand.postMessage({...data,mode:'hands'});this.face.postMessage({...data,mode:'face'});return;}
  if(data.type!=='frame')return;
  if(this.epoch!==data.epoch){this.cache?.eyePatch?.close();this.cache=null;this.epoch=data.epoch;this.faceAt=-Infinity;}
  let faceBitmap=null;
  if(!this.faceBusy&&data.time-this.faceAt>=250){
   this.faceBusy=true;this.faceAt=data.time;
   try{faceBitmap=await this.cloneBitmap(data.bitmap);}catch{this.faceBusy=false;}
  }
  if(this.closed){faceBitmap?.close();data.bitmap.close();return;}
  if(faceBitmap)this.face.postMessage({...data,bitmap:faceBitmap},[faceBitmap]);
  this.hand.postMessage(data,[data.bitmap]);
 }
 terminate(){this.closed=true;this.cache?.eyePatch?.close();this.cache=null;this.hand.terminate();this.face.terminate();}
}

// Separate worker instances: hand frames never wait for face/pose inference.
let mode='hands',hands,face,pose,eyeGeometry,lastPose=-Infinity,poseWorld=[],poseImage=[],lastEpoch;
onmessage=async({data})=>{try{
 if(data.type==='init'){
  mode=data.mode||'hands';
  const vision=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/vision_bundle.mjs');
  const files=await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm');
  if(mode==='hands'){
   const options={baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:'GPU'},runningMode:'VIDEO',numHands:2};
   try{hands=await vision.HandLandmarker.createFromOptions(files,options);}
   catch{options.baseOptions.delegate='CPU';hands=await vision.HandLandmarker.createFromOptions(files,options);}
  }
  else{
   ({eyeGeometry}=await import('./third-eye.js'));
   face=await vision.FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'},runningMode:'VIDEO',numFaces:1});
   pose=await vision.PoseLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'},runningMode:'VIDEO',numPoses:1});
  }
  postMessage({type:'ready'});
 }else if(data.type==='frame'){
  if(data.epoch!==lastEpoch){lastEpoch=data.epoch;lastPose=-Infinity;poseWorld=[];poseImage=[];}
  try{
   if(mode==='hands'){const h=hands.detectForVideo(data.bitmap,data.time);postMessage({type:'hands',hands:h.landmarks,epoch:data.epoch,time:data.time});}
   else{
    const f=face.detectForVideo(data.bitmap,data.time);
    if(data.time-lastPose>600){const result=pose.detectForVideo(data.bitmap,data.time);poseWorld=result.worldLandmarks;poseImage=result.landmarks;lastPose=data.time;}
    const g=eyeGeometry(f.faceLandmarks[0],data.bitmap.width,data.bitmap.height);
    const eyePatch=g?await createImageBitmap(data.bitmap,Math.floor(g.sx),Math.floor(g.sy),Math.max(1,Math.floor(g.sw)),Math.max(1,Math.floor(g.sh))):null;
    postMessage({type:'face',faces:f.faceLandmarks,poseWorld,poseImage,eyePatch,epoch:data.epoch,time:data.time},eyePatch?[eyePatch]:[]);
   }
  }finally{data.bitmap.close();}
 }
}catch(error){postMessage({type:'error',message:error.message});}};

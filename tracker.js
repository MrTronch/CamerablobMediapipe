// Classic worker: MediaPipe loads its WASM bootstrap with importScripts().
// Dynamic import loads the public API without disabling importScripts.
let hands,face,pose,lastPose=-Infinity,poseWorld=[],poseImage=[];
onmessage=async({data})=>{try{
 if(data.type==='init'){
  const {FilesetResolver,HandLandmarker,FaceLandmarker,PoseLandmarker}=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/vision_bundle.mjs');
  const files=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm');
  hands=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'},runningMode:'VIDEO',numHands:2});
  face=await FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'},runningMode:'VIDEO',numFaces:1});
  pose=await PoseLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'},runningMode:'VIDEO',numPoses:1});
  postMessage({type:'ready'});
 }else if(data.type==='frame'){
  try{const h=hands.detectForVideo(data.bitmap,data.time);const f=face.detectForVideo(data.bitmap,data.time);if(data.time-lastPose>240){const result=pose.detectForVideo(data.bitmap,data.time);poseWorld=result.worldLandmarks;poseImage=result.landmarks;lastPose=data.time;}postMessage({type:'result',hands:h.landmarks,faces:f.faceLandmarks,poseWorld,poseImage,time:data.time});}finally{data.bitmap.close();}
 }
}catch(error){postMessage({type:'error',message:error.message});}};

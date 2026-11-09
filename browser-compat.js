let scratch;
export async function trackerBitmap(video){
 const width=Math.min(video.videoWidth,480),height=Math.round(video.videoHeight*width/video.videoWidth);
 try{return await createImageBitmap(video,{resizeWidth:width,resizeHeight:height});}
 catch{
  // Some WebKit versions reject video sources or resize options. Canvas is a
  // supported intermediate and keeps worker input small on mobile devices.
  scratch??=document.createElement('canvas');
  if(scratch.width!==width||scratch.height!==height){scratch.width=width;scratch.height=height;}
  scratch.getContext('2d').drawImage(video,0,0,width,height);
  return createImageBitmap(scratch);
 }
}

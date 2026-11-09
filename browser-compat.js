let scratch;
export async function trackerBitmap(video){
 const scale=Math.min(1,480/Math.max(video.videoWidth,video.videoHeight));
 const width=Math.round(video.videoWidth*scale),height=Math.round(video.videoHeight*scale);
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

// Features from the audible output (after volume, reverb and limiter).
export function audioFeatures(samples,spectrum,sampleRate,fftSize){
 let sum=0,low=0,high=0,lowCount=0,highCount=0;
 for(const value of samples)sum+=value*value;
 for(let i=1;i<spectrum.length;i++){
  const hz=i*sampleRate/fftSize,value=spectrum[i]/255;
  if(hz>=40&&hz<300){low+=value;lowCount++;}
  if(hz>=2000&&hz<8000){high+=value;highCount++;}
 }
 return {level:Math.min(1,Math.sqrt(sum/Math.max(1,samples.length))*5),bass:low/Math.max(1,lowCount),treble:high/Math.max(1,highCount)};
}
// The complete source frame is visible, including fullscreen letterboxing.
export function containPoint(point,sourceWidth,sourceHeight,rect,viewportWidth,viewportHeight){
 if(!sourceWidth||!sourceHeight||!rect.width||!rect.height)return null;
 const scale=Math.min(rect.width/sourceWidth,rect.height/sourceHeight);
 return {x:(rect.left+(rect.width-sourceWidth*scale)/2+point.x*sourceWidth*scale)/viewportWidth,
 y:(rect.top+(rect.height-sourceHeight*scale)/2+point.y*sourceHeight*scale)/viewportHeight};
}

export function cameraConstraints(desktop){
 return {width:{ideal:960},height:{ideal:desktop?540:720},aspectRatio:{ideal:desktop?16/9:4/3},frameRate:{ideal:30,max:30}};
}
export function titlePosition(phase,index){
 return {x:.5+.5*Math.sin(phase*(.85+index*.13)+index*2.1),y:.5+Math.sin(phase*1.3+index*1.9)*.22};
}

// Independent smooth journeys with random endpoints, bends and dwell times.
export function createWanderer(random=Math.random){
 let from={x:random(),y:random()},to={x:random(),y:random()},bend=(random()-.5)*.65,start=0,duration=900+random()*2300;
 return now=>{
  while(now-start>=duration){from=to;to={x:random(),y:random()};start+=duration;duration=900+random()*2300;bend=(random()-.5)*.65;}
  const t=Math.max(0,Math.min(1,(now-start)/duration)),ease=t*t*(3-2*t);
  return {x:Math.max(0,Math.min(1,from.x+(to.x-from.x)*ease+Math.sin(t*Math.PI)*bend)),y:Math.max(0,Math.min(1,from.y+(to.y-from.y)*ease+Math.sin(t*Math.PI*2)*bend*.45))};
 };
}

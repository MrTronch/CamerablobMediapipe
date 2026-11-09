import {DEBUG} from './config.js';
export function setupPresentation({stage,button,exitButton,onResize,onError}){
 document.documentElement.classList.toggle('debug',DEBUG);
 const active=()=>document.fullscreenElement===stage||stage.classList.contains('immersive');
 const update=()=>{document.body.classList.toggle('fullscreen-active',active());exitButton.hidden=!active();onResize();};
 const fallback=()=>{stage.classList.add('immersive');update();};
 button.onclick=async()=>{if(stage.requestFullscreen){try{await stage.requestFullscreen();update();return;}catch{/* iPhone can use the in-page immersive view. */}}fallback();};
 exitButton.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();stage.classList.remove('immersive');update();}catch(e){onError(e.message);}};
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&stage.classList.contains('immersive')){stage.classList.remove('immersive');update();}});
 document.addEventListener('fullscreenchange',update);
 window.addEventListener('resize',onResize);
 window.visualViewport?.addEventListener('resize',onResize);
}
export function mirrorForCamera(settings,requested,label=''){
 if(settings.facingMode==='environment')return false;
 if(settings.facingMode==='user')return true;
 if(/back|rear|trasera|environment/i.test(label))return false;
 if(/front|frontal|facetime|user/i.test(label))return true;
 return requested!=='environment';
}

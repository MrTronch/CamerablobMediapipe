import {DEBUG} from './config.js';
export function setupPresentation({stage,button,exitButton,onResize,onError}){
 document.documentElement.classList.toggle('debug',DEBUG);
 const update=()=>{const active=document.fullscreenElement===stage;document.body.classList.toggle('fullscreen-active',active);exitButton.hidden=!active;onResize();};
 button.onclick=async()=>{try{if(!stage.requestFullscreen)throw Error('Este navegador no ofrece pantalla completa para esta vista.');await stage.requestFullscreen();}catch(e){onError(e.message);}};
 exitButton.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();}catch(e){onError(e.message);}};
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

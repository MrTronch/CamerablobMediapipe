// Classic bootstrap also runs when index.html is opened directly from Explorer.
(() => {
 const status=document.getElementById('status'),start=document.getElementById('start');
 if(location.protocol==='file:'){
  status.hidden=false;
  start.before(status);
  status.classList.add('boot-notice');
  status.textContent='Para usar la cámara y el fondo, cierra esta pestaña y abre INICIAR_WEB.bat en esta misma carpeta. Se abrirá la aplicación en localhost. En GitHub Pages funciona directamente.';
  start.textContent='Abre INICIAR_WEB.bat para iniciar';
  return;
 }
 import('./app.js').then(()=>{start.disabled=false;}).catch(error=>{
  status.hidden=false;
  start.before(status);
  status.textContent='No se pudo cargar la aplicación. Recarga con Ctrl + F5 y comprueba que app.js y atmosphere.js estén en esta carpeta. '+error.message;
 });
})();

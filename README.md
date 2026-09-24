# Blob Tracking Cámara

Instrumento audiovisual para navegador, adaptado del proyecto Python con OpenCV, MediaPipe y Pygame. Cámara, ventanas de ampliación progresiva y cinco samples originales.

## Probar en computadora

Instala Node.js y ejecuta `npm start` en esta carpeta. Abre http://localhost:4173 y pulsa **Iniciar cámara y sonido**. No requiere instalar paquetes. No abras index.html con doble clic: la cámara y el worker necesitan HTTP local o HTTPS.

## iPhone y publicación

Sirve esta carpeta en un alojamiento HTTPS. Para GitHub Pages, sube su contenido a un repositorio y configura Pages para publicar desde la raíz de la rama elegida. No hay compilación ni servidor de producción. Abre la dirección HTTPS en Safari, toca Iniciar y acepta la cámara. El permiso y la activación del sonido dependen del navegador. La compatibilidad práctica, velocidad y audio deben verificarse en un iPhone real antes de considerar la versión final. Al salir de la página se detiene la sesión; vuelve a tocar Iniciar al regresar.

## Controles

- Cámara: selector de dispositivos; Cambiar cámara alterna preferencia frontal/trasera.
- Círculos/cuadrados, 4–40 blobs (20 por defecto), duración máxima de 2–6 segundos y ampliación máxima. Cada bloque recibe su propia duración al nacer: entre 2 y 3 s con el máximo inicial de 3 s; al reducir el máximo, el mínimo es máximo menos 3, con piso de 2 s. El cambio afecta a los nuevos bloques. Cada ventana amplía vídeo en vivo mientras envejece, y desaparece de golpe al terminar su duración, sin fade de salida.
- Gesto de paz: índice y medio extendidos, anular y meñique plegados. Invierte solamente las ventanas situadas sobre la mano que hace paz; las del rostro quedan intactas.
- Boca abierta: quinto sample, con espera mínima de 3,5 segundos.
- Actividad sonora: cada 300 ms se evalúan los bloques nacidos hace menos de 500 ms, con 65% de probabilidad y máximo dos disparos por ciclo. Cada bloque suena una sola vez; se barajan los cuatro samples para evitar repeticiones consecutivas. El quinto conserva el disparador de boca.
- Pitch corporal: X e Y se miden respecto al centro de hombros y a la envergadura estimada a partir de hombros, codos y muñecas. El eje Z usa la profundidad estimada de la muñeca más cercana para manos, o de la nariz para rostro. X conserva el rango 0,1–5×; altura y profundidad añaden variación, limitada al mismo rango. La profundidad de bloques de movimiento sin anclaje se mantiene neutra. No es una medición física calibrada; poses de perfil y oclusiones reducen la precisión. Si faltan articulaciones fiables se utiliza pitch neutro, sin volver a mapear bordes de pantalla.
- Reverberación: ocho ecos a intervalos de 120 ms y caída de 0,75 por repetición, como la estructura original. La altura corporal controla su envío y abrir los brazos aumenta la mezcla. Se conservan los cálculos en coma flotante y un compresor para limitar picos; no se reproduce el desbordamiento de enteros que podía ocurrir en el original.
- Menú minimizable con botón visible, cerrado inicialmente en móvil. Espejo y líneas activados por defecto.
- Volumen, silencio, líneas y espejo. Detener libera la cámara.

## Diseño y rendimiento

MediaPipe Tasks Vision 0.10.32 procesa manos, rostro y pose en un worker separado; la pose se calcula como máximo unas cuatro veces por segundo. La captura para seguimiento se reduce a 480 píxeles de ancho y su frecuencia se ajusta al tiempo de procesamiento. El render usa Canvas; el movimiento se estima en una imagen de 80×60. Máximo de doce voces de audio simultáneas, samples decodificados una vez y reverberación compartida. No se promete una tasa de FPS sin medir el dispositivo.

Se conserva el concepto musical, pero no es una reproducción exacta del mezclador de Pygame: Web Audio usa otro procesamiento de tono y reverberación. Afinar escuchando ambos proyectos es parte de la validación artística.

## Archivos y privacidad

`app.js`: cámara, interacción y render. `logic.js`: gesto, crecimiento y recortes. `tracker.js`: modelos de seguimiento. `audio.js`: samples y efectos. `assets/`: cinco WAV copiados sin modificar del original. `server.mjs`: servidor local de desarrollo.

La cámara se procesa localmente, sin grabar ni enviar imágenes. Se necesita Internet para descargar la biblioteca de jsDelivr y los modelos de Google. No hay modo sin conexión. Los modelos no están incluidos en el repositorio.

## Verificación

`npm test` verifica crecimiento, duración aleatoria, separación espacial, normalización corporal, límites de recorte y gesto. La página tests/browser.html comprueba carga real de los tres modelos y procesamiento de dos fotogramas sintéticos sin cámara. La prueba manual debe cubrir: permitir/denegar cámara, cambiar dispositivos, círculos/cuadrados, zoom durante toda la duración, paz y mano abierta, boca, cinco samples, volumen, detener/reiniciar y regresar desde otra aplicación. Probar Safari en un iPhone real y un navegador de escritorio. Los tests no sustituyen esas pruebas.

## Licencias

La licencia del código original y la procedencia/licencia de los cinco samples deben confirmarse con su autor antes de distribuir públicamente. Esta adaptación no asigna una licencia a materiales del usuario. MediaPipe usa Apache-2.0; consulta además los términos de los modelos descargados. Este proyecto carga la biblioteca desde su distribuidor y no la redistribuye en esta carpeta.

Los bloques nacen con radio de 8 px a una imagen de referencia de 480 px, crecen progresivamente y evitan centros cercanos durante toda su vida. Se priorizan cinco anclajes de ojos y boca, sin duplicar el mismo anclaje. Estos bloques siguen el rostro con suavizado; si se pierde la detección conservan la última posición hasta caducar. El límite de bloques es un máximo: si no hay espacio suficiente se dibujan menos; se permite cierto solapamiento al crecer.

La forma Automática alterna círculos y cuadrados cada intervalo aleatorio de 5–8 s, independientemente de la duración individual de los bloques. Se pueden fijar círculos o cuadrados desde el selector. La ampliación inicial es 2,2×.

Para probar el pitch, encuadra hombros, codos y muñecas y mueve las manos lateralmente, arriba/abajo y hacia la cámara. La prueba auditiva comparativa con el Python original queda pendiente; el motor web no garantiza equivalencia sonora exacta.

La ampliación global va de 1,25× a 4×, inicialmente 2,2×. Dedos, mejillas, nariz y comisuras reciben una fracción menor del zoom. Las muñecas tienen mayor prioridad de aparición que los dedos (solo índice y medio). Los sonidos de bloques de mano toman la posición de su muñeca al nacer. Se añaden hombros, codos y caderas visibles, además de los bloques por movimiento de imagen. Los anclajes corporales y faciales siguen sus puntos detectados.


## Cámara, pantalla completa y compensación de movimiento

Cada inicio solicita frontal (sin recordar la trasera). El espejo sigue la orientación declarada por el dispositivo: frontal activado y trasera desactivado. En equipos sin información de orientación se consulta el nombre de la cámara y finalmente la preferencia solicitada. Si no existe cámara frontal o el navegador no admite esa restricción, se permite la cámara disponible. Ninguna web puede garantizar una cámara que el sistema no expone.

Los cambios de cámara liberan el stream anterior, limpian bloques y memoria de movimiento y descartan resultados pendientes de otra sesión. Las primeras seis muestras de análisis estabilizan el detector. No se usan sensores ni se piden permisos adicionales de movimiento.

Pantalla completa muestra únicamente el canvas y Salir. El canvas usa cover: no se deforma, pero puede recortar bordes para llenar el viewport. El vídeo, los blobs y las líneas se escalan juntos. Resize/orientación y entrada/salida de fullscreen reinician el análisis de movimiento. El botón requiere una sesión de cámara activa.

El análisis de movimiento utiliza imágenes de 80×60 a intervalos de 120 ms, hasta 48 puntos texturados, búsqueda local de parches y consenso robusto de una transformación afín. Compara el movimiento residual después de compensar desplazamiento, rotación y escala leves. Ignora nuevos bordes, tolera un píxel de cuantización durante movimiento coherente y elimina cambios uniformes de brillo. Un movimiento brusco o cambio amplio vuelve a estabilizar. Se reutilizan dos buffers de luminancia; el render conserva su resolución. La referencia de fondo es el fotograma anterior, actualizado incluso durante estabilización; no existe un modelo persistente de escena.

### Parámetros en config.js

| Parámetro | Inicial | Efecto al ajustar |
|---|---:|---|
| DEBUG | false | true muestra HUD y estados internos. Los errores útiles y la carga inicial siguen visibles fuera de fullscreen. |
| STABILIZATION_FRAMES | 6 | Aumentar prolonga la pausa tras cambios de encuadre; unos 0,7–0,9 s normalmente. Son muestras de análisis, no frames de render. |
| GLOBAL_MOTION_THRESHOLD | 0.65 | Movimiento mínimo en píxeles de análisis para activar tolerancia de bordes y exigir residuos agrupados. |
| CAMERA_SHAKE_THRESHOLD | 4 | Bajarlo hace que desplazamientos menores activen reestabilización. |
| GLOBAL_SUPPORT | 0.55 | Fracción de coincidencias coherentes requerida; además exige cobertura en tres cuadrantes. |
| RESIDUAL_THRESHOLD | 22 | Bajarlo detecta diferencias locales menores, pero puede incrementar ruido. No sustituye la compensación. |
| BROAD_CHANGE_FRACTION | 0.45 | Fracción de residuos que dispara pausa ante un cambio amplio. |
| MAX_TRACKING_POINTS | 48 | Más puntos puede mejorar consenso, a costa de procesamiento. |
| SEARCH_RADIUS | 6 | Alcance de búsqueda en píxeles de análisis. Aumentarlo cuesta más CPU. |
| WIDTH / HEIGHT | 80 / 60 | Resolución del análisis, independiente del canvas visible. |
| INTERVAL_MS | 120 | Intervalo entre análisis. Más alto reduce carga y puede perder movimientos rápidos. |

### Validación y límites

Las 15 pruebas anteriores y siete pruebas nuevas pasan: traslación global, rotación leve, objeto independiente con cámara quieta y en paneo, cambio brusco, reset y espejo. Entrada/salida de fullscreen verificadas en el navegador integrado con tests/presentation.html. No equivalen a probar cámara frontal/trasera y rendimiento en un teléfono físico.

En Chrome Android, comprobar con HTTPS: inicio frontal, trasera sin espejo, regreso frontal, detener/iniciar, paneo en habitación vacía, persona y objeto móvil, giro fuerte, rotación del teléfono y fullscreen. El navegador exige pulsación para fullscreen y puede impedirlo en iframes sin permiso. No se bloquea orientación. No se garantiza 60 FPS: depende del hardware, temperatura, resolución y los tres modelos de MediaPipe.

Límites del estimador: escena sin textura, desenfoque fuerte, paralaje de objetos cercanos, cambios de luz locales y una persona ocupando casi toda la imagen pueden confundirse con movimiento global. En cambios amplios se prioriza una pausa breve; puede omitir temporalmente movimiento real. Los landmarks de MediaPipe permanecen independientes de la compensación, pero la creación de todos los nuevos blobs se pausa durante estabilización. No se promete eliminación absoluta de falsos positivos.

Archivos de esta revisión: modificados app.js, tracker.js, index.html, style.css y README.md; añadidos config.js, motion.js, presentation.js, tests/motion.test.mjs y tests/presentation.html. La carpeta 00 backup no se modifica. No se ha actualizado automáticamente GitHub Pages.

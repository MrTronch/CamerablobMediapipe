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

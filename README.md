# Blob Tracking Cámara

Instrumento audiovisual para navegador, adaptado del proyecto Python con OpenCV, MediaPipe y Pygame. Cámara, ventanas de ampliación progresiva y cinco samples originales.

## Probar en computadora

Instala Node.js y ejecuta `npm start` en esta carpeta. Abre http://localhost:4173 y pulsa **Iniciar cámara y sonido**. No requiere instalar paquetes. No abras index.html con doble clic: la cámara y el worker necesitan HTTP local o HTTPS.

## iPhone y publicación

Sirve esta carpeta en un alojamiento HTTPS. Para GitHub Pages, sube su contenido a un repositorio y configura Pages para publicar desde la raíz de la rama elegida. No hay compilación ni servidor de producción. Abre la dirección HTTPS en Safari, toca Iniciar y acepta la cámara. El permiso y la activación del sonido dependen del navegador. La compatibilidad práctica, velocidad y audio deben verificarse en un iPhone real antes de considerar la versión final. Al salir de la página se detiene la sesión; vuelve a tocar Iniciar al regresar.

## Controles

- Cámara: selector de dispositivos; Cambiar cámara alterna preferencia frontal/trasera.
- Cuadrados por defecto; círculos y modo automático disponibles. 4–40 blobs (20 por defecto), duración máxima de 2–6 segundos y ampliación máxima. Cada bloque recibe su propia duración al nacer: entre 2 y 3 s con el máximo inicial de 3 s; al reducir el máximo, el mínimo es máximo menos 3, con piso de 2 s. El cambio afecta a los nuevos bloques. Cada ventana amplía vídeo en vivo mientras envejece, y desaparece de golpe al terminar su duración, sin fade de salida.
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

Pantalla completa muestra únicamente el canvas y Salir. El canvas usa contain: conserva el encuadre completo y la proporción de la fuente, con bandas negras cuando el viewport tiene otra proporción. La vista normal adapta su contenedor a la proporción de la cámara. El vídeo, los blobs y las líneas se escalan juntos. Resize/orientación y entrada/salida de fullscreen reinician el análisis de movimiento. El botón requiere una sesión de cámara activa.

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

La cámara ya no se detiene al ocultar la pestaña o cambiar de ventana. Detener, cerrar o recargar sí termina la sesión. Fondo negro y morado con contornos y ruido celular reactivos al audio de salida. El título usa ventanas de tracking y ampliación. Ver ACTUALIZAR-GITHUB.md para uso local y publicación.

En desktop se solicita 1280×720 (16:9) a la cámara. El panel muestra la resolución recibida. El fondo renderiza a 640×360 y se suaviza con un desenfoque de 2 px. Las cuatro ventanas del título recorren todo el ancho.

Abrir la boca activa además un ojo copiado en la frente con feedback de cinco segundos. El disparo usa histéresis: requiere cerrar la boca para volver a armarse y no prolonga el efecto por mantenerla abierta. Se limpia al detener o cambiar cámara/espejo. El fondo tiene bandas moradas más anchas y el título usa trayectorias aleatorias independientes.

Feedback actualizado: genera recortes durante cinco segundos. Cada recorte es opaco, permanece fijo en sus coordenadas originales y se elimina individualmente a los cinco segundos de su creación. Por eso los últimos recortes pueden permanecer hasta cinco segundos después de terminar la emisión. Abrir la boca invierte únicamente los tonos negro/morado del fondo; cerrar la boca o perder el rostro restaura la paleta. Título con seis ventanas de tamaño y zoom variables; fondo de flujo acuoso.

Pinza del rostro: junta pulgar e índice de una mano cerca de la cara para activar una copia del rostro. Separar los dedos en X/Y estira sus ejes de forma independiente. Se desactiva si se pierden los dedos, la mano o el rostro, o el seguimiento queda obsoleto. Los trazos duplican su grosor. Publicar también face-stretch.js. Prueba sintética: /tests/face-stretch.html.

Actualización de precisión: el ojo se recorta del mismo bitmap que procesa MediaPipe y se centra con esquinas y párpados. Se solicita un sello cada 33 ms (la frecuencia real depende del dispositivo); cada sello permanece opaco y fijo durante 10 segundos. El blob de pinza se dibuja por encima de todos los efectos y comienza con ampliación 1,3×. Se amplió la tolerancia del gesto y admite pinzas de una o dos manos cerca del rostro. Trazos del video: 4 píxeles. Recarga la página para reiniciar también el worker.

Ajuste actual: objetivo de captura del ojo 24 ms (la cadencia efectiva depende de cámara, análisis y pantalla). Blobs normales aproximadamente 30% más pequeños. Control Grosor: 1–10 px, paso 0,5. Dos manos abiertas en L con índices arriba y pulgares abajo definen el rectángulo de ampliación del rostro directamente; no necesitan pinza previa. La pinza individual sigue disponible.

Corrección de compatibilidad MediaPipe: no se exige visibility > 0,4 en landmarks de manos/rostro, porque el conversor de Tasks Vision utiliza 0 cuando no se informa ese campo. Se validan las coordenadas y la presencia de las listas de detecciones. El indicador MARCO muestra manos detectadas, rostro y activación. La prueba de sesión reproduce visibility:0 de extremo a extremo y permite ocultar manos para confirmar la retirada.

## Perfil optimizado actual
- Captura solicitada: 960×540, 16:9 en escritorio, hasta 30 fps. Seguimiento: imágenes de 480 px de ancho.
- Render de cámara y título: objetivo 30 fps. Rectángulo de manos interpolado con una constante de 70 ms entre resultados de MediaPipe.
- Predeterminados: 8 blobs, ampliación 1,7×. El control permite hasta 24 blobs.
- Fondo: generador 256×144 con 8 células, desenfoque de 6 px. Usa OffscreenCanvas en un worker cuando el navegador lo permite; evita encolar más de un fotograma de fondo.
- Se reutilizan imágenes del ojo cuando no ha llegado un nuevo bitmap analizado; los recortes mantienen su duración y posición.
- Publicar también atmosphere-field.js y atmosphere-worker.js junto con atmosphere.js.
- Prueba de coste: /tests/performance.html. En la comparación local la mediana del generador pasó de 373,4 ms (640×360, 20 células) a 69,0 ms (perfil optimizado), un 81,5% menos. Estas cifras comparan el coste del fondo, no los FPS de una cámara real; dependen del equipo y de la carga concurrente.

Filtro nuevo: blanco y negro + grano activado por defecto y desactivable en ajustes. El marco interpola con 48 ms y predicción limitada de 45 ms; se dibuja hasta 60 fps mientras está activo, manteniendo captura a 30 fps. Los fotogramas filtrados y las texturas de grano se reutilizan.

Ajuste actual: filtro con contraste 1,35 y brillo 0,96; grosor inicial 1,5 px. El marco mantiene su referencia inicial y estira el rostro con la separación de los dedos en ambos ejes. Tolera pérdidas breves de hasta 450 ms sin reiniciarse y se retira cuando la pérdida persiste.

Control de manos revisado: calibración fija en píxeles al activar, escala independiente X/Y sin renormalizar con el tamaño cambiante del rostro. Dos filtros de 70 ms aportan retardo suave (~140 ms), sin extrapolación ni saltos de modo. Retiene la última referencia durante 1200 ms de pérdida y luego se retira gradualmente en 300 ms. Al volver las manos antes de ese plazo, no recalibra. El indicador muestra escalas X/Y para confirmar la deformación.

## Estado final: respuesta directa y revisión para iPhone
Se retiraron los filtros temporales del marco: responde a la última detección sin retardo añadido. Se mantiene la retención ante pérdidas breves para reducir parpadeo. El tiempo de detección propio de MediaPipe sigue dependiendo del dispositivo.

Safari/iPhone: video inline con playsinline y webkit-playsinline; filtro por píxeles a resolución reducida si canvas.filter no existe; conversión a ImageBitmap mediante canvas si las opciones de video se rechazan; vista ampliada dentro de la página si no se puede usar pantalla completa nativa.

Se comprobaron 51 pruebas y tamaños de diseño 375×667, 393×852 y 852×393 sin desbordamiento. No se ejecutó Safari/WebKit ni una cámara física de iPhone en este entorno Windows. La validación final de cámara, audio y gestos debe hacerse en un iPhone.
Para probarlo: publica el contenido de github, abre la URL HTTPS de GitHub Pages en Safari y concede el permiso de cámara. Una dirección localhost de esta computadora no apunta a este servidor desde el teléfono.
Publica todos los archivos, incluido browser-compat.js.

## Marco de manos: correspondencia directa
El rectángulo de dos manos usa los dedos como bordes: izquierda/derecha a partir de los índices y pulgares de cada lado, arriba a partir de los índices y abajo a partir de los pulgares. Su ancho y alto son esas distancias en píxeles, sin factores de calibración del tamaño del rostro. La muestra más reciente se aplica de inmediato; entre muestras se usa predicción corta y acotada, sin una cola de suavizado con retardo. Las pérdidas breves conservan el efecto.

El seguimiento de manos y el de rostro/pose corren en trabajadores distintos: una inferencia lenta de pose no bloquea la respuesta de las manos. Se intenta GPU para manos y se usa CPU si la inicialización GPU no está disponible. El worker de rostro no encola fotogramas y se actualiza a menor frecuencia. Publicar también tracking-bridge.js y el tracker.js actualizado.

Verificado: 53 pruebas, geometría de dedos con cambios de tamaño del rostro y orden de manos, y modelos reales de MediaPipe detectando dos manos en la referencia local. La prueba de imagen estática no verifica la fluidez con una cámara física. Los archivos privados de work/ no forman parte de la copia github.

Ajuste vertical: arriba/abajo son los extremos de las cuatro puntas de pulgares e índices, sin promediar las alturas de las manos. Si se pierde brevemente una mano, la visible continúa ajustando su lado y la oculta conserva su última posición; el tiempo de retirada se sigue midiendo desde la última pareja completa. La velocidad estimada se estabiliza sin añadir una cola de retardo a las posiciones. Análisis móvil limitado a 480 px por el lado más largo.
Ojo: intervalo objetivo de 12 ms, cada recorte dura 10 segundos. Se reutilizan imágenes de la misma inferencia facial y no se dibujan sellos totalmente cubiertos por otros opacos. La captura efectiva queda limitada por cámara, inferencia y refresco de pantalla.

Capas actuales: ojos con escala 1,5× y contraste 1,6, opacos y dibujados al final por encima de todo. Al activarse el marco, únicamente la zona exterior de la imagen de cámara usa negativo (255−R, 255−G, 255−B); en blanco y negro se invierte su luminancia. El interior y el borde del marco se conservan. No afecta al fondo de la página ni al ojo superpuesto. Publicar también compositing.js. Prueba visual sintética: tests/layers.html.


## Ajuste actual: ojos y marco en cascada
La secuencia completa de ojos dura 5 segundos. Los recortes permanecen opacos y fijos; durante los últimos 350 ms se eliminan del más antiguo al más reciente. El marco de los dedos conserva su escala y añade 7 copias escalonadas detrás (8 cuadros en total), persistentes mientras el marco esté activo.


## Corrección del rastro por movimiento
Sustituye la cascada de desplazamientos fijos: ahora se conservan hasta 8 capturas opacas del marco en sus posiciones y escalas reales. Se capturan al moverse, como máximo cada 40 ms; las nuevas reemplazan las más antiguas. El rastro se limpia cuando termina el marco. Las imágenes se invierten fuera del rectángulo actual; todos los trazos verdes se dibujan después de esa inversión y los ojos encima de todo.


## Rastro actual: 14 capturas
El marco conserva 14 capturas históricas, además del cuadro vivo, con un intervalo mínimo de 100 ms entre capturas durante el movimiento. Las líneas y bordes de otros blobs quedan ocultos detrás de todos los cuadros. Los bordes de las copias antiguas también quedan ocultos por los cuadros más recientes. El seguimiento del cuadro vivo mantiene su cadencia independiente.


## Ojo de pez del rostro
En Editar, Ojo de pez · rostro regula la intensidad de 0 a 100%, con 25% inicial. A 0% se desactiva. Solo afecta al rostro del marco de las manos y a las nuevas capturas de su rastro; las capturas anteriores permanecen congeladas. El mapa se procesa a un máximo de 256 px por lado, con interpolación bilineal y caché por imagen/intensidad para limitar el coste.


## Valores finales
Ojo de pez del rostro: slider 0–20%, valor inicial 8%. Copias del rostro: slider 0–48, valor inicial 24; 0 elimina el rastro conservando el marco vivo, y bajar el valor elimina inmediatamente las capturas sobrantes. Intervalo entre capturas: 100 ms durante el movimiento. Todos los samples, incluido el de la boca, se reproducen una octava más grave (playbackRate × 0.5).

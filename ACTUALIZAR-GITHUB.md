# Actualizar GitHub Pages

La carpeta `github` contiene una copia del proyecto lista para subir. Sube **su contenido** a la raíz del repositorio CamerablobMediapipe, reemplazando los archivos existentes. No subas solamente index.html ni publiques una carpeta github anidada.

No requiere compilación. Conserva todos los módulos .js, style.css y assets (fuentes y samples). Incluye camera-filter.js, atmosphere-field.js y atmosphere-worker.js.

## Uso local
Abre INICIAR_WEB.bat y conserva la ventana del servidor. En el navegador, permite la cámara. No abras index.html directamente desde el Explorador.

## Versión actual
- Captura 960×540 y proporción 16:9 en escritorio; 8 blobs iniciales y zoom 1,7×.
- El marco del rostro utiliza dos manos en L y se dibuja por encima de los otros efectos. Se suaviza y predice su movimiento entre detecciones. El render intenta hasta 60 fps mientras está activo y 30 fps el resto del tiempo; depende del equipo.
- Filtro de cámara blanco y negro con grano activado por defecto. En ajustes, el interruptor «Blanco y negro + ruido» restaura el color y quita el grano. La conversión trabaja a 480 px y se reutiliza hasta que cambia el fotograma. No modifica la imagen usada para detectar movimiento.
- Fondo acuoso negro/morado en worker cuando el navegador admite OffscreenCanvas.
- Boca abierta: inversión del fondo y ojo con recortes fijos y opacos de diez segundos.
- Grosor ajustable de 1 a 10 px.

## Comprobaciones
46 pruebas Node, incluidas las de caché del filtro e interpolación. Pruebas visuales con fuente sintética en tests/session.html.
La cámara física y los FPS reales deben verificarse en el dispositivo de destino.

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

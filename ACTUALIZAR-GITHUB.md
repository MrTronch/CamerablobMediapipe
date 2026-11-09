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

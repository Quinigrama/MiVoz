# Sílabas con Mi Voz & Inglés en Voz Alta

Aplicación web desarrollada en **React + TypeScript + Vite** para clonar tu voz mediante concatenación de sílabas y practicar inglés en voz alta con reconocimiento de voz nativo y retroalimentación inteligente.

## Características

### 🗣️ Sílabas con Mi Voz
- **Síntesis por Concatenación**: Empalme de sílabas con fundido cruzado (crossfade), alineación de fase, filtrado y normalización.
- **Entonación y Prosodia**: Ajuste de contorno melódico (acentos de palabra, preguntas, cadencias finales) con algoritmo **TD-PSOLA** y tono deslizante (glide).
- **Lectura Guiada**: Grabación guiada de frases seleccionadas para cobertura fonética óptima, modo karaoke a velocidad ajustable y troceado automático de palabras y sílabas mediante curvas de energía vocálica.
- **Editor Interactivo de Cortes**: Ajuste visual y táctil de las fronteras de corte entre sílabas en el lienzo de forma de onda, con aprendizaje automático de sesgos de corte por fonética (abierta, cerrada, hiato).
- **Sílaba Suelta**: Grabación directa con detección de voz y recorte automático de silencios.
- **Banco de Sílabas**: Almacenamiento en IndexedDB con soporte para hasta 5 versiones por sílaba, selección de unidades, detector de versiones anómalas (saturadas, duración o tono extremo) y exportación/importación en formato ZIP (.wav + fichas.json).
- **Generador de Frases Aleatorias**: Creador de historias breves y coherentes con máxima cobertura de sílabas ya grabadas.

### 🇬🇧 Inglés en Voz Alta
- **Lectura**: Práctica frase a frase con voz nativa (TTS) y reconocimiento de voz (Speech Recognition), con resaltado de pronunciación (verde, ámbar, rojo) y cálculo de puntuación mediante alineación LCS.
- **Diálogo**: Modo interactivo con selección de personaje y modo reto (ocultar texto).
- **Palabras Difíciles**: Tarjetas interactivas para dominar términos difíciles tras 3 aciertos consecutivos.
- **Hablar Libre**: Práctica de fluidez oral con temas sugeridos, cronómetro y cálculo de palabras por minuto (WPM).
- **Corregir**: Sugerencias de versiones formales y naturales con explicaciones pedagógicas.

### 👤 Multiusuario
- Selector de usuarios en cabecera con espacio de almacenamiento e historial independiente por usuario.

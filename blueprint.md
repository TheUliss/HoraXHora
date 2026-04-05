# Blueprint: Aplicación de Control de Producción

## Visión General

Esta aplicación es una herramienta de seguimiento de la producción diseñada para que los supervisores y gerentes de línea monitoreen el progreso del trabajo en una planta de fabricación. Permite la definición de operaciones, el seguimiento de artículos individuales a través de esas operaciones y la visualización de datos de producción en tiempo real.

## Características Principales

- **Gestión de Operaciones:**
  - Crear, reordenar y eliminar operaciones de producción.
  - Marcar una operación como la "última" para determinar cuándo se completa un artículo.
- **Seguimiento de Artículos:**
  - Agregar artículos con un límite de "puntas" (unidades de producción).
  - Registrar la cantidad de puntas completadas para cada artículo en intervalos de tiempo por hora.
  - Asignar la operación actual a cada entrada de tiempo.
- **Visualización de Datos:**
  - Una tabla principal que muestra los artículos "en proceso" con su progreso y datos por hora.
  - Pestañas para ver artículos "terminados" y un "resumen" de los artículos pendientes.
  - Estadísticas clave que muestran el recuento de artículos en proceso, terminados, el total de puntas y los artículos que exceden su límite.
- **Modo de Edición:**
  - Un interruptor para alternar entre el modo de "edición" (que permite la entrada y modificación de datos) y el modo de "visualización" (solo lectura).
- **Configuración y Compartir:**
  - Un modal para configurar detalles del reporte como el área, el turno y el supervisor.
  - Funcionalidad para generar y compartir un resumen del reporte a través de texto o WhatsApp.
- **Persistencia de Datos:**
  - Los datos de operaciones, artículos y configuración se guardan en el `localStorage` del navegador para que persistan entre sesiones.
- **Capacidades de PWA:**
  - Incluye un `manifest.json` y un `service-worker.js` para permitir la instalación en dispositivos y la funcionalidad sin conexión.

## Estructura del Proyecto

- **`index.html`**: El archivo HTML principal que contiene la estructura de la aplicación.
- **`style.css`**: La hoja de estilos que define la apariencia visual completa de la aplicación.
- **`main.js`**: El archivo JavaScript que contiene toda la lógica de la aplicación, incluyendo la manipulación del DOM, la gestión de datos y el manejo de eventos.
- **`manifest.json`**: El manifiesto de la aplicación web que describe la PWA.
- **`sw.js`**: El service worker para la funcionalidad sin conexión.
- **`/icons`**: Una carpeta que contiene los íconos de la aplicación para la PWA y los accesos directos.

## Plan Actual: Corrección y Estructuración

Este plan inicial se centró en corregir el malentendido anterior y estructurar correctamente el proyecto basándose en el código proporcionado.

1.  **Reemplazar HTML:** Se reemplazó el `index.html` inicial con el código correcto de la aplicación de control de producción.
2.  **Separar Archivos:** Se extrajo el CSS y el JavaScript a sus propios archivos, `style.css` y `main.js`, para una mejor organización.
3.  **Crear Archivos PWA:** Se crearon los archivos `manifest.json` y `sw.js` para dar soporte a las características de Progressive Web App.
4.  **Crear Íconos:** Se creó la carpeta `icons` y se añadieron íconos de marcador de posición para evitar errores 404.
5.  **Actualizar Blueprint:** Se actualizó este `blueprint.md` para reflejar con precisión el estado y la funcionalidad actuales del proyecto.
# Reemplazar la app al actualizar

Status: Done

Labels: ready-for-agent

## Comments

Implementado actualizador local con verificación y helpers de reemplazo Windows/Mac. La prueba nativa de Windows sustituye un ejecutable real y restaura la versión anterior ante fallo de lanzamiento. Interfaz con progreso y reinicio separado, vaciado de guardados y protección de borradores.

Publicada v0.6.0 en la cuenta kuaanii. CI 39943513049 completa en Windows x64, Mac Intel y Apple Silicon, incluidas las pruebas nativas de sustitución. Paquetes publicados y SHA-256 comprobados; detección anónima de la versión verificada para las tres plataformas. Auditoría de publicación sin datos personales ni secretos. Migración local inicial desde 0.5.1 preparada y verificada; pendiente cierre normal del usuario para conservar los últimos apuntes.

Migración local completada tras el cierre normal confirmado por el usuario. La versión 0.6.0 está abierta en la ruta instalada anterior, el documento de agenda pasa la validación y queda un solo ejecutable en la carpeta de instalación. Caché de descarga y copia de recuperación retiradas; recibo de instalación `complete`. En esta migración externa se normalizó la ruta del recibo antes de completar la limpieza; las actualizaciones iniciadas desde la app usan la misma ruta de destino en todo el proceso.

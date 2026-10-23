# Reemplazar la app al actualizar

Status: In progress

Labels: ready-for-agent

## Comments

Implementado actualizador local con verificación y helpers de reemplazo Windows/Mac. La prueba nativa de Windows sustituye un ejecutable real y restaura la versión anterior ante fallo de lanzamiento. Interfaz con progreso y reinicio separado, vaciado de guardados y protección de borradores.

Publicada v0.6.0 en la cuenta kuaanii. CI 39943513049 completa en Windows x64, Mac Intel y Apple Silicon, incluidas las pruebas nativas de sustitución. Paquetes publicados y SHA-256 comprobados; detección anónima de la versión verificada para las tres plataformas. Auditoría de publicación sin datos personales ni secretos. Migración local inicial desde 0.5.1 preparada y verificada; pendiente cierre normal del usuario para conservar los últimos apuntes.

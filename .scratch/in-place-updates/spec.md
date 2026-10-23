# Actualización en la misma ubicación

El usuario quiere una sola aplicación actualizada, sin abrir el navegador ni conservar ejecutables antiguos junto a los nuevos.

- Windows: sustituir exactamente el ejecutable portable desde el que se está ejecutando; mantener accesos y perfil.
- Mac Intel/Apple Silicon: actualizar el mismo paquete .app, fuera de la imagen DMG, validando identificador, versión, arquitectura y firma ad hoc.
- Descargar desde la release oficial a caché privada, con límite de tamaño, redirecciones restringidas y SHA-256 del archivo publicado.
- Descargar/verificar y reiniciar son acciones separadas. Guardar notas antes de reiniciar y bloquear borradores/importaciones pendientes.
- Sustituir después del cierre normal. Conservar recuperación temporal; restaurar si falla el reemplazo/arranque y limpiar respaldo y caché tras el primer arranque válido.
- Mensajes/progreso/errores EN, ES y FR. Desarrollo y DMG montado no pueden auto sustituirse.
- Validar helpers nativos, integridad, restauración y persistencia; publicar 0.6.0 y migrar la instalación local del usuario sin duplicados.

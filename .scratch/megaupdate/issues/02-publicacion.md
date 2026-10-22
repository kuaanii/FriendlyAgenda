# Publicar la versión 0.5.0

Status: Waiting for input

Labels: ready-for-human

Blocked by: restaurar la sesión de GitHub de kuaanii en Git Credential Manager.

## Comments

El código inicial está subido y los tres paquetes han pasado GitHub Actions, ejecución 39773880971. Los ajustes finales están confirmados localmente. La cuenta personal dejó de estar disponible en Git Credential Manager durante la revisión; se ha solicitado iniciar sesión con `git credential-manager github login --username kuaanii --browser`. No utilizar la cuenta del instituto para publicar.

Cuando se restaure: subir main, ejecutar Desktop builds sobre el commit final, comprobar los tres trabajos, descargar y verificar sus artefactos, preparar el archivo de código fuente y SHA256SUMS-0.5.0.txt, publicar la Release estable v0.5.0 con los cinco archivos y comprobar los enlaces del actualizador para Windows, macOS arm64 y macOS x64. Las notas y los ayudantes de publicación están preparados en release/, que está excluido del repositorio.

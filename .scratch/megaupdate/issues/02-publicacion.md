# Publicar la versión 0.5.0

Status: Done

Labels: ready-for-agent

## Comments

Sesión personal de kuaanii restaurada y cambios finales subidos. La ejecución Desktop builds 39798826574 generó los tres paquetes desde 3acc6a758dbe033317d9bc44b19c0f776f09483b. Los registros completos confirman 28 pruebas de lógica, 23 de interfaz, dos pruebas contra la aplicación empaquetada y auditoría sin hallazgos en Windows x64, macOS arm64 y macOS x64. Las firmas de integridad de Mac se verificaron durante el trabajo.

Los tres archivos de artefactos se descargaron y sus SHA-256 coincidieron con GitHub antes de extraerlos. Publicada la versión estable v0.5.0 desde kuaanii, con los tres ejecutables, código fuente del mismo commit y SHA256SUMS-0.5.0.txt. Los cinco archivos publicados coinciden en tamaño y SHA-256 con los locales. La etiqueta apunta al commit compilado.

El comprobador de actualizaciones de la aplicación, sin credenciales, detecta 0.5.0 y selecciona el archivo correcto para Windows, Mac Apple Silicon y Mac Intel. Publicación: https://github.com/kuaanii/FriendlyAgenda/releases/tag/v0.5.0. Compilación: https://github.com/kuaanii/FriendlyAgenda/actions/runs/39798826574.

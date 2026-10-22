# Publicar una nueva versión

El aviso integrado consulta la última GitHub Release estable de `kuaanii/FriendlyAgenda`, no los commits. Para que los usuarios puedan recibir una actualización:

1. Incrementa `version` en package.json con una versión estable de tres números, por ejemplo `0.4.0`.
2. Ejecuta `pnpm test`, `pnpm test:ui`, `pnpm build` y `pnpm audit:publication`. Comprueba también `pnpm test:desktop` y los cambios visuales que correspondan.
3. Ejecuta **Desktop builds** en GitHub Actions y espera a que pasen los tres trabajos. Descarga sus artefactos: `FriendlyAgenda-0.4.0-Windows.exe`, `FriendlyAgenda-0.4.0-macOS-arm64.dmg` y `FriendlyAgenda-0.4.0-macOS-x64.dmg`. Para compilar localmente, usa `pnpm pack:win` en Windows o `pnpm pack:mac` en cada arquitectura de Mac.
4. Sube el código al repositorio desde la cuenta personal `kuaanii`.
5. En GitHub, crea una Release con etiqueta `v0.4.0`, adjunta los tres binarios con esos nombres exactos y añade las notas de cambios. Publica la Release como estable, sin marcarla como borrador ni prerelease. Es conveniente preparar todo en borrador y publicar cuando los archivos estén disponibles.

La aplicación avisa únicamente cuando la versión es mayor que la instalada y hay un binario para su sistema y arquitectura con nombre y dirección de descarga correspondientes al repositorio. Esto evita ofrecer borradores, versiones de prueba, descargas externas o versiones sin binario compatible.

Publica los ejecutables y sus comprobaciones SHA-256 como archivos de la Release, no como archivos del historial Git. No subas `release/`, `.env`, copias de agenda, carpetas de datos ni credenciales.

## Cuenta de GitHub

Este repositorio usa el destino `https://github.com/kuaanii/FriendlyAgenda.git`. Si conviven cuentas personales y de trabajo o estudios, selecciona `kuaanii` en Git Credential Manager para esta publicación y verifica la identidad autenticada antes de subir. No hace falta cambiar la configuración global de Git ni usar un correo personal en los commits.

## macOS

Los DMG se construyen en Mac nativos, con icono de 1024 píxeles y firma ad hoc. La integración incluye menú de aplicación, edición con ⌘, pantalla completa y reapertura desde el Dock tras cerrar la última ventana. La firma ad hoc no sustituye un certificado Developer ID ni la notarización de Apple; no se anuncian como notarizados. Para una distribución notarizada futura, configura las credenciales de Apple mediante secretos de CI y actualiza la configuración de firma. Nunca las guardes en el repositorio.

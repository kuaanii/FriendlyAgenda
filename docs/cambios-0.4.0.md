# FriendlyAgenda 0.4.0

Versión para Windows x64 y macOS, con DMG independientes para Apple Silicon e Intel. En Mac se integran el menú de aplicación, los atajos habituales con Command, la pantalla completa y la reapertura desde el Dock cuando no quedan ventanas abiertas. El icono incluye una imagen de 1024 píxeles.

La interfaz usa inglés por defecto y permite cambiar a español o francés desde el selector junto a las fechas. Sigue visible en modo agenda ampliada. Se traducen fechas, editor, diálogos propios, menús, mensajes y avisos de actualización. La preferencia se guarda localmente y se incluye en las copias. No se traducen ni modifican las notas o los nombres de las asignaturas del usuario. Las agendas anteriores sin idioma siguen siendo compatibles y se abren en inglés.

Las actualizaciones seleccionan el ejecutable de Windows o el DMG correspondiente a la arquitectura de la aplicación de Mac. Se mantienen la comprobación anónima, la validación de direcciones y la descarga únicamente a elección del usuario.

Los catálogos están separados en `src/locales/` para facilitar la incorporación de nuevos idiomas. La validación rechaza preferencias no admitidas al importar un documento.

## Verificación

La [ejecución de GitHub Actions](https://github.com/kuaanii/FriendlyAgenda/actions/runs/39768209934) ha terminado correctamente en Windows x64, macOS arm64 y macOS x64, usando el código de aplicación del commit `7d6cfbe9517e8a6441b50c8baa27a98a4e5cf478`.

Cada sistema ha superado 16 pruebas de lógica, 19 pruebas de interfaz y una prueba de la aplicación empaquetada: edición, formato, persistencia en disco, reapertura y notas largas. En Mac se comprueba también la reapertura de la ventana y la integridad de la firma mediante `codesign --verify --deep --strict`. La auditoría de publicación no ha detectado datos personales ni credenciales en los archivos actuales, el historial o los recursos de la interfaz generados.

Los paquetes de Mac usan firma ad hoc y no están notarizados por Apple. El README explica la primera apertura y la selección de arquitectura. La integración de un certificado Developer ID y la notarización quedan para una futura versión con las credenciales de distribución correspondientes.

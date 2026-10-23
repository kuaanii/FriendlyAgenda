# FriendlyAgenda 0.6.0

Actualizaciones dentro de la aplicación: la descarga oficial se guarda en una caché privada y se verifica contra SHA-256. **Reiniciar para actualizar** guarda las notas, cierra la app normalmente, reemplaza el mismo ejecutable portable de Windows o el mismo paquete .app de Mac y lo vuelve a abrir. Se mantienen el acceso, los ajustes y los apuntes.

La copia anterior se conserva temporalmente para recuperación y se elimina junto con la descarga tras un arranque válido. Si falla el reemplazo o el lanzamiento, se restaura la versión anterior. Los errores de descarga/integridad no sustituyen la instalación. No se abren descargas en el navegador ni se escriben nuevos ejecutables en Descargas.

En Windows se admite la distribución portable; en Mac, la app debe haberse copiado a una ubicación escribible (normalmente Aplicaciones). La comprobación de Mac incluye versión, identificador, arquitectura y firma de integridad. No se ejecuta el reemplazo en desarrollo ni directamente desde un DMG montado. La app conserva los tres idiomas y el funcionamiento local sin conexión.

La 0.5.1 y anteriores necesitan un último reemplazo manual para incorporar este mecanismo; las siguientes actualizaciones desde 0.6.0 se realizan dentro de la app. No se borran ejecutables ajenos o descargas antiguas que existieran previamente.

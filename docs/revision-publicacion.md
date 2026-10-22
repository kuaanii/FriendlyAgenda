# Revisión previa a la publicación

## Privacidad

Se revisaron los archivos destinados a Git y los blobs de todo el historial local: nombres de archivos sensibles, patrones de credenciales, claves privadas, rutas de perfiles personales, direcciones de correo y metadatos PNG. No se detectaron secretos ni información personal privada en el material revisado.

Los commits existentes usan una identidad genérica de los colaboradores. Se identificó y descartó como falso positivo el contacto público del mantenedor de una dependencia en pnpm-lock.yaml. Las capturas de la documentación corresponden a contenido de prueba generado para verificar la interfaz.

.gitignore excluye archivos .env y variantes, configuración local de npm, claves y certificados privados, credenciales, datos de agenda, bases de datos, copias de seguridad y resultados de compilación. Los ejecutables y archivos de la publicación se adjuntan como assets de GitHub Releases; no se suben las carpetas locales de compilación.

El comprobador se puede repetir con `pnpm audit:publication`. Las detecciones automáticas complementan la revisión; no garantizan identificar cualquier secreto posible.

## Cuenta y destino

Destino público: https://github.com/kuaanii/FriendlyAgenda. Se comprobó mediante la API autenticada de GitHub que la cuenta usada para esta publicación es kuaanii. La selección de credenciales se configura únicamente en el repositorio local; no cambia la configuración global del equipo. Las credenciales no se guardan en archivos del proyecto.

## Actualizaciones

El proceso principal consulta exclusivamente la API pública de Releases del repositorio. La consulta no incluye datos de agenda, credenciales ni identificadores de usuario. Las conexiones web exponen a GitHub la información normal de red, incluida la IP.

Se comprueba al arrancar, cada seis horas y al recuperar la conexión. Sin conexión la agenda permanece utilizable. Solo se ofrecen versiones estables mayores que la instalada y ejecutables de Windows con nombre y URL exactos del repositorio. La elección del usuario abre la descarga en el navegador; la aplicación no instala actualizaciones automáticamente.

Pruebas añadidas: comparación numérica de versiones, rechazo de borradores y descargas externas, límites de peticiones, ausencia de releases, funcionamiento sin red, aviso inicial, decisión explícita de descargar y comprobación manual.

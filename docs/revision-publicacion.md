# Revisión previa a la publicación

## Privacidad

Se revisaron los archivos destinados a Git, los blobs y todas las rutas de todo el historial local, además de los recursos de la compilación de producción: nombres de archivos sensibles, patrones de credenciales, claves privadas, rutas de perfiles personales, direcciones de correo y metadatos PNG. No se detectaron secretos ni información personal privada en el material revisado.

Los commits existentes usan una identidad genérica de los colaboradores. Se identificó y descartó como falso positivo el contacto público del mantenedor de una dependencia en pnpm-lock.yaml. Las capturas de la documentación corresponden a contenido de prueba generado para verificar la interfaz.

.gitignore excluye archivos .env y variantes, configuración local de npm, claves y certificados privados, credenciales, datos de agenda, bases de datos, copias de seguridad y resultados de compilación. Los ejecutables y archivos de la publicación se adjuntan como assets de GitHub Releases; no se suben las carpetas locales de compilación.

El comprobador se puede repetir con `pnpm audit:publication`. Las detecciones automáticas complementan la revisión; no garantizan identificar cualquier secreto posible.

## Cuenta y destino

Destino público: https://github.com/kuaanii/FriendlyAgenda. Se comprobó mediante la API autenticada de GitHub que la cuenta usada para esta publicación es kuaanii. La selección de credenciales se configura únicamente en el repositorio local; no cambia la configuración global del equipo. Las credenciales no se guardan en archivos del proyecto.

## Actualizaciones

El proceso principal consulta la API pública de Releases del repositorio. Desde 0.3.1, si la API falla o limita peticiones, utiliza los enlaces públicos de versiones y assets de GitHub mediante peticiones HEAD sin descargar contenido del ejecutable. La consulta no incluye datos de agenda, credenciales ni identificadores de usuario. Las conexiones web exponen a GitHub la información normal de red, incluida la IP.

Se comprueba al arrancar, cada seis horas y al recuperar la conexión. Sin conexión la agenda permanece utilizable. Solo se ofrecen versiones estables mayores que la instalada y ejecutables de Windows con nombre y URL exactos del repositorio. La elección del usuario abre la descarga en el navegador; la aplicación no instala actualizaciones automáticamente.

Pruebas añadidas: comparación numérica de versiones, rechazo de borradores y descargas externas, límites de peticiones, ausencia de releases, funcionamiento sin red, aviso inicial, decisión explícita de descargar y comprobación manual.

## Revisión independiente

La revisión de estándares encontró dos problemas: el recordatorio periódico podía saltarse un ciclo por diferencias en la latencia de las respuestas, y la deduplicación de blobs podía omitir un nombre histórico sensible. La revisión de requisitos también detectó el problema del recordatorio. Se corrigieron ambos casos y se añadieron pruebas que reproducen el fallo antes de la corrección: reloj simulado con respuesta inicial lenta y repositorio temporal con un mismo contenido renombrado a .env y de vuelta a un nombre permitido.

Ambos revisores confirmaron las correcciones en el commit 1fadca4, sin defectos pendientes en esos hallazgos. Verificación final: 10 pruebas del modelo, almacenamiento, actualizaciones y auditoría; 16 pruebas de interfaz; y una prueba de escritorio sobre el programa empaquetado. Todas superadas. La auditoría de publicación no detectó hallazgos en archivos actuales, historial completo y recursos compilados.

Después de publicar 0.3.0 se comprobó que la API anónima estaba limitada desde la red de verificación. La versión 0.3.1 añade una alternativa de consulta pública, probada contra la publicación real, y dos regresiones sobre límites de API y rechazo de redirecciones externas. La alternativa validó la versión y la existencia del ejecutable sin descargarlo.

La revisión estática adicional del commit cffeac5 no encontró problemas en la ruta alternativa. En 0.3.1 se han superado 12 pruebas de datos, auditoría y actualizaciones, 16 de interfaz y una de escritorio empaquetado: 29 en total. La configuración local de Git mantiene la identidad genérica y selecciona kuaanii para la autenticación; no utiliza la identidad global del equipo para los commits de este repositorio.

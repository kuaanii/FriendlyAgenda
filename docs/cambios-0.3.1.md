# FriendlyAgenda 0.3.1

Añade una vía alternativa de comprobación de actualizaciones cuando la API pública de GitHub está limitada o no responde. Se utiliza el enlace público de la última Release y se comprueba que existe el ejecutable, sin descargar su contenido.

Las redirecciones se validan: repositorio exacto en GitHub, etiqueta de versión estable y host oficial de assets. No se incluyen credenciales ni datos de agenda. Se mantiene la elección explícita del usuario antes de abrir la descarga.

Pruebas de regresión para API limitada y rechazo de redirecciones ajenas. El resto de la interfaz y el formato de datos permanecen compatibles.

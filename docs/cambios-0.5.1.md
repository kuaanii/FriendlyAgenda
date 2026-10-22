# FriendlyAgenda 0.5.1

Corrección del icono de Electron en Windows:

- La ventana declara la identidad, el nombre y el icono de FriendlyAgenda para la barra de tareas y el relanzamiento.
- Iconos ICO/PNG persistentes en el perfil local, independientes de la carpeta temporal del portable.
- Acceso de Inicio actualizado con la misma identidad e icono; nombre e imagen explícitos para el emisor de notificaciones y para cada aviso.

No cambia el formato de la agenda ni sus datos. Mac conserva su identidad de paquete y los tres idiomas.

La prueba de escritorio consulta las propiedades nativas de la ventana mediante SHGetPropertyStoreForWindow: falla con 0.5.0 y pasa con la corrección. Pruebas adicionales comprueban el ICO/PNG, la identidad compartida, las rutas persistentes, el acceso portable y el aislamiento de perfiles de prueba.

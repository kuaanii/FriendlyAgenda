# Identidad de Windows e iconos

El usuario ve el icono de Electron en la barra de tareas y en los avisos de producción, aunque el ejecutable y la bandeja muestran FriendlyAgenda. Corregir con una actualización pequeña.

La ventana debe declarar explícitamente AppUserModelID, icono de relanzamiento, nombre y comando. Acceso de Inicio e identidad de notificaciones deben compartir el identificador, con ICO/PNG persistentes fuera de la extracción temporal portable. Cada aviso recibe el PNG oficial. Mantener los datos locales y el comportamiento de Mac.

Validar contra las propiedades nativas de la ventana y los accesos, además de las pruebas existentes; publicar 0.5.1 para los tres destinos.

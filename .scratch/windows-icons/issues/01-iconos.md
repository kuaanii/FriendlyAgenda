# Corregir iconos de barra de tareas y avisos

Status: In progress

Labels: ready-for-agent

## Comments

Reproducción nativa con el paquete anterior: SHGetPropertyStoreForWindow devuelve AppUserModelID vacío para la ventana 0.5.0. La prueba espera org.friendlyagenda.desktop y falla. Con el cambio, las propiedades de identidad, icono y relanzamiento pasan en el escritorio real de Windows. Las 31 pruebas de lógica y dos de escritorio pasan localmente. Pendiente regenerar paquetes, verificar y publicar 0.5.1.

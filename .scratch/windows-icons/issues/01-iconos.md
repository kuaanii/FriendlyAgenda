# Corregir iconos de barra de tareas y avisos

Status: Done

Labels: ready-for-agent

## Comments

Reproducción nativa con el paquete anterior: SHGetPropertyStoreForWindow devuelve AppUserModelID vacío para la ventana 0.5.0. La prueba espera org.friendlyagenda.desktop y falla. Con el cambio, las propiedades de identidad, icono y relanzamiento pasan en el escritorio real de Windows, tanto desde el código como desde el paquete final.

La ejecución 39807260492 compiló f2a980c para Windows, Mac Intel y Mac Apple Silicon; los tres trabajos terminaron correctamente con 31 pruebas de lógica, 23 de interfaz, dos de escritorio y auditoría sin hallazgos. La etiqueta v0.5.1 apunta a aac74d2, que solo añade la actualización de nombres de archivo en README sobre ese código. Los artefactos descargados coinciden con los SHA-256 de Actions.

Publicada https://github.com/kuaanii/FriendlyAgenda/releases/tag/v0.5.1 desde kuaanii con tres paquetes, fuentes y sumas de verificación. Los cinco archivos publicados coinciden con los locales en tamaño y SHA-256. El actualizador anónimo detecta 0.5.1 y ofrece el archivo correcto para los tres destinos. No se ha cerrado ni sustituido la instancia personal abierta del usuario; debe salir desde la bandeja antes de ejecutar la actualización.

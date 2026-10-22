# FriendlyAgenda 0.2.1

Corregido el desbordamiento de notas largas en la vista principal. Cada día conserva su altura y desplaza internamente el contenido que no cabe, con la barra oculta. El texto ya no invade el título del día siguiente. La vista ampliada conserva su distribución adaptable al tamaño de la ventana.

La causa era que solo la vista inmersiva limitaba y contenía el desbordamiento; en la principal los elementos flexibles podían desbordarse o desplazar el siguiente día.

Verificación: 6 pruebas de datos, 12 de interfaz y una de escritorio, todas superadas. Las tres regresiones nuevas prueban 80 líneas en ventanas de 1000, 1440 y 1700 píxeles, escritura al final, posición estable del siguiente día y persistencia al recargar. La prueba de escritorio verifica también la corrección en el programa empaquetado sin conexión.

Los datos siguen siendo compatibles con las versiones anteriores. Cierra la aplicación anterior antes de abrir el ejecutable 0.2.1.

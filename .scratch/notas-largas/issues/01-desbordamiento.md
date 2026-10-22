# Contener notas largas en la vista principal
Status: resolved
Blocked by: none

El usuario observa que muchas líneas en un día se superponen al título del día siguiente en la vista principal; la vista ampliada funciona correctamente. Limitar la altura de cada día y desplazar internamente su contenido, manteniendo la barra oculta y conservando las notas.

## Comments
Reproducción automática a 1000, 1440 y 1700 píxeles: el día siguiente se desplazaba entre 561 y 635 píxeles y no había un área interna de scroll. Se fijó la altura del día en la vista principal y se mantuvo la altura adaptable de la vista inmersiva. Las tres regresiones verifican desplazamiento interno, escritura al final y persistencia tras recargar.

Entregada versión 0.2.1. Pasan 6 pruebas de datos, 12 de interfaz y una de escritorio. Verificada también la contención de notas de 80 líneas en el programa empaquetado. No cambia el formato ni la ubicación de los datos.

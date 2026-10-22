# Revisión de la primera versión

Referencia inicial: `58d4f71`; implementación revisada: `2a9f321`. Se realizaron dos revisiones independientes, de estándares y de requisitos, mediante la skill code-review.

## Standards

1. **P1 — Tamaño de documentos:** el guardado podía generar un archivo de más de 20 MB que la lectura posterior rechazaba. Corregido: guardado, exportación e importación aplican el mismo límite medido en bytes UTF-8 antes de escribir. Prueba de regresión con texto multibyte.
2. **P2 — Estructura de notas:** el validador aceptaba combinaciones de nodos que el editor no podía representar. Corregido: se comprueban relaciones entre bloques, párrafos, listas, elementos e interiores de código antes de sustituir datos. Pruebas de árboles inválidos.

## Spec

1. **P2 — Colores pegados:** el editor admitía colores CSS que el guardado rechazaba. Corregido: el modelo admite colores CSS limitados a valores seguros de color; una prueba pega texto RGB, lo convierte en lista numerada y verifica que conserva su color al recargar. Se admite también el atributo de tipo de numeración que produce Tiptap.
2. **P2 — Tamaño de documentos:** mismo problema detectado en Standards, resuelto con una única implementación.
3. **P2 — Avisos de importación:** los errores podían quedar detrás del diálogo modal. Corregido: los avisos aparecen dentro del diálogo activo, con prueba de importación inválida.

La revisión inicial encontró 2 problemas en Standards (máximo P1) y 3 en Spec (máximo P2), con un problema compartido. Se corrigieron los cuatro problemas distintos. No quedaron requisitos principales ausentes en la revisión.

## Verificación

- 6 pruebas del modelo y almacenamiento: fechas, persistencia, recuperación del archivo anterior, rechazo de copias inválidas, límite de tamaño y estructura documental.
- 6 pruebas de interfaz: creación y finalización de deberes, edición y búsqueda, navegación y tema, capturas de ambos temas y ventana compacta, exportación/restauración con formato, listas y colores pegados, errores dentro del diálogo.
- Prueba de escritorio con datos temporales: ejecución sin conexión, escritura real en disco, cierre y reapertura; realizada también con el ejecutable empaquetado.
- Compilación de producción y formato Prettier comprobados.

## Límites de la entrega

Primera versión para Windows x64, sin firma digital y sin publicación remota. Los datos son locales y no están cifrados. La copia automática conserva el guardado anterior; se recomienda exportar copias independientes para conservar historial. El tamaño máximo de una agenda es de 20 MB.

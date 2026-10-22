# FriendlyAgenda 0.5.0

Actualización para Windows x64, macOS Intel y macOS Apple Silicon, con interfaz en inglés, español y francés.

- Apuntes de todo el día o con hora de entrega/inicio y fin opcional; lugar, detalles y recordatorio individual.
- Tipos: deber, examen, entrega, cumpleaños, reunión, cita, clase, estudio, vacaciones, evento y otro.
- Notificaciones nativas locales, recuperación de avisos pendientes y registro persistente para evitar duplicados. Repetición diaria de atrasados durante siete días y parada al completar o desactivar un apunte.
- Opción de segundo plano al cerrar, con icono de bandeja en Windows o de barra de menús en Mac. Salida explícita, restauración y apertura del día desde el aviso. Los permisos y modos de concentración del sistema siguen siendo necesarios; la aplicación debe estar ejecutándose.
- Importación local ICS de Google, Outlook, Apple y otros calendarios compatibles, además de CSV habituales de Google y Outlook. Vista previa, selección, combinación y deduplicación sin sustituir las notas. Soporte de zonas horarias, recurrencias, excepciones y eventos de varios días dentro del intervalo elegido. Las alarmas externas se sustituyen solo si se activan los recordatorios de la selección.
- Tema del sistema por defecto en agendas nuevas, seguimiento de cambios en vivo y opciones manuales persistentes.

El formato se amplía de manera compatible para leer agendas anteriores. Las versiones antiguas pueden no entender los tipos, preferencias y campos nuevos: utiliza 0.5.0 o posterior para las nuevas copias.

## Verificación

Pruebas de calendario y cambios de horario, recurrencias y excepciones, todo el día, CSV, importación sin pérdida ni duplicados, temporización y repetición de avisos, historial tras reiniciar, tipos, validación, tema del sistema, preferencias de notificaciones y vista previa. Las pruebas de integración de escritorio ejercitan el worker, IPC, disco, registro de notificaciones de Windows y cierre/restauración de la bandeja; simulan únicamente la entrega visual del aviso para evitar permisos y alertas reales en CI.

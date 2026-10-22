# Recordatorios e importación de calendarios

Status: Done

Labels: ready-for-agent

## Comments

Implementación y pruebas completadas. La ejecución 39773880971 ha compilado y probado Windows x64, macOS arm64 y macOS x64 desde 0690248: 27 pruebas de lógica, 23 de interfaz y dos de escritorio por plataforma. La revisión final añade validación de CSV, un ensayo de cumpleaños anuales y ajustes de presentación; las 28 pruebas de lógica, los ensayos de interfaz afectados y las dos pruebas contra el paquete de Windows pasan localmente. El ejecutable de Windows 0.5.0 está generado.

Las pruebas de entrega usan un aviso simulado para no solicitar permisos ni mostrar avisos reales en las máquinas de prueba; prueban el planificador, el historial, la integración IPC y el cierre/restauración de la bandeja. El botón Probar notificación permite verificar los permisos del sistema en el equipo del usuario.

La regeneración final de Mac y la publicación se siguen en 02-publicacion.md.

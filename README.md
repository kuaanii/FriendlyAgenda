# FriendlyAgenda

Una agenda de papel, en digital. Aplicación de escritorio para Windows, de código abierto y con datos locales.

![Agenda clara](docs/screenshots/agenda-clara.png)

## Usar la aplicación

Abre `release/FriendlyAgenda-0.2.1-Windows.exe`. Cierra primero la versión anterior si sigue abierta. Es un ejecutable portable para Windows x64: no requiere instalación ni cuenta. Esta versión no tiene firma digital. Usa la misma carpeta de datos que las versiones anteriores.

- Cada doble página muestra cuatro días consecutivos, dos en cada hoja. Las flechas avanzan o retroceden cuatro días; el calendario permite saltar a otra fecha.
- Pulsa el espacio de notas para escribir. Selecciona texto y usa los botones de negrita, cursiva, subrayado, color o listas. También funcionan los atajos habituales de edición.
- Añade deberes o exámenes desde **Nuevo apunte** o desde un día. Pulsa un apunte para editar su título, fecha, tipo o asignatura; su casilla permite completarlo.
- Crea o cambia el nombre y color de asignaturas con el botón **+** de la barra lateral. Al elegir una asignatura se filtran los apuntes; las notas libres siguen visibles.
- Busca notas y apuntes con **Ctrl+K**. El tema claro u oscuro se recuerda.
- **Ampliar agenda**, junto a las fechas, dedica toda la ventana a la doble página. **Volver** o **Esc** recuperan la página principal. Las notas y las fechas se mantienen al cambiar de modo. Si hay un diálogo abierto, **Esc** cierra primero ese diálogo.
- El botón de la esquina superior izquierda oculta y vuelve a mostrar el menú lateral.
- Las barras de desplazamiento están ocultas. Puedes seguir desplazándote con la rueda, el trackpad y el teclado. En ambas vistas, cada día permite desplazar sus notas largas de forma independiente sin invadir el siguiente día.

## Datos y copias

La aplicación de Windows guarda automáticamente en `%APPDATA%/FriendlyAgenda/data/agenda.json`. **Mi espacio → Abrir carpeta de datos** muestra la ubicación exacta. No se usa servidor, cuenta, telemetría ni fuentes remotas.

Cada guardado conserva la versión anterior en `agenda.json.bak` y sustituye el archivo principal mediante un archivo temporal. Si el principal está dañado, se intenta recuperar la copia y se conserva el dañado en `agenda.json.corrupt`. Si ambos son ilegibles, la aplicación muestra el error sin sustituirlos.

En **Mi espacio** puedes exportar un JSON y restaurarlo más adelante. La importación comprueba la estructura y pide confirmar la sustitución; exporta primero la agenda actual para conservarla por separado. La copia automática anterior se va renovando: no sustituye una copia externa periódica.

El ejecutable es portable; los datos se guardan en el perfil de Windows, no junto al `.exe`. La agenda no cifra sus archivos. La protección de los archivos depende de tu sesión de Windows.

## Desarrollo

Requisitos: Node.js 24 y pnpm 11. El código usa React, Vite, Tiptap y Electron. Todo el editor y sus recursos se incluyen en el ejecutable.

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm dev
```

`pnpm dev` abre un servidor de desarrollo local. La vista en navegador utiliza almacenamiento local del navegador para previsualizar; los datos de la aplicación de Windows son independientes.

```powershell
pnpm build
pnpm start
pnpm pack
```

`pnpm pack` genera el ejecutable en `release/`. Para compilar se necesita Internet la primera vez, cuando se descargan Electron y las herramientas de empaquetado. La aplicación terminada funciona sin conexión.

## Verificación

```powershell
pnpm test
pnpm exec playwright install chromium
pnpm exec playwright test
pnpm test:desktop
```

Para usar un navegador Chromium ya instalado, define `PLAYWRIGHT_EXECUTABLE_PATH` con su ruta. Las pruebas de interfaz usan un perfil temporal independiente.

Para verificar el programa empaquetado, define `FRIENDLY_AGENDA_EXE` con la ruta absoluta de `release/win-unpacked/FriendlyAgenda.exe` y ejecuta `pnpm test:desktop`. El ensayo utiliza una carpeta temporal mediante `FRIENDLY_AGENDA_DATA_DIR`, sin tocar la agenda del usuario.

Se comprueban navegación entre años y años bisiestos, conservación del formato, guardado y recuperación desde disco, rechazo de copias inválidas, creación y finalización de deberes, búsqueda y persistencia del tema. Las capturas de ambos temas se guardan en `docs/screenshots/`.

La agenda admite hasta 20 MB de datos serializados. Los casos detectados y corregidos durante la revisión están en [docs/revision.md](docs/revision.md).

## Licencia

MIT. Puedes estudiar, modificar y redistribuir el código. No se ha publicado todavía en un repositorio remoto.

# FriendlyAgenda

Una agenda de papel, en digital. Aplicación de escritorio para Windows y macOS, de código abierto y con datos locales.

![Agenda clara](docs/screenshots/agenda-clara.png)

## Usar la aplicación

Descarga la versión de tu ordenador desde [la última versión publicada](https://github.com/kuaanii/FriendlyAgenda/releases/latest):

| Sistema                                          | Archivo                                |
| ------------------------------------------------ | -------------------------------------- |
| Windows x64                                      | `FriendlyAgenda-0.4.0-Windows.exe`     |
| Mac con Apple Silicon (M1, M2, M3 y posteriores) | `FriendlyAgenda-0.4.0-macOS-arm64.dmg` |
| Mac con procesador Intel                         | `FriendlyAgenda-0.4.0-macOS-x64.dmg`   |

En Windows, abre el ejecutable portable; no necesita instalación. En Mac, abre el DMG, arrastra **FriendlyAgenda** a **Aplicaciones**, expulsa la imagen y abre la aplicación desde Aplicaciones. Puedes comprobar el procesador en ** → Acerca de este Mac**. Cierra la versión anterior antes de sustituirla.

Estas versiones no tienen un certificado de distribución comercial. Las aplicaciones de Mac llevan firma ad hoc para comprobar la integridad local, pero no están notarizadas por Apple. macOS puede bloquear la primera apertura: revisa el origen de la descarga y usa **Ajustes del Sistema → Privacidad y seguridad → Abrir igualmente**, si aparece. No es necesario desactivar las protecciones del sistema. Más información en [la ayuda de Apple](https://support.apple.com/es-es/102445).

La interfaz arranca en **inglés** por defecto. El selector **English / Español / Français**, junto a las fechas, cambia el idioma al instante y sigue disponible en el modo agenda ampliada. Se recuerda localmente, también al exportar una copia. No traduce ni modifica tus notas o los nombres de tus asignaturas. Las agendas antiguas sin preferencia de idioma se abren en inglés conservando su contenido. Los ejemplos de botones siguientes corresponden al idioma español.

- Cada doble página muestra cuatro días consecutivos, dos en cada hoja. Las flechas avanzan o retroceden cuatro días; el calendario permite saltar a otra fecha.
- Pulsa el espacio de notas para escribir. Selecciona texto y usa los botones de negrita, cursiva, subrayado, color o listas. También funcionan los atajos habituales de edición.
- Añade deberes o exámenes desde **Nuevo apunte** o desde un día. Pulsa un apunte para editar su título, fecha, tipo o asignatura; su casilla permite completarlo.
- Crea o cambia el nombre y color de asignaturas con el botón **+** de la barra lateral. Al elegir una asignatura se filtran los apuntes; las notas libres siguen visibles.
- Busca notas y apuntes con **Ctrl+K** en Windows o **⌘K** en Mac. El tema claro u oscuro se recuerda.
- **Ampliar agenda**, junto a las fechas, dedica toda la ventana a la doble página. **Volver** o **Esc** recuperan la página principal. Las notas y las fechas se mantienen al cambiar de modo. Si hay un diálogo abierto, **Esc** cierra primero ese diálogo.
- El botón de la esquina superior izquierda oculta y vuelve a mostrar el menú lateral.
- Las barras de desplazamiento están ocultas. Puedes seguir desplazándote con la rueda, el trackpad y el teclado. En ambas vistas, cada día permite desplazar sus notas largas de forma independiente sin invadir el siguiente día.

## Datos y copias

La aplicación guarda automáticamente en `%APPDATA%/FriendlyAgenda/data/agenda.json` en Windows y en `~/Library/Application Support/FriendlyAgenda/data/agenda.json` en Mac. **Mi espacio → Abrir carpeta de datos** muestra la ubicación exacta. No requiere cuenta ni usa telemetría, fuentes remotas o un servidor para guardar tu agenda.

## Actualizaciones

Desde la versión 0.3.0 se comprueban las versiones estables publicadas en GitHub al abrir la aplicación, cada seis horas y al recuperar la conexión. Si hay una versión superior con una descarga para tu sistema y arquitectura, aparece un aviso con **Ahora no** y **Descargar nueva versión**. Si se pospone, vuelve a avisar en la siguiente apertura o comprobación periódica. También puedes comprobarlo en **Mi espacio → Buscar actualizaciones**.

La consulta usa la API pública de `kuaanii/FriendlyAgenda`. Desde 0.3.1, si la API está limitada o falla, se comprueba el enlace público de la última Release y la existencia del ejecutable mediante peticiones de cabecera, sin descargarlo. Solo se aceptan enlaces del repositorio y de los assets oficiales de GitHub. No envía notas, asignaturas, credenciales ni identificadores de usuario; GitHub recibe los datos normales de una conexión web, como la dirección IP. Sin Internet la agenda sigue funcionando. No descarga ni instala nada automáticamente: la descarga oficial se abre en el navegador cuando la eliges. Los cambios de código o las etiquetas sin una GitHub Release con ejecutable no generan un aviso de actualización.

Las versiones anteriores a 0.3.0 deben actualizarse manualmente una vez para incorporar esta función.

Cada guardado conserva la versión anterior en `agenda.json.bak` y sustituye el archivo principal mediante un archivo temporal. Si el principal está dañado, se intenta recuperar la copia y se conserva el dañado en `agenda.json.corrupt`. Si ambos son ilegibles, la aplicación muestra el error sin sustituirlos.

En **Mi espacio** puedes exportar un JSON y restaurarlo más adelante. La importación comprueba la estructura y pide confirmar la sustitución; exporta primero la agenda actual para conservarla por separado. La copia automática anterior se va renovando: no sustituye una copia externa periódica.

Los datos se guardan en el perfil del usuario, separados de la aplicación; sustituir el ejecutable o la aplicación de Mac conserva la agenda. La agenda no cifra sus archivos. La protección de los archivos depende de tu sesión del sistema.

## Desarrollo

Requisitos: Node.js 24 y pnpm 11. El código usa React, Vite, Tiptap y Electron. Todo el editor y sus recursos se incluyen en el ejecutable.

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm dev
```

`pnpm dev` abre un servidor de desarrollo local. La vista en navegador utiliza almacenamiento local del navegador para previsualizar; los datos de la aplicación de escritorio son independientes.

```powershell
pnpm build
pnpm start
pnpm pack
```

`pnpm pack` o `pnpm pack:win` genera el ejecutable de Windows en `release/`. En un Mac, `pnpm pack:mac` genera el DMG de su arquitectura nativa. El flujo [Desktop builds](.github/workflows/desktop.yml) compila y prueba Windows x64, macOS Intel y macOS Apple Silicon en sus respectivos sistemas. Puede ejecutarse manualmente en GitHub Actions o al subir una etiqueta `v*`. Los binarios se guardan como artefactos de esa ejecución; no se publica una Release automáticamente. Para compilar se necesita Internet la primera vez, cuando se descargan Electron y las herramientas de empaquetado. La aplicación terminada funciona sin conexión.

## Verificación

```powershell
pnpm test
pnpm exec playwright install chromium
pnpm exec playwright test
pnpm test:desktop
```

Para usar un navegador Chromium ya instalado, define `PLAYWRIGHT_EXECUTABLE_PATH` con su ruta. Las pruebas de interfaz usan un perfil temporal independiente.

Para verificar el programa empaquetado, define `FRIENDLY_AGENDA_EXE` con la ruta absoluta de `release/win-unpacked/FriendlyAgenda.exe` y ejecuta `pnpm test:desktop`. En Mac, `FRIENDLY_AGENDA_EXE` debe apuntar al ejecutable dentro de `FriendlyAgenda.app/Contents/MacOS/FriendlyAgenda`. El ensayo utiliza una carpeta temporal mediante `FRIENDLY_AGENDA_DATA_DIR`, sin tocar la agenda del usuario.

Se comprueban navegación entre años y años bisiestos, conservación del formato, guardado y recuperación desde disco, rechazo de copias inválidas, creación y finalización de deberes, búsqueda y persistencia del tema. Las capturas de ambos temas se guardan en `docs/screenshots/`.

La agenda admite hasta 20 MB de datos serializados. Los casos detectados y corregidos durante la revisión están en [docs/revision.md](docs/revision.md). `pnpm audit:publication` revisa archivos actuales y blobs de todo el historial de Git para detectar nombres sensibles, credenciales, rutas personales, correos y metadatos de imágenes. Es una comprobación preventiva, no una garantía de detección de cualquier secreto.

## Licencia

MIT. Puedes estudiar, modificar y redistribuir el código. Repositorio: [kuaanii/FriendlyAgenda](https://github.com/kuaanii/FriendlyAgenda). Para publicar nuevas versiones, consulta [RELEASING.md](RELEASING.md).

## Añadir un idioma

Los mensajes están en `src/locales/en.json`, `es.json` y `fr.json`; las claves compartidas identifican cada frase. Para añadir un idioma, crea un catálogo con las mismas claves y variables, regístralo en `src/i18n.js` y en la validación de `src/model.js`. Las pruebas comprueban la paridad de los catálogos y la conservación del contenido al cambiar de idioma. Los diálogos propios y menús se traducen; los controles nativos del sistema siguen la configuración de macOS o Windows.

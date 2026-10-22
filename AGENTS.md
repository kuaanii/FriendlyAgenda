# FriendlyAgenda

## Agent skills

### Issue tracker
Tareas y especificaciones en Markdown local. Ver docs/agents/issue-tracker.md.

### Triage labels
Cinco etiquetas predeterminadas. Ver docs/agents/triage-labels.md.

### Domain docs
Un único contexto con GLOSSARY.md y docs/adr/. Ver docs/agents/domain.md.

## Desarrollo
La aplicación debe funcionar sin conexión y no enviar información del usuario. Mantener el acceso al disco en el proceso principal de Electron y validar los documentos importados antes de sustituir datos. Mostrar errores de guardado y conservar una copia anterior.

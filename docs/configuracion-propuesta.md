# Configuración inicial propuesta

Este borrador recoge la propuesta pendiente de confirmar; todavía no configura instrucciones para agentes.

## Archivo de instrucciones

Crear AGENTS.md (alternativa disponible: CLAUDE.md) con este bloque:

```markdown
## Agent skills

### Issue tracker

Las tareas y especificaciones se guardan en Markdown local. Ver docs/agents/issue-tracker.md.

### Triage labels

Se usan las cinco etiquetas predeterminadas. Ver docs/agents/triage-labels.md.

### Domain docs

Un único contexto con GLOSSARY.md en la raíz y decisiones en docs/adr/. Ver docs/agents/domain.md.
```

## docs/agents/issue-tracker.md

Las especificaciones se guardan en `.scratch/<funcionalidad>/spec.md` y las tareas en `.scratch/<funcionalidad>/issues/NN-titulo.md`, un archivo por tarea. Cada tarea contiene `Status:` y, cuando corresponda, `Blocked by:`. Los comentarios se añaden bajo `## Comments`.

## docs/agents/triage-labels.md

Etiquetas propuestas: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`.

## docs/agents/domain.md

Antes de explorar el proyecto, leer GLOSSARY.md y las decisiones relevantes de docs/adr/ si existen. Usar los términos del glosario. Señalar cualquier contradicción con una decisión documentada antes de cambiarla.

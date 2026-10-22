import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import {
  BookOpen,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowUpRight,
  Check,
  X,
  Moon,
  Sun,
  Download,
  Upload,
  FolderOpen,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  GraduationCap,
  Circle,
  Settings2,
  CalendarDays,
  ArrowRight,
  Trash2,
} from "lucide-react";
import {
  addDays,
  spreadDates,
  today,
  noteText,
  decodeBackup,
} from "./model.js";
import { bridge } from "./bridge.js";
import "./style.css";

const dateLabel = (date, options) =>
  new Intl.DateTimeFormat("es-ES", options).format(
    new Date(`${date}T12:00:00`),
  );
const blankDay = () => ({
  note: { type: "doc", content: [{ type: "paragraph" }] },
  entries: [],
});
const shortDate = (date) =>
  dateLabel(date, { day: "numeric", month: "short" }).replace(".", "");
function IconButton({ label, children, ...props }) {
  return (
    <button className="icon-button" title={label} aria-label={label} {...props}>
      {children}
    </button>
  );
}

function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <IconButton label="Cerrar" onClick={onClose}>
          <X size={20} />
        </IconButton>
      </div>
      {children}
    </dialog>
  );
}

function MiniCalendar({ start, onSelect }) {
  const [month, setMonth] = useState(start.slice(0, 7) + "-01");
  useEffect(() => setMonth(start.slice(0, 7) + "-01"), [start]);
  const offset = (new Date(`${month}T12:00:00`).getDay() + 6) % 7;
  const dates = Array.from({ length: 42 }, (_, i) =>
    addDays(month, i - offset),
  );
  function move(n) {
    const d = new Date(`${month}T12:00:00`);
    d.setMonth(d.getMonth() + n);
    setMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
    );
  }
  return (
    <section className="mini-calendar">
      <div className="calendar-heading">
        <strong>{dateLabel(month, { month: "long", year: "numeric" })}</strong>
        <span>
          <IconButton label="Mes anterior" onClick={() => move(-1)}>
            <ChevronLeft size={15} />
          </IconButton>
          <IconButton label="Mes siguiente" onClick={() => move(1)}>
            <ChevronRight size={15} />
          </IconButton>
        </span>
      </div>
      <div className="calendar-grid">
        {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
          <span className="weekday" key={i}>
            {d}
          </span>
        ))}
        {dates.map((d) => (
          <button
            key={d}
            aria-label={dateLabel(d, { dateStyle: "full" })}
            aria-pressed={spreadDates(start).includes(d)}
            className={`${d.slice(0, 7) !== month.slice(0, 7) ? "muted" : ""} ${spreadDates(start).includes(d) ? "in-spread" : ""} ${d === today() ? "calendar-today" : ""}`}
            onClick={() => onSelect(d)}
          >
            {Number(d.slice(-2))}
          </button>
        ))}
      </div>
    </section>
  );
}

function Day({ date, day, subjects, onChange, onEdit, onActive, filter }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder: "Este espacio es tuyo. Empieza a escribir…",
      }),
    ],
    content: day.note,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        "aria-label": `Notas del ${date}`,
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: e }) =>
      onChange(date, (d) => ({ ...d, note: e.getJSON() })),
    onFocus: ({ editor: e }) => onActive(e),
    onSelectionUpdate: ({ editor: e }) => onActive(e),
  });
  const visible = day.entries.filter((e) => !filter || e.subject === filter);
  return (
    <section className={`day ${date === today() ? "is-today" : ""}`}>
      <header className="day-heading">
        <div className="day-number">
          {date.slice(-2)}
          <span className="day-dot" />
        </div>
        <div>
          <h2>{dateLabel(date, { weekday: "long" })}</h2>
          <span className="day-subtitle">
            {date === today()
              ? "UN NUEVO DÍA, A TU RITMO"
              : dateLabel(date, { month: "long", year: "numeric" })}
          </span>
        </div>
        {date === today() && <span className="today-chip">Hoy</span>}
        <IconButton
          label={`Añadir apunte al ${date}`}
          onClick={() => onEdit({ date, type: "homework" })}
        >
          <Plus size={18} />
        </IconButton>
      </header>
      <div className="entries">
        {visible.map((entry) => {
          const s = subjects.find((s) => s.id === entry.subject);
          return (
            <div
              className={`entry ${entry.done ? "done" : ""} ${entry.type === "exam" ? "exam" : ""}`}
              key={entry.id}
              style={{ "--subject-color": s?.color || "#9b9388" }}
            >
              <button
                className="entry-check"
                aria-label={`${entry.done ? "Marcar pendiente" : "Completar"}: ${entry.title}`}
                aria-pressed={entry.done}
                onClick={() =>
                  onChange(date, (d) => ({
                    ...d,
                    entries: d.entries.map((e) =>
                      e.id === entry.id ? { ...e, done: !e.done } : e,
                    ),
                  }))
                }
              >
                {entry.done ? (
                  <Check size={13} />
                ) : entry.type === "exam" ? (
                  <GraduationCap size={15} />
                ) : null}
              </button>
              <button
                className="entry-body"
                onClick={() => onEdit({ ...entry, date })}
              >
                <span>{entry.title}</span>
                <small>
                  {entry.type === "exam" ? "Examen" : "Deber"}
                  {s ? ` · ${s.name}` : ""}
                </small>
              </button>
            </div>
          );
        })}
      </div>
      <EditorContent editor={editor} className="note-editor" />
      <button
        className="add-entry"
        onClick={() => onEdit({ date, type: "homework" })}
      >
        <Plus size={14} /> Añadir deber o examen
      </button>
    </section>
  );
}

function Toolbar({ editor }) {
  const [, refresh] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const update = () => refresh((n) => n + 1);
    editor.on("transaction", update);
    return () => editor.off("transaction", update);
  }, [editor]);
  const run = (fn) => {
    if (editor && !editor.isDestroyed) fn(editor.chain().focus()).run();
  };
  return (
    <div className="format-toolbar" aria-label="Formato del documento">
      <span className="toolbar-label">Texto</span>
      <span className="tool-divider" />
      {[
        [Bold, "Negrita", "bold", (c) => c.toggleBold()],
        [Italic, "Cursiva", "italic", (c) => c.toggleItalic()],
        [Underline, "Subrayado", "underline", (c) => c.toggleUnderline()],
      ].map(([Icon, label, mark, fn]) => (
        <IconButton
          key={mark}
          label={label}
          disabled={!editor}
          aria-pressed={editor?.isActive(mark) || false}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run(fn)}
        >
          <Icon size={16} />
        </IconButton>
      ))}
      <label className="text-color" title="Color del texto">
        <span>A</span>
        <input
          type="color"
          aria-label="Color del texto"
          value={editor?.getAttributes("textStyle").color || "#6354a4"}
          disabled={!editor}
          onChange={(e) => run((c) => c.setColor(e.target.value))}
        />
      </label>
      <span className="tool-divider" />
      <IconButton
        label="Lista con viñetas"
        disabled={!editor}
        aria-pressed={editor?.isActive("bulletList") || false}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => run((c) => c.toggleBulletList())}
      >
        <List size={18} />
      </IconButton>
      <IconButton
        label="Lista numerada"
        disabled={!editor}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => run((c) => c.toggleOrderedList())}
      >
        <ListOrdered size={18} />
      </IconButton>
      <span className="tool-divider" />
      <IconButton
        label="Deshacer texto"
        disabled={!editor}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => run((c) => c.undo())}
      >
        <Undo2 size={16} />
      </IconButton>
      <IconButton
        label="Rehacer texto"
        disabled={!editor}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => run((c) => c.redo())}
      >
        <Redo2 size={16} />
      </IconButton>
      <span className="toolbar-hint">Las ideas empiezan con una línea.</span>
    </div>
  );
}

function EntryForm({ entry, subjects, onSave, onDelete, onClose }) {
  const [value, setValue] = useState({
    id: crypto.randomUUID(),
    title: "",
    subject: "",
    done: false,
    ...entry,
  });
  return (
    <Modal
      title={entry.id ? "Editar apunte" : "Algo que recordar"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...value, title: value.title.trim() });
        }}
      >
        <label>
          ¿Qué tienes en mente?
          <input
            autoFocus
            required
            maxLength={300}
            placeholder="Por ejemplo, repasar el tema 3"
            value={value.title}
            onChange={(e) => setValue({ ...value, title: e.target.value })}
          />
        </label>
        <div className="form-row">
          <label>
            Fecha
            <input
              required
              type="date"
              min="1900-01-01"
              max="2200-12-31"
              value={value.date}
              onChange={(e) => setValue({ ...value, date: e.target.value })}
            />
          </label>
          <label>
            Tipo
            <select
              value={value.type}
              onChange={(e) => setValue({ ...value, type: e.target.value })}
            >
              <option value="homework">Deber</option>
              <option value="exam">Examen</option>
            </select>
          </label>
        </div>
        <label>
          Asignatura
          <select
            value={value.subject}
            onChange={(e) => setValue({ ...value, subject: e.target.value })}
          >
            <option value="">Sin asignatura</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <footer className="modal-actions">
          {entry.id && (
            <button
              className="danger-button"
              type="button"
              onClick={() => onDelete(entry)}
            >
              <Trash2 size={16} /> Eliminar
            </button>
          )}
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button" disabled={!value.title.trim()}>
            Guardar apunte <ArrowRight size={16} />
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function App() {
  const [data, setData] = useState(null),
    [loadError, setLoadError] = useState(""),
    [start, setStart] = useState(today()),
    [status, setStatus] = useState("Cargando…"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [entry, setEntry] = useState(null),
    [active, setActive] = useState(null),
    [filter, setFilter] = useState(""),
    [search, setSearch] = useState(null),
    [settings, setSettings] = useState(false),
    [subjectsOpen, setSubjectsOpen] = useState(false),
    [pendingImport, setPendingImport] = useState(null),
    [deletedEntry, setDeletedEntry] = useState(null);
  const [newSubject, setNewSubject] = useState(""),
    [subjectColor, setSubjectColor] = useState("#9c82c8");
  const revision = useRef(0),
    ready = useRef(false),
    fileInput = useRef(null),
    [documentKey, setDocumentKey] = useState(0);
  useEffect(() => {
    bridge
      .load()
      .then(({ data, warning }) => {
        setData(data);
        setNotice(warning || "");
        ready.current = true;
      })
      .catch((e) => setLoadError(e.message));
  }, []);
  useEffect(() => {
    if (!data || !ready.current) return;
    document.documentElement.dataset.theme = data.theme;
    const r = ++revision.current;
    setStatus("Guardando…");
    bridge
      .save(data)
      .then(() => {
        if (revision.current === r) setStatus("Todo guardado");
      })
      .catch((e) => {
        if (revision.current === r) {
          setStatus("Error al guardar");
          setError(e.message);
        }
      });
  }, [data]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const key = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearch("");
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  if (loadError)
    return (
      <main className="loading">
        <BookOpen size={40} />
        <h1>No hemos podido abrir tu agenda</h1>
        <p>{loadError}</p>
        <button
          className="secondary-button"
          onClick={() => bridge.openFolder().catch((e) => setError(e.message))}
        >
          Abrir carpeta de datos
        </button>
        {error && <p role="alert">{error}</p>}
      </main>
    );
  if (!data)
    return (
      <main className="loading">
        <BookOpen size={40} />
        <p>Abriendo tu agenda…</p>
      </main>
    );
  const dates = spreadDates(start);
  const patchDay = (date, change) =>
    setData((prev) => ({
      ...prev,
      days: { ...prev.days, [date]: change(prev.days[date] || blankDay()) },
    }));
  function navigate(date) {
    setActive(null);
    setStart(date);
  }
  const upcoming = Object.entries(data.days)
    .flatMap(([date, day]) =>
      day.entries
        .filter((e) => !e.done && date >= today())
        .map((e) => ({ ...e, date })),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const total = dates.flatMap((d) => data.days[d]?.entries || []),
    done = total.filter((e) => e.done).length;
  const results =
    search === null || !search.trim()
      ? []
      : Object.entries(data.days)
          .flatMap(([date, day]) => [
            ...day.entries
              .filter((e) =>
                (
                  e.title +
                  " " +
                  (data.subjects.find((s) => s.id === e.subject)?.name || "")
                )
                  .toLocaleLowerCase()
                  .includes(search.toLocaleLowerCase()),
              )
              .map((e) => ({ date, title: e.title, type: e.type })),
            ...(noteText(day.note)
              .toLocaleLowerCase()
              .includes(search.toLocaleLowerCase())
              ? [{ date, title: noteText(day.note), type: "note" }]
              : []),
          ])
          .sort((a, b) => a.date.localeCompare(b.date));
  async function exportData() {
    try {
      if (await bridge.exportBackup(data))
        setNotice("Tu copia de seguridad está lista.");
    } catch (e) {
      setError(e.message);
    }
  }
  async function importData() {
    try {
      if (!window.agenda) {
        fileInput.current.click();
        return;
      }
      const imported = await bridge.importBackup();
      if (imported) setPendingImport(imported);
    } catch (e) {
      setError(e.message);
    }
  }
  function saveEntry(value) {
    setData((prev) => {
      const days = { ...prev.days };
      if (entry.id) {
        const old = days[entry.date] || blankDay();
        days[entry.date] = {
          ...old,
          entries: old.entries.filter((e) => e.id !== entry.id),
        };
      }
      const day = days[value.date] || blankDay();
      const { date, ...item } = value;
      days[date] = { ...day, entries: [...day.entries, item] };
      return { ...prev, days };
    });
    setEntry(null);
    setNotice("Apunte guardado. Una cosa menos en la cabeza.");
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <span className="brand-icon">
            <BookOpen size={23} />
          </span>
          <span>
            friendly<span className="brand-light">agenda</span>
            <small>TU DÍA, CON CALMA.</small>
          </span>
        </a>
        <button className="search-button" onClick={() => setSearch("")}>
          <Search size={17} />
          <span>Buscar en tu agenda</span>
          <kbd>Ctrl K</kbd>
        </button>
        <nav className="main-nav">
          <button
            className="nav-active"
            onClick={() => {
              setFilter("");
              navigate(today());
            }}
          >
            <BookOpen size={18} /> Mi agenda <span className="nav-dot" />
          </button>
          <button
            onClick={() => {
              setSettings(true);
            }}
          >
            <FolderOpen size={18} /> Mi espacio <ArrowUpRight size={15} />
          </button>
        </nav>
        <MiniCalendar start={start} onSelect={navigate} />
        <section className="subject-section">
          <div className="section-heading">
            <span>MIS ASIGNATURAS</span>
            <IconButton
              label="Gestionar asignaturas"
              onClick={() => setSubjectsOpen(true)}
            >
              <Plus size={15} />
            </IconButton>
          </div>
          <button
            className={`subject ${!filter ? "selected" : ""}`}
            onClick={() => setFilter("")}
          >
            <span className="all-dot" /> Todas las asignaturas{" "}
            <span>{data.subjects.length}</span>
          </button>
          {data.subjects.map((s) => (
            <button
              key={s.id}
              className={`subject ${filter === s.id ? "selected" : ""}`}
              onClick={() => setFilter(filter === s.id ? "" : s.id)}
            >
              <i style={{ background: s.color }} />
              {s.name}
              {filter === s.id && <Check size={14} />}
            </button>
          ))}
        </section>
        <section className="sidebar-note">
          <span className="little-star">✳</span>
          <h3>
            Menos ruido.
            <br />
            Más espacio para ti.
          </h3>
          <p>Tus planes, tus ideas, tus pequeños grandes pasos.</p>
          <span className="privacy-label">
            <span /> Solo en tu ordenador
          </span>
        </section>
        <div className="sidebar-bottom">
          <button
            onClick={() =>
              setData({
                ...data,
                theme: data.theme === "light" ? "dark" : "light",
              })
            }
          >
            {data.theme === "light" ? <Moon size={17} /> : <Sun size={17} />}{" "}
            Tema {data.theme === "light" ? "oscuro" : "claro"}
          </button>
          <IconButton
            label="Ajustes y copias de seguridad"
            onClick={() => setSettings(true)}
          >
            <Settings2 size={18} />
          </IconButton>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <span>
            <span className="tiny-dot" /> TU AGENDA PERSONAL
          </span>
          <div className="topbar-right">
            <span
              className={`save-state ${status === "Error al guardar" ? "save-error" : ""}`}
              role="status"
            >
              <Check size={13} />
              {status}
            </span>
            <span className="local-badge">LOCAL & PRIVADA</span>
          </div>
        </header>
        <div className="workspace">
          <section className="welcome">
            <div>
              <p className="eyebrow">
                UN POCO DE ORDEN. UN MUNDO DE POSIBILIDADES.
              </p>
              <h1>
                Haz sitio a lo <em>importante.</em>
              </h1>
              <p className="welcome-subtitle">
                Saca los planes de tu cabeza. Dales su propio espacio.
              </p>
            </div>
            <button
              className="primary-button"
              onClick={() => setEntry({ date: start, type: "homework" })}
            >
              <Plus size={17} /> Nuevo apunte
            </button>
          </section>
          <section className="agenda-controls">
            <div className="month-title">
              <span className="calendar-icon">
                <CalendarDays size={19} />
              </span>
              <h2>
                {dateLabel(start, { month: "long" })}{" "}
                <span>{dateLabel(start, { year: "numeric" })}</span>
              </h2>
            </div>
            <div className="date-controls">
              <button
                className="today-button"
                onClick={() => navigate(today())}
              >
                Hoy
              </button>
              <span className="date-range">
                {shortDate(start)} — {shortDate(dates[3])}
              </span>
              <div className="pager">
                <IconButton
                  label="Cuatro días anteriores"
                  onClick={() => navigate(addDays(start, -4))}
                >
                  <ChevronLeft size={18} />
                </IconButton>
                <IconButton
                  label="Cuatro días siguientes"
                  onClick={() => navigate(addDays(start, 4))}
                >
                  <ChevronRight size={18} />
                </IconButton>
              </div>
            </div>
          </section>
          <div className="book-wrap">
            <Toolbar editor={active} />
            {filter && (
              <div className="filter-banner">
                Apuntes de {data.subjects.find((s) => s.id === filter)?.name}
                <button onClick={() => setFilter("")}>
                  Mostrar todos <X size={13} />
                </button>
              </div>
            )}
            <div className="book" key={documentKey}>
              {[dates.slice(0, 2), dates.slice(2)].map((page, i) => (
                <div className={`paper paper-${i}`} key={i}>
                  {page.map((date) => (
                    <Day
                      key={date}
                      date={date}
                      day={data.days[date] || blankDay()}
                      subjects={data.subjects}
                      onChange={patchDay}
                      onEdit={setEntry}
                      onActive={setActive}
                      filter={filter}
                    />
                  ))}
                  <div className="page-footer">
                    <span>FRIENDLY AGENDA</span>
                    <span>
                      {i === 0 ? "Un día a la vez." : "Lo estás haciendo bien."}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="under-book">
            <span>
              <BookOpen size={14} /> Cuatro días. Todo tu espacio.
            </span>
            <span>
              {done} de {total.length} apuntes completados{" "}
              <span className="progress-track">
                <i
                  style={{
                    width: `${total.length ? (done / total.length) * 100 : 0}%`,
                  }}
                />
              </span>
            </span>
          </div>
          <section className="upcoming-section">
            <div className="section-heading">
              <h2>
                En el horizonte <span>Lo próximo, sin perder la calma.</span>
              </h2>
              <ArrowUpRight size={18} />
            </div>
            {upcoming.length ? (
              <div className="upcoming-grid">
                {upcoming.map((e) => (
                  <button
                    className="upcoming-card"
                    key={e.id}
                    onClick={() => {
                      navigate(e.date);
                      setEntry(e);
                    }}
                  >
                    <span className="upcoming-date">{shortDate(e.date)}</span>
                    <strong>{e.title}</strong>
                    <span>
                      {e.type === "exam" ? "Examen" : "Deber"}{" "}
                      <ArrowRight size={15} />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-upcoming">
                <Circle size={19} />
                <span>
                  Un horizonte despejado. Tus próximos deberes y exámenes
                  aparecerán aquí.
                </span>
                <button onClick={() => setEntry({ date: start, type: "exam" })}>
                  Añadir un plan <ArrowRight size={14} />
                </button>
              </div>
            )}
          </section>
          <footer className="main-footer">
            <span>Hecha para tus días. A tu manera.</span>
            <span>Sin cuentas. Sin nube. Solo tú.</span>
          </footer>
        </div>
      </main>
      {entry && (
        <EntryForm
          entry={entry}
          subjects={data.subjects}
          onSave={saveEntry}
          onClose={() => setEntry(null)}
          onDelete={(e) => {
            patchDay(e.date, (d) => ({
              ...d,
              entries: d.entries.filter((v) => v.id !== e.id),
            }));
            setEntry(null);
            setDeletedEntry(e);
            setNotice("Apunte eliminado.");
          }}
        />
      )}
      {search !== null && (
        <Modal title="Encuentra ese apunte" onClose={() => setSearch(null)}>
          <div className="search-field">
            <Search size={20} />
            <input
              aria-label="Buscar texto"
              autoFocus
              placeholder="Un deber, un examen, una idea…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="search-results">
            {!search.trim() ? (
              <p>Busca en tus notas, deberes, exámenes y asignaturas.</p>
            ) : !results.length ? (
              <p>No hay resultados para «{search}».</p>
            ) : (
              results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => {
                    navigate(r.date);
                    setSearch(null);
                  }}
                >
                  <span>{shortDate(r.date)}</span>
                  <strong>{r.title}</strong>
                  <ArrowRight size={16} />
                </button>
              ))
            )}
          </div>
        </Modal>
      )}
      {subjectsOpen && (
        <Modal title="Tus asignaturas" onClose={() => setSubjectsOpen(false)}>
          <p className="modal-description">
            Un color para cada materia. Un lugar para cada idea.
          </p>
          <div className="subject-edit-list">
            {data.subjects.map((s) => (
              <div key={s.id}>
                <input
                  aria-label={`Color de ${s.name}`}
                  type="color"
                  value={s.color}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      subjects: prev.subjects.map((v) =>
                        v.id === s.id ? { ...v, color: e.target.value } : v,
                      ),
                    }))
                  }
                />
                <input
                  aria-label={`Nombre de ${s.name}`}
                  value={s.name}
                  maxLength={60}
                  onChange={(e) => {
                    const name = e.target.value;
                    if (name.trim())
                      setData((prev) => ({
                        ...prev,
                        subjects: prev.subjects.map((v) =>
                          v.id === s.id ? { ...v, name } : v,
                        ),
                      }));
                  }}
                />
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newSubject.trim()) return;
              setData({
                ...data,
                subjects: [
                  ...data.subjects,
                  {
                    id: crypto.randomUUID(),
                    name: newSubject.trim(),
                    color: subjectColor,
                  },
                ],
              });
              setNewSubject("");
            }}
          >
            <label>Nueva asignatura</label>
            <div className="new-subject">
              <input
                aria-label="Color de nueva asignatura"
                type="color"
                value={subjectColor}
                onChange={(e) => setSubjectColor(e.target.value)}
              />
              <input
                aria-label="Nueva asignatura"
                placeholder="Nombre de la materia"
                maxLength={60}
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
              />
              <button className="primary-button" disabled={!newSubject.trim()}>
                <Plus size={17} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {settings && (
        <Modal title="Tu espacio, a salvo" onClose={() => setSettings(false)}>
          <p className="modal-description">
            Tu agenda vive en este ordenador. Exporta una copia para guardarla
            donde prefieras.
          </p>
          <div className="settings-actions">
            <button onClick={exportData}>
              <Download size={21} />
              <span>
                <strong>Exportar copia de seguridad</strong>
                <small>Incluye notas, formato, apuntes y asignaturas.</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
            <button onClick={importData}>
              <Upload size={21} />
              <span>
                <strong>Restaurar una copia</strong>
                <small>Recupera una agenda desde un archivo JSON.</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
            {window.agenda && (
              <button
                onClick={() =>
                  bridge.openFolder().catch((e) => setError(e.message))
                }
              >
                <FolderOpen size={21} />
                <span>
                  <strong>Abrir carpeta de datos</strong>
                  <small>Archivo local y copia del guardado anterior.</small>
                </span>
                <ArrowUpRight size={16} />
              </button>
            )}
          </div>
          <div className="about-box">
            <BookOpen size={20} />
            <span>
              FriendlyAgenda{" "}
              <small>Versión 0.1.0 · Código abierto · Licencia MIT</small>
            </span>
          </div>
        </Modal>
      )}
      {pendingImport && (
        <Modal
          title="Restaurar tu agenda"
          onClose={() => setPendingImport(null)}
        >
          <p className="modal-description">
            Esta copia sustituirá la agenda actual. Exporta primero tus cambios
            si quieres conservarlos por separado.
          </p>
          <div className="modal-actions">
            <button className="secondary-button" onClick={exportData}>
              Exportar la actual
            </button>
            <button
              className="primary-button"
              onClick={() => {
                setData(pendingImport);
                setPendingImport(null);
                setSettings(false);
                setActive(null);
                setFilter("");
                setDocumentKey((n) => n + 1);
                setNotice("Copia restaurada. Tu agenda está de vuelta.");
              }}
            >
              Restaurar copia
            </button>
          </div>
        </Modal>
      )}
      <input
        ref={fileInput}
        className="hidden"
        type="file"
        accept=".json"
        onChange={async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          try {
            if (file.size > 20 * 1024 * 1024)
              throw new Error("La copia supera 20 MB.");
            setPendingImport(decodeBackup(await file.text()));
          } catch (err) {
            setError(err.message);
          }
          e.target.value = "";
        }}
      />
      {error && (
        <div className="error-toast" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Cerrar error">
            <X size={16} />
          </button>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
          {deletedEntry && notice === "Apunte eliminado." && (
            <button
              onClick={() => {
                const { date, ...item } = deletedEntry;
                patchDay(date, (d) => ({
                  ...d,
                  entries: [...d.entries, item],
                }));
                setDeletedEntry(null);
                setNotice("Apunte recuperado.");
              }}
            >
              Deshacer
            </button>
          )}
          <button onClick={() => setNotice("")} aria-label="Cerrar aviso">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

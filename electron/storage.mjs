import { mkdir, readFile, writeFile, rename, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { emptyAgenda, encodeBackup, decodeBackup } from "../src/model.js";

export function createStorage(folder) {
  const file = join(folder, "agenda.json");
  let queue = Promise.resolve();
  async function read(path) {
    return decodeBackup(await readFile(path, "utf8"));
  }
  return {
    async load() {
      await mkdir(folder, { recursive: true });
      try {
        return { data: await read(file) };
      } catch (error) {
        if (error.code === "ENOENT") return { data: emptyAgenda() };
        try {
          const data = await read(`${file}.bak`);
          await copyFile(file, `${file}.corrupt`);
          await copyFile(`${file}.bak`, file);
          return {
            data,
            warning:
              "Se ha recuperado la copia anterior. El archivo dañado se ha conservado.",
          };
        } catch {
          throw new Error(
            "No se puede leer la agenda. Conservamos tus archivos; revisa la carpeta de datos antes de continuar.",
          );
        }
      }
    },
    save(data) {
      const operation = queue
        .catch(() => {})
        .then(async () => {
          const text = encodeBackup(data);
          await mkdir(folder, { recursive: true });
          try {
            await read(file);
            await copyFile(file, `${file}.bak`);
          } catch (error) {
            if (error.code !== "ENOENT") throw error;
          }
          await writeFile(`${file}.tmp`, text, {
            encoding: "utf8",
            flush: true,
          });
          await rename(`${file}.tmp`, file);
        });
      queue = operation;
      return operation;
    },
  };
}

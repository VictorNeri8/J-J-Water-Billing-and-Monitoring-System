import { accessSync, constants, copyFileSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const source = resolve(projectRoot, ".env.business")
const destination = resolve(projectRoot, ".env.local")

try {
  accessSync(source, constants.R_OK)
} catch {
  console.error("Cannot switch to BUSINESS environment: .env.business is missing or unreadable.")
  process.exit(1)
}

try {
  copyFileSync(source, destination)
  if (!existsSync(destination)) {
    throw new Error(".env.local was not created")
  }

  console.log("Switched to BUSINESS environment. .env.local was generated from .env.business.")
} catch {
  console.error("Cannot switch to BUSINESS environment: failed to generate .env.local.")
  process.exit(1)
}

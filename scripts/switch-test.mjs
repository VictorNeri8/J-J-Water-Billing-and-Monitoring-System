import { accessSync, constants, copyFileSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const source = resolve(projectRoot, ".env.test")
const destination = resolve(projectRoot, ".env.local")

try {
  accessSync(source, constants.R_OK)
} catch {
  console.error("Cannot switch to TEST environment: .env.test is missing or unreadable.")
  process.exit(1)
}

try {
  copyFileSync(source, destination)
  if (!existsSync(destination)) {
    throw new Error(".env.local was not created")
  }

  console.log("Switched to TEST environment. .env.local was generated from .env.test.")
} catch {
  console.error("Cannot switch to TEST environment: failed to generate .env.local.")
  process.exit(1)
}

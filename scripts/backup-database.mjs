import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const WARNING =
  "WARNING: Database backups may contain real customer names, addresses, contact numbers, billing records, and payment information. Do not commit backup files to GitHub.";
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const backupsDirectory = join(projectRoot, "backups");
const linkedProjectFile = join(projectRoot, "supabase", ".temp", "project-ref");
const supabaseCommand = process.platform === "win32" ? "supabase.cmd" : "supabase";
let resolvedSupabaseCommand = supabaseCommand;

function fail(message) {
  console.error(`\nERROR: ${message}`);
  process.exit(1);
}

function runSupabase(args, options = {}) {
  return spawnSync(resolvedSupabaseCommand, args, {
    cwd: projectRoot,
    encoding: "utf8",
    shell: false,
    stdio: options.stdio ?? "inherit",
    windowsHide: true,
  });
}

function getSupabaseCommandCandidates() {
  return process.platform === "win32" ? ["supabase.cmd", "supabase"] : ["supabase"];
}

function readLinkedProjectRef() {
  if (!existsSync(linkedProjectFile)) return "";

  try {
    return readFileSync(linkedProjectFile, "utf8").trim();
  } catch {
    return "";
  }
}

function createTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function runBackup(label, args, outputPath) {
  const displayPath = relative(projectRoot, outputPath).replaceAll("\\", "/");
  console.log(`\nCreating ${label} backup: ${displayPath}`);

  const result = runSupabase([...args, "-f", displayPath]);
  if (result.error || result.status !== 0) {
    // Supabase may create or partially write the destination before failing.
    rmSync(outputPath, { force: true });
    fail(
      `${label} backup failed. Confirm that you are logged in, the intended project is linked, Docker is running if required by your Supabase CLI version, and then retry.`,
    );
  }

  if (!existsSync(outputPath)) {
    fail(`${label} backup command completed but did not create ${displayPath}.`);
  }

  console.log(`${label} backup completed: ${displayPath}`);
}

console.log(WARNING);

const flags = new Set(process.argv.slice(2));
const supportedFlags = new Set(["--schema-only", "--data-only", "--full"]);
const unknownFlags = [...flags].filter((flag) => !supportedFlags.has(flag));

if (unknownFlags.length > 0) {
  fail(`Unknown option(s): ${unknownFlags.join(", ")}. Use --schema-only, --data-only, or --full.`);
}

if (flags.has("--schema-only") && flags.has("--data-only")) {
  fail("Use only one of --schema-only or --data-only. Omit both (or use --full) to create both backups.");
}

if (flags.has("--full") && (flags.has("--schema-only") || flags.has("--data-only"))) {
  fail("--full cannot be combined with --schema-only or --data-only.");
}

mkdirSync(backupsDirectory, { recursive: true });
if (!existsSync(backupsDirectory)) {
  fail("The backups folder could not be created.");
}

let versionCheck;
const attemptedCommands = [];

for (const command of getSupabaseCommandCandidates()) {
  resolvedSupabaseCommand = command;
  attemptedCommands.push(`${command} --version`);
  versionCheck = runSupabase(["--version"], { stdio: "ignore" });

  if (!versionCheck.error && versionCheck.status === 0) break;
}

if (!versionCheck || versionCheck.error || versionCheck.status !== 0) {
  fail(
    `Supabase CLI was not found. Attempted: ${attemptedCommands.join(", ")}. Run \`supabase --version\` in PowerShell to verify the installation. If you just installed the Supabase CLI, restart PowerShell so the updated PATH is available, then retry. Install instructions: https://supabase.com/docs/guides/cli`,
  );
}

const linkedProjectRef = readLinkedProjectRef();
const environmentProjectRef = process.env.SUPABASE_PROJECT_REF?.trim() ?? "";

if (!linkedProjectRef && !environmentProjectRef) {
  fail(`No linked Supabase project or SUPABASE_PROJECT_REF was found.\n\nRun:\nsupabase login\nsupabase link --project-ref YOUR_PROJECT_REF`);
}

if (linkedProjectRef && environmentProjectRef && linkedProjectRef !== environmentProjectRef) {
  fail(
    "SUPABASE_PROJECT_REF does not match the linked Supabase project. Relink the intended project before creating a backup.",
  );
}

if (!linkedProjectRef && environmentProjectRef) {
  console.log(
    "SUPABASE_PROJECT_REF is set. The Supabase CLI must still be authenticated and able to resolve that project; if the dump fails, run:\nsupabase login\nsupabase link --project-ref YOUR_PROJECT_REF",
  );
}

const timestamp = createTimestamp();
const schemaOnly = flags.has("--schema-only");
const dataOnly = flags.has("--data-only");

if (!dataOnly) {
  const schemaPath = join(backupsDirectory, `jandj-schema-${timestamp}.sql`);
  runBackup("schema", ["db", "dump", "--schema", "public"], schemaPath);
}

if (!schemaOnly) {
  const dataPath = join(backupsDirectory, `jandj-data-${timestamp}.sql`);
  runBackup("data", ["db", "dump", "--data-only"], dataPath);
}

console.log("\nBackup finished. Move the generated files to secure storage outside this repository.");

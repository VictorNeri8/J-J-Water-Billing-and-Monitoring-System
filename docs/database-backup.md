# Database Backup

## Purpose

Regular backups protect J&J Water Distribution business data against accidental deletion, failed migrations, and Supabase project issues. This workflow only creates manual exports; it does not automate restoration or make database changes.

Backups can contain real customer and payment information. Never commit them to Git or upload them to a public GitHub repository.

## One-time setup

Install the Supabase CLI using a currently supported method. If your environment supports the npm global package, the commands are:

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

The CLI may require Docker for database dumps. Follow the [official Supabase CLI installation guide](https://supabase.com/docs/guides/cli) if global npm installation is unavailable for your platform or CLI version.

The script accepts `SUPABASE_PROJECT_REF` as a project-context check. Copy `.env.backup.example` to an ignored local environment file or set the variable in your shell. Do not put database passwords, API keys, or service-role keys in that file. Supabase CLI dumps still require an authenticated, linked project, so linking is the recommended setup.

## Weekly backup

Run:

```bash
npm run backup:db
```

This creates separate timestamped schema and data SQL files in `backups/`.

## Before a migration

Immediately before every database migration or major feature update, run:

```bash
npm run backup:db
```

Confirm that both output files were created, then copy them to secure storage before applying the migration.

## Backup commands

```bash
npm run backup:db          # schema and data
npm run backup:db:schema   # schema only
npm run backup:db:data     # data only
```

## Where to store backups

Move completed backups out of the repository to access-controlled storage such as:

- Google Drive
- OneDrive
- An encrypted external drive

Limit access to authorized staff. Do not store real business data in public GitHub repositories.

## What the files mean

- `jandj-schema-DATE.sql` contains the database structure for the `public` schema.
- `jandj-data-DATE.sql` contains real business records and must be handled as sensitive data.

The timestamp is UTC and is included in each filename so backup sets can be identified and retained safely.

## Restore safety

Do not restore a backup directly to production without testing it. Restore it first to a separate clone or testing Supabase project, validate the schema and records, and document the production restore plan. Restoration is intentionally not automated by this repository.

import assert from "node:assert/strict"
import test from "node:test"

import {
  buildProvisioningConfig,
  buildProvisioningPlan,
  getSupabaseProjectRef,
  provisionAdmins,
} from "./seed-admin-accounts.mjs"

const secretKey = "service-role-secret-that-must-not-be-logged"
const developerPassword = "developer-secret-password"

function validEnv(overrides = {}) {
  return {
    APP_ENV: "business",
    NEXT_PUBLIC_SUPABASE_URL: "https://exampleproject.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: secretKey,
    EXPECTED_SUPABASE_PROJECT_REF: "exampleproject",
    FINANCE_ADMIN_EMAIL: "owner-finance@example.com",
    READER_ADMIN_EMAIL: "owner-reader@example.com",
    DEVELOPER_FINANCE_EMAIL: "developer-finance@example.com",
    DEVELOPER_FINANCE_FULL_NAME: "Developer Finance",
    DEVELOPER_FINANCE_PASSWORD: developerPassword,
    DEVELOPER_READER_EMAIL: "developer-reader@example.com",
    DEVELOPER_READER_FULL_NAME: "Developer Reader",
    DEVELOPER_READER_PASSWORD: developerPassword,
    ...overrides,
  }
}

function ownerState() {
  return {
    profiles: [
      {
        account_type: "owner",
        email: "owner-finance@example.com",
        full_name: "Owner Finance",
        id: "owner-finance-id",
        role: "finance",
      },
      {
        account_type: "owner",
        email: "owner-reader@example.com",
        full_name: "Owner Reader",
        id: "owner-reader-id",
        role: "reader",
      },
    ],
    users: [
      { email: "owner-finance@example.com", id: "owner-finance-id" },
      { email: "owner-reader@example.com", id: "owner-reader-id" },
    ],
  }
}

test("extracts and validates a Supabase project reference", () => {
  assert.equal(getSupabaseProjectRef("https://myproject.supabase.co"), "myproject")
  assert.throws(() => getSupabaseProjectRef("https://example.com"), /SUPABASE_URL/)
})

test("rejects project mismatch and duplicate account emails", () => {
  assert.throws(
    () => buildProvisioningConfig(validEnv({ EXPECTED_SUPABASE_PROJECT_REF: "wrongproject" })),
    /project mismatch/,
  )
  assert.throws(
    () =>
      buildProvisioningConfig(
        validEnv({ DEVELOPER_FINANCE_EMAIL: "OWNER-FINANCE@example.com" }),
      ),
    /must all be different/,
  )
})

test("requires both existing owner accounts and plans two developer creates", () => {
  const config = buildProvisioningConfig(validEnv())
  const plan = buildProvisioningPlan(ownerState(), config)
  assert.deepEqual(
    plan.map(({ action, target }) => ({ action, email: target.email, role: target.role })),
    [
      { action: "create", email: "developer-finance@example.com", role: "finance" },
      { action: "create", email: "developer-reader@example.com", role: "reader" },
    ],
  )

  const missingOwner = ownerState()
  missingOwner.profiles.pop()
  assert.throws(() => buildProvisioningPlan(missingOwner, config), /reader owner account/)
})

test("updates existing developers idempotently without targeting owners", () => {
  const config = buildProvisioningConfig(validEnv())
  const state = ownerState()
  state.profiles.push({
    account_type: "developer",
    email: "developer-finance@example.com",
    full_name: "Old Name",
    id: "developer-finance-id",
    role: "finance",
  })
  state.users.push({ email: "developer-finance@example.com", id: "developer-finance-id" })
  const plan = buildProvisioningPlan(state, config)
  assert.deepEqual(plan.map(({ action }) => action), ["update", "create"])
  assert.ok(plan.every(({ target }) => target.accountType === "developer"))
})

test("Test plans in-place developer replacements while preserving user IDs", () => {
  const config = buildProvisioningConfig(
    validEnv({
      APP_ENV: "test",
      FINANCE_ADMIN_EMAIL: "",
      READER_ADMIN_EMAIL: "",
    }),
  )
  const state = {
    profiles: [
      {
        email: "old-finance@example.com",
        full_name: "Old Finance",
        id: "finance-id",
        role: "finance",
      },
      {
        email: "old-reader@example.com",
        full_name: "Old Reader",
        id: "reader-id",
        role: "reader",
      },
    ],
    users: [
      { email: "old-finance@example.com", id: "finance-id" },
      { email: "old-reader@example.com", id: "reader-id" },
    ],
  }

  const plan = buildProvisioningPlan(state, config)
  assert.deepEqual(
    plan.map(({ action, existingProfile, target }) => ({
      action,
      id: existingProfile.id,
      role: target.role,
      targetEmail: target.email,
    })),
    [
      {
        action: "replace",
        id: "finance-id",
        role: "finance",
        targetEmail: "developer-finance@example.com",
      },
      {
        action: "replace",
        id: "reader-id",
        role: "reader",
        targetEmail: "developer-reader@example.com",
      },
    ],
  )
})

test("Test replacement updates profiles and Auth users without creating or deleting users", async () => {
  const config = buildProvisioningConfig(validEnv({ APP_ENV: "test" }))
  const state = {
    profiles: [
      { email: "old-finance@example.com", full_name: "Old Finance", id: "finance-id", role: "finance" },
      { email: "old-reader@example.com", full_name: "Old Reader", id: "reader-id", role: "reader" },
    ],
    users: [
      { email: "old-finance@example.com", id: "finance-id" },
      { email: "old-reader@example.com", id: "reader-id" },
    ],
  }
  const profileUpdates = []
  const authUpdates = []
  const repository = {
    loadState: async () => state,
    replaceProfile: async (id, target) => profileUpdates.push({ email: target.email, id }),
    replaceAuthUser: async (id, target) => authUpdates.push({ email: target.email, id }),
    createAuthUser: async () => assert.fail("Test replacement must not create Auth users"),
    deleteAuthUser: async () => assert.fail("Test replacement must not delete Auth users"),
  }

  await provisionAdmins({ config, logger: { log() {} }, repository })
  assert.deepEqual(profileUpdates, [
    { email: "developer-finance@example.com", id: "finance-id" },
    { email: "developer-reader@example.com", id: "reader-id" },
  ])
  assert.deepEqual(authUpdates, profileUpdates)
})

test("dry run performs reads only and does not log secrets", async () => {
  const config = buildProvisioningConfig(validEnv())
  const messages = []
  const repository = {
    loadState: async () => ownerState(),
    createAuthUser: async () => assert.fail("dry run created Auth user"),
    insertProfile: async () => assert.fail("dry run inserted profile"),
    updateAuthUser: async () => assert.fail("dry run updated Auth user"),
    updateProfile: async () => assert.fail("dry run updated profile"),
  }

  await provisionAdmins({
    config,
    dryRun: true,
    logger: { log: (message) => messages.push(message) },
    repository,
  })

  const output = messages.join("\n")
  assert.match(output, /Owner accounts were preserved|owner accounts/)
  assert.match(output, /No remote data was changed/)
  assert.doesNotMatch(output, new RegExp(secretKey))
  assert.doesNotMatch(output, new RegExp(developerPassword))
})

test("creates both developers and rolls back a newly created Auth user on profile failure", async () => {
  const config = buildProvisioningConfig(validEnv())
  const created = []
  const inserted = []
  const deleted = []
  const repository = {
    loadState: async () => ownerState(),
    createAuthUser: async (target) => {
      created.push(target.role)
      return { id: `${target.role}-id` }
    },
    insertProfile: async (id, target) => inserted.push({ id, role: target.role }),
    deleteAuthUser: async (id) => deleted.push(id),
  }

  await provisionAdmins({ config, logger: { log() {} }, repository })
  assert.deepEqual(created, ["finance", "reader"])
  assert.deepEqual(inserted, [
    { id: "finance-id", role: "finance" },
    { id: "reader-id", role: "reader" },
  ])
  assert.deepEqual(deleted, [])

  const failingRepository = {
    loadState: async () => ownerState(),
    createAuthUser: async () => ({ id: "new-user-id" }),
    insertProfile: async () => {
      throw new Error("profile write failed")
    },
    deleteAuthUser: async (id) => deleted.push(id),
  }
  await assert.rejects(
    provisionAdmins({ config, logger: { log() {} }, repository: failingRepository }),
    /profile write failed/,
  )
  assert.equal(deleted.at(-1), "new-user-id")
})

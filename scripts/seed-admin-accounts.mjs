import { pathToFileURL } from "node:url"

import { createClient } from "@supabase/supabase-js"

export const ADMIN_ROLES = ["finance", "reader"]

function requiredEnv(env, name) {
  const value = env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function normalizeEmail(value, name) {
  const email = requiredEnv({ [name]: value }, name).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`Invalid email address in ${name}`)
  }
  return email
}

export function getSupabaseProjectRef(urlValue) {
  let url
  try {
    url = new URL(urlValue)
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL")
  }

  const match = url.hostname.match(/^([a-z0-9]+)\.supabase\.co$/i)
  if (url.protocol !== "https:" || !match) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use https://<project-ref>.supabase.co")
  }
  return match[1].toLowerCase()
}

export function buildProvisioningConfig(env = process.env) {
  const appEnv = requiredEnv(env, "APP_ENV").toLowerCase()
  if (!['business', 'test'].includes(appEnv)) {
    throw new Error('APP_ENV must be either "business" or "test"')
  }
  const supabaseUrl = requiredEnv(env, "NEXT_PUBLIC_SUPABASE_URL")
  const serviceRoleKey = requiredEnv(env, "SUPABASE_SERVICE_ROLE_KEY")
  const expectedProjectRef = requiredEnv(env, "EXPECTED_SUPABASE_PROJECT_REF").toLowerCase()
  const actualProjectRef = getSupabaseProjectRef(supabaseUrl)

  if (actualProjectRef !== expectedProjectRef) {
    throw new Error(
      `Supabase project mismatch: expected ${expectedProjectRef}, received ${actualProjectRef}`,
    )
  }

  const owners =
    appEnv === "business"
      ? Object.fromEntries(
          ADMIN_ROLES.map((role) => {
            const prefix = role.toUpperCase()
            return [
              role,
              {
                accountType: "owner",
                email: normalizeEmail(env[`${prefix}_ADMIN_EMAIL`], `${prefix}_ADMIN_EMAIL`),
                role,
              },
            ]
          }),
        )
      : {}

  const developers = Object.fromEntries(
    ADMIN_ROLES.map((role) => {
      const prefix = `DEVELOPER_${role.toUpperCase()}`
      const password = requiredEnv(env, `${prefix}_PASSWORD`)
      if (password.length < 12) {
        throw new Error(`${prefix}_PASSWORD must contain at least 12 characters`)
      }
      return [
        role,
        {
          accountType: "developer",
          email: normalizeEmail(env[`${prefix}_EMAIL`], `${prefix}_EMAIL`),
          fullName: requiredEnv(env, `${prefix}_FULL_NAME`),
          password,
          role,
        },
      ]
    }),
  )

  const emails = [...Object.values(owners), ...Object.values(developers)].map(({ email }) => email)
  if (new Set(emails).size !== emails.length) {
    throw new Error("Owner and developer admin emails must all be different")
  }

  return { actualProjectRef, appEnv, developers, owners, serviceRoleKey, supabaseUrl }
}

export function buildProvisioningPlan(state, config) {
  const profiles = Array.isArray(state?.profiles) ? state.profiles : []
  const users = Array.isArray(state?.users) ? state.users : []
  const profilesByEmail = new Map(profiles.map((profile) => [profile.email.toLowerCase(), profile]))
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))
  const usersByEmail = new Map(
    users.filter((user) => user.email).map((user) => [user.email.toLowerCase(), user]),
  )
  const usersById = new Map(users.map((user) => [user.id, user]))

  if (config.appEnv === "test") {
    if (profiles.length !== 2) {
      throw new Error(`Test provisioning requires exactly two existing admin profiles; found ${profiles.length}`)
    }

    return ADMIN_ROLES.map((role) => {
      const roleProfiles = profiles.filter((profile) => profile.role === role)
      if (roleProfiles.length !== 1) {
        throw new Error(`Test provisioning requires exactly one existing ${role} profile`)
      }
      const profile = roleProfiles[0]
      const user = usersById.get(profile.id)
      if (!user || (user.email || "").toLowerCase() !== profile.email.toLowerCase()) {
        throw new Error(`Existing Test ${role} profile and Auth user are inconsistent`)
      }

      const target = config.developers[role]
      const targetUser = usersByEmail.get(target.email)
      if (targetUser && targetUser.id !== profile.id) {
        throw new Error(`Target developer ${role} email already belongs to another Auth user`)
      }

      return {
        action: "replace",
        existingProfile: profile,
        existingUser: user,
        target,
      }
    })
  }

  for (const role of ADMIN_ROLES) {
    const owner = config.owners[role]
    const profile = profilesByEmail.get(owner.email)
    const user = profile ? usersById.get(profile.id) : null
    if (
      !profile ||
      profile.role !== role ||
      profile.account_type !== "owner" ||
      !user ||
      (user.email || "").toLowerCase() !== owner.email
    ) {
      throw new Error(`The existing ${role} owner account is missing or inconsistent; no changes were made`)
    }
  }

  return ADMIN_ROLES.map((role) => {
    const target = config.developers[role]
    const profile = profilesByEmail.get(target.email)
    const user = usersByEmail.get(target.email)

    if (profile && (!user || user.id !== profile.id)) {
      throw new Error(`Developer ${role} profile and Auth user are inconsistent`)
    }
    if (user && profilesById.has(user.id) && profilesById.get(user.id).email.toLowerCase() !== target.email) {
      throw new Error(`Developer ${role} Auth user is already linked to another admin profile`)
    }

    return {
      action: profile ? "update" : user ? "link" : "create",
      existingProfile: profile || null,
      existingUser: user || null,
      target,
    }
  })
}

export function createSupabaseAdminRepository(client) {
  function assertSuccess(result, action) {
    if (result.error) {
      const migrationHint =
        result.error.message.includes("account_type") ||
        result.error.message.includes("Only two admin profiles") ||
        result.error.message.includes("duplicate key value")
          ? " Apply scripts/016_allow_owner_and_developer_admins.sql first."
          : ""
      throw new Error(`${action}: ${result.error.message}.${migrationHint}`)
    }
    return result.data
  }

  return {
    async loadState() {
      let profileResult = await client
        .from("admin_profiles")
        .select("id, email, role, full_name, account_type")
      if (profileResult.error?.message.includes("account_type")) {
        profileResult = await client.from("admin_profiles").select("id, email, role, full_name")
      }
      const profiles = assertSuccess(profileResult, "Unable to read admin profiles")
      const users = []
      for (let page = 1; ; page += 1) {
        const data = assertSuccess(
          await client.auth.admin.listUsers({ page, perPage: 1000 }),
          "Unable to read Auth users",
        )
        users.push(...data.users)
        if (data.users.length < 1000) break
      }
      return { profiles: profiles || [], users }
    },

    async createAuthUser(target) {
      const data = assertSuccess(
        await client.auth.admin.createUser({
          email: target.email,
          password: target.password,
          email_confirm: true,
          user_metadata: {
            account_type: target.accountType,
            full_name: target.fullName,
            role: target.role,
          },
        }),
        `Unable to create developer ${target.role} Auth user`,
      )
      return data.user
    },

    async updateAuthUser(id, target) {
      assertSuccess(
        await client.auth.admin.updateUserById(id, {
          password: target.password,
          user_metadata: {
            account_type: target.accountType,
            full_name: target.fullName,
            role: target.role,
          },
        }),
        `Unable to update developer ${target.role} Auth user`,
      )
    },

    async replaceAuthUser(id, target) {
      assertSuccess(
        await client.auth.admin.updateUserById(id, {
          email: target.email,
          email_confirm: true,
          password: target.password,
          user_metadata: {
            account_type: target.accountType,
            full_name: target.fullName,
            role: target.role,
          },
        }),
        `Unable to replace Test ${target.role} Auth user`,
      )
    },

    async insertProfile(id, target) {
      assertSuccess(
        await client.from("admin_profiles").insert({
          account_type: target.accountType,
          email: target.email,
          full_name: target.fullName,
          id,
          role: target.role,
        }),
        `Unable to create developer ${target.role} profile`,
      )
    },

    async updateProfile(id, target) {
      assertSuccess(
        await client
          .from("admin_profiles")
          .update({
            account_type: target.accountType,
            email: target.email,
            full_name: target.fullName,
            role: target.role,
          })
          .eq("id", id),
        `Unable to update developer ${target.role} profile`,
      )
    },

    async replaceProfile(id, target) {
      assertSuccess(
        await client
          .from("admin_profiles")
          .update({
            email: target.email,
            full_name: target.fullName,
            role: target.role,
          })
          .eq("id", id),
        `Unable to replace Test ${target.role} profile`,
      )
    },

    async deleteProfile(id) {
      assertSuccess(
        await client.from("admin_profiles").delete().eq("id", id),
        "Unable to roll back developer profile",
      )
    },

    async deleteAuthUser(id) {
      assertSuccess(await client.auth.admin.deleteUser(id), "Unable to roll back developer Auth user")
    },
  }
}

export async function provisionAdmins({ config, dryRun = false, logger = console, repository }) {
  const state = await repository.loadState()
  const plan = buildProvisioningPlan(state, config)

  logger.log(
    config.appEnv === "business"
      ? `Validated Business Supabase project ${config.actualProjectRef} and both owner accounts.`
      : `Validated Test Supabase project ${config.actualProjectRef} with one existing account per role.`,
  )
  for (const item of plan) {
    logger.log(`developer ${item.target.role}: ${item.action} account.`)
  }

  if (dryRun) {
    logger.log("Dry run complete. No remote data was changed.")
    return plan
  }

  for (const item of plan) {
    const { target } = item
    if (item.action === "replace") {
      await repository.replaceProfile(item.existingProfile.id, target)
      try {
        await repository.replaceAuthUser(item.existingProfile.id, target)
      } catch (authError) {
        await repository.replaceProfile(item.existingProfile.id, {
          email: item.existingProfile.email,
          fullName: item.existingProfile.full_name,
          role: item.existingProfile.role,
        })
        throw authError
      }
    } else if (item.action === "create") {
      const user = await repository.createAuthUser(target)
      try {
        await repository.insertProfile(user.id, target)
      } catch (profileError) {
        try {
          await repository.deleteAuthUser(user.id)
        } catch (rollbackError) {
          throw new AggregateError(
            [profileError, rollbackError],
            `Developer ${target.role} creation and rollback both failed`,
          )
        }
        throw profileError
      }
    } else if (item.action === "link") {
      await repository.insertProfile(item.existingUser.id, target)
      try {
        await repository.updateAuthUser(item.existingUser.id, target)
      } catch (authError) {
        await repository.deleteProfile(item.existingUser.id)
        throw authError
      }
    } else {
      await repository.updateProfile(item.existingProfile.id, target)
      try {
        await repository.updateAuthUser(item.existingProfile.id, target)
      } catch (authError) {
        await repository.updateProfile(item.existingProfile.id, {
          accountType: item.existingProfile.account_type,
          email: item.existingProfile.email,
          fullName: item.existingProfile.full_name,
          role: item.existingProfile.role,
        })
        throw authError
      }
    }
    logger.log(`developer ${target.role}: account provisioned successfully.`)
  }

  logger.log(
    config.appEnv === "business"
      ? "Developer provisioning completed. Owner accounts were preserved."
      : "Test admin replacement completed. Both existing user IDs were preserved.",
  )
  return plan
}

function parseArgs(args) {
  const unknown = args.filter((arg) => arg !== "--dry-run")
  if (unknown.length > 0) {
    throw new Error(`Unknown argument: ${unknown[0]}`)
  }
  return { dryRun: args.includes("--dry-run") }
}

async function main() {
  const { dryRun } = parseArgs(process.argv.slice(2))
  const config = buildProvisioningConfig()
  const client = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const repository = createSupabaseAdminRepository(client)
  await provisionAdmins({ config, dryRun, repository })
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(`Admin provisioning failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    process.exitCode = 1
  })
}

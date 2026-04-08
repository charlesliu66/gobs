import { cookies } from "next/headers"
import { COOKIE_NAME, verifySessionTokenPayload } from "@/lib/auth-session"
import { findUserById } from "@/lib/auth-store"
import { userToSession, type SessionUser } from "@/lib/auth-types"

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (!token) return null
  const payload = await verifySessionTokenPayload(token)
  if (!payload) return null
  const record = await findUserById(payload.sub)
  if (!record) return null
  if ((record.credentialVersion ?? 1) !== payload.cv) return null
  return userToSession(record)
}

/**
 * Authentication Utilities
 * 
 * Simple JWT-based authentication system.
 * In production, use NextAuth.js or a more robust auth solution.
 */

import { compare, hash } from "bcryptjs"
import { sign, verify } from "jsonwebtoken"
import { getUserByEmail, createUser, getUserById } from "@/lib/db/database"
import type { User } from "@/lib/db/schema"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"
const JWT_EXPIRES_IN = "7d"

export interface AuthToken {
  userId: string
  email: string
  role: string
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash)
}

export function generateToken(user: User): string {
  return sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

export function verifyToken(token: string): AuthToken | null {
  try {
    return verify(token, JWT_SECRET) as AuthToken
  } catch (error) {
    return null
  }
}

export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{ user: Omit<User, "passwordHash">; token: string }> {
  const existing = await getUserByEmail(email)
  if (existing) {
    throw new Error("User already exists")
  }

  const passwordHash = await hashPassword(password)
  const user = await createUser({
    id: crypto.randomUUID(),
    email,
    name,
    passwordHash,
    role: "user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  const { passwordHash: _, ...userWithoutPassword } = user
  const token = generateToken(user)

  return { user: userWithoutPassword, token }
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: Omit<User, "passwordHash">; token: string }> {
  const user = await getUserByEmail(email)
  if (!user) {
    throw new Error("Invalid credentials")
  }

  const isValid = await verifyPassword(password, user.passwordHash)
  if (!isValid) {
    throw new Error("Invalid credentials")
  }

  const { passwordHash: _, ...userWithoutPassword } = user
  const token = generateToken(user)

  return { user: userWithoutPassword, token }
}

export async function getCurrentUser(token: string): Promise<Omit<User, "passwordHash"> | null> {
  const decoded = verifyToken(token)
  if (!decoded) return null

  const user = await getUserById(decoded.userId)
  if (!user) return null

  const { passwordHash: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

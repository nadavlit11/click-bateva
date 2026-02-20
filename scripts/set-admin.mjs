/**
 * Bootstrap script: set a user's role to 'admin'.
 *
 * Use this once to create the first admin user, since the onUserCreated trigger
 * sets all new users to 'standard_user' and setUserRole callable requires an
 * existing admin caller.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/set-admin.mjs <uid>
 *
 * Get a service account key from:
 *   Firebase Console → Project Settings → Service accounts → Generate new private key
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const uid = process.argv[2]
if (!uid) {
  console.error('Usage: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/set-admin.mjs <uid>')
  process.exit(1)
}

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!credPath) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS env var is required')
  process.exit(1)
}

initializeApp({ credential: cert(credPath) })

const adminAuth = getAuth()
const db = getFirestore()

await adminAuth.setCustomUserClaims(uid, { role: 'admin' })
await db.collection('users').doc(uid).set({ role: 'admin' }, { merge: true })

console.log(`✓ Set ${uid} as admin. The user must sign out and back in for the new token to take effect.`)

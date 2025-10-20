export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32))
}

export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations: number = 600000
): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const passwordBuffer = enc.encode(password)

  const passwordKey = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  )

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: iterations,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 } as AesKeyGenParams,
    false,
    ["encrypt", "decrypt"] as KeyUsage[]
  )

  passwordBuffer.fill(0)

  return derivedKey
}

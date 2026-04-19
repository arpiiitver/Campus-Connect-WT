const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV for GCM
const TAG_LENGTH = 16; // 128-bit auth tag
const KEY_LENGTH = 32; // 256-bit key
const PBKDF2_ITERATIONS = 100000;

/**
 * Derive a unique AES-256 key for a specific chat room.
 * Uses PBKDF2 with the room ID as salt and a server master secret.
 */
function deriveRoomKey(roomId) {
  const masterSecret = process.env.ENCRYPTION_SECRET;
  if (!masterSecret) {
    throw new Error('ENCRYPTION_SECRET is not set in environment variables');
  }

  return crypto.pbkdf2Sync(
    masterSecret,
    roomId.toString(),
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha512'
  );
}

/**
 * Encrypt a plaintext message using AES-256-GCM.
 * Returns { ciphertext, iv, tag } as hex strings.
 */
function encryptMessage(plaintext, roomKey) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, roomKey, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

/**
 * Decrypt an encrypted message using AES-256-GCM.
 * Expects { ciphertext, iv, tag } as hex strings.
 * Returns plaintext string.
 */
function decryptMessage({ ciphertext, iv, tag }, roomKey) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    roomKey,
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tag, 'hex'));

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = {
  deriveRoomKey,
  encryptMessage,
  decryptMessage,
};

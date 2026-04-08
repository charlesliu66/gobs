import bcrypt from 'bcryptjs';

const ROUNDS = 10;

export async function hashGobsPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyGobsPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

import bcrypt from 'bcryptjs';
const ROUNDS = 10;
export async function hashGobsPassword(plain) {
    return bcrypt.hash(plain, ROUNDS);
}
export async function verifyGobsPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
}

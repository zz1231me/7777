import crypto from 'crypto';

// 환경변수에서 SALT 값과 라운드 수 가져오기 (필수)
const SALT = process.env.PASSWORD_SALT;
const ROUNDS_ENV = process.env.PASSWORD_ROUNDS;

if (!SALT) {
  throw new Error('PASSWORD_SALT 환경변수가 설정되지 않았습니다.');
}

if (!ROUNDS_ENV) {
  throw new Error('PASSWORD_ROUNDS 환경변수가 설정되지 않았습니다.');
}

const DEFAULT_ROUNDS = parseInt(ROUNDS_ENV);

if (isNaN(DEFAULT_ROUNDS) || DEFAULT_ROUNDS <= 0) {
  throw new Error('PASSWORD_ROUNDS는 양수여야 합니다.');
}

export function hashPassword(password: string, rounds: number = DEFAULT_ROUNDS): string {
  let hash = password + SALT;
  for (let i = 0; i < rounds; i++) {
    hash = crypto.createHash('sha256').update(hash).digest('hex');
  }
  return hash;
}
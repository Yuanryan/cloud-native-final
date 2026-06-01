import { ConfigService } from '@nestjs/config';

/** 未設定或空白時與 JwtStrategy 一致，避免 sign / verify 用到空字串。 */
export function getJwtSecret(config: ConfigService): string {
  const raw = config.get<string>('JWT_SECRET');
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return 'dev-secret-change-me';
}

/**
 * JWT 過期秒數，必須以「數字」傳給 @nestjs/jwt / jsonwebtoken。
 * 若從 .env 讀出字串 "28800" 當 expiresIn，jsonwebtoken 會用 ms() 解析成 28800「毫秒」≈28 秒，
 * 表單填久一點再送請求就會 401。
 */
export function getJwtExpiresSec(config: ConfigService): number {
  const raw = config.get('JWT_EXPIRES_SEC');
  const n =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number.parseInt(raw.trim(), 10)
        : Number.NaN;
  if (!Number.isFinite(n) || n < 60) {
    return 28800;
  }
  if (n > 86400 * 30) {
    return 86400 * 30;
  }
  return n;
}

export type Env = {
  ENVIRONMENT: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JWT_SECRET: string;
  TURNSTILE_SECRET_KEY?: string;
  OTP_PROVIDER_API_KEY?: string;
  RESEND_API_KEY?: string;
  OTP_EMAIL_FROM?: string;
  ELECOM_ADMIN_EMAIL?: string;
  ELECOM_ADMIN_EMAILS?: string;
  ELECOM_ADMIN_PASSWORD?: string;
  /** Comma-separated license codes with ELECOM superuser access */
  ELECOM_SUPERUSER_LICENSES?: string;
};

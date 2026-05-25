export type Env = {
  ENVIRONMENT: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JWT_SECRET: string;
  TURNSTILE_SECRET_KEY?: string;
  OTP_PROVIDER_API_KEY?: string;
  RESEND_API_KEY?: string;
  OTP_EMAIL_FROM?: string;
};

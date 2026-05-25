-- Fix: Worker (service_role) must read/write otp_sessions for login OTP
GRANT ALL ON public.otp_sessions TO service_role;

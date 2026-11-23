-- PaymentAttempt was introduced after the original public-table hardening.
-- Keep the server-side Prisma owner as the only data access path.
ALTER TABLE public."PaymentAttempt" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."PaymentAttempt" FROM PUBLIC;

DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."PaymentAttempt" FROM %I', api_role);
    END IF;
  END LOOP;
END $$;

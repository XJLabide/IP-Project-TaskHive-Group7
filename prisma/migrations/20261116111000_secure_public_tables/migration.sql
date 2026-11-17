-- TaskHive authorizes requests in its server application. Supabase API roles
-- must not access these tables directly; the PostgreSQL owner retains access.
DO $$
DECLARE
  table_name text;
  api_role text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    '_prisma_migrations', 'User', 'Session', 'Account', 'Verification',
    'Profile', 'TaskerVerification', 'Category', 'Task', 'Bid', 'TaskRequest',
    'Assignment', 'Payment', 'Payout', 'Review', 'Notification', 'Report',
    'Dispute', 'AdminAction', 'UploadAsset', 'TaskChat', 'ChatMessage',
    'PaymentEvent', 'CancellationRequest'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', table_name);
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', table_name, api_role);
      END IF;
    END LOOP;
  END LOOP;
END $$;

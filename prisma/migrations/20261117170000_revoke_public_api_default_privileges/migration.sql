-- Keep future Prisma-created public objects unavailable to Supabase API roles.
DO $$
DECLARE
  owner_role text;
  api_role text;
BEGIN
  FOR owner_role IN
    SELECT rolname FROM pg_roles WHERE rolname IN (current_user, 'postgres')
  LOOP
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC',
      owner_role
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC',
      owner_role
    );

    FOR api_role IN
      SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
    LOOP
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM %I',
        owner_role,
        api_role
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM %I',
        owner_role,
        api_role
      );
    END LOOP;
  END LOOP;
END $$;

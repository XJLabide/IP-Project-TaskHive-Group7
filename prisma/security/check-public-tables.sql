-- Read-only check for TaskHive's server-only database access model.
-- Inspect the catalog rather than a fixed table list so new migrations are covered.
WITH public_relations AS (
  SELECT c.oid, c.relname, c.relkind, c.relowner, c.relacl, c.relrowsecurity
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
), api_roles AS (
  SELECT oid, rolname FROM pg_catalog.pg_roles
  WHERE rolname IN ('anon', 'authenticated')
), findings AS (
  SELECT 'public.' || quote_ident(c.relname) AS "objectName", 'RLS_DISABLED' AS issue
  FROM public_relations c
  WHERE c.relkind IN ('r', 'p') AND NOT c.relrowsecurity

  UNION ALL

  SELECT 'public.' || quote_ident(c.relname), 'PUBLIC_PRIVILEGE'
  FROM public_relations c
  WHERE EXISTS (
    SELECT 1 FROM pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) acl
    WHERE acl.grantee = 0
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) acl
    WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped AND acl.grantee = 0
  )

  UNION ALL

  SELECT 'public.' || quote_ident(c.relname), 'API_PRIVILEGE:' || r.rolname
  FROM public_relations c CROSS JOIN api_roles r
  WHERE pg_catalog.has_table_privilege(r.oid, c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
     OR pg_catalog.has_any_column_privilege(r.oid, c.oid, 'SELECT, INSERT, UPDATE, REFERENCES')

  UNION ALL

  SELECT 'public._prisma_migrations', 'MIGRATION_HISTORY_MISSING'
  WHERE pg_catalog.to_regclass('public._prisma_migrations') IS NULL
)
SELECT "objectName", issue FROM findings ORDER BY "objectName", issue;

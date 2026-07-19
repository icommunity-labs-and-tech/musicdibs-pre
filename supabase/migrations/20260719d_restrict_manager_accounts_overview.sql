-- Security scan (2026-07-19): "Security Definer View" + acceso publico.
-- manager_accounts_overview es SECURITY DEFINER y tenia GRANT SELECT (y hasta
-- INSERT/UPDATE/DELETE, aunque no aplican a una vista sin trigger INSTEAD OF)
-- para anon Y authenticated -- CUALQUIERA, sin login, podia leer company_name,
-- contact_email y annual_price_eur de TODOS los contratos de manager via
-- PostgREST directo. Confirmado que ningun codigo de la app usa esta vista
-- (solo aparece en los tipos autogenerados) -- es de uso interno via SQL
-- directo. Se revoca el acceso completo salvo para service_role/postgres.
revoke all on manager_accounts_overview from anon, authenticated;

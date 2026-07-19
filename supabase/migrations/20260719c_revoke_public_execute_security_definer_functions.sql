-- Security scan (2026-07-19): "Public/Signed-in users can execute SECURITY
-- DEFINER function" -- EL HALLAZGO MAS GRAVE DE TODA LA AUDITORIA.
--
-- Postgres concede EXECUTE a PUBLIC por defecto al crear una funcion, salvo
-- que se revoque explicitamente. Ninguna funcion de este proyecto habia
-- revocado ese privilegio por defecto, y varias no tienen NINGUN chequeo
-- interno de autorizacion -- siendo SECURITY DEFINER (bypassa RLS), esto las
-- hacia explotables por CUALQUIERA (incluso sin login) via RPC directo:
--
-- CRITICO -- fraude de creditos, cero chequeo interno de auth.uid()/rol:
--   increment_user_credits(p_user_id, p_delta) -- cualquiera podia darse/dar
--     creditos infinitos a cualquier cuenta.
--   refund_credits_ordered, refund_user_credits -- mismo problema, via
--     "reembolso" arbitrario.
--   deduct_credits_ordered -- permitia vaciar los creditos de cualquier
--     cuenta objetivo (griefing/DoS).
--
-- CRITICO -- fuga masiva de PII, cero chequeo interno:
--   get_emails_by_user_ids(uuid[]) -- resuelve email para cualquier array
--     de UUIDs (enumeracion completa de usuarios).
--   get_profiles_with_email -- volcado paginado de email+plan+creditos+KYC
--     de TODA la base de usuarios.
--   get_kyc_pending_users_with_email -- email de usuarios con KYC pendiente.
--
-- CRITICO -- manipulacion de cuentas de manager, cero chequeo interno:
--   add_managed_artist, create_manager_contract, link_managed_work --
--     cualquiera podia crear/modificar contratos de manager (incluye
--     annual_price_eur y asignacion del rol 'manager'), anadir artistas
--     gestionados o vincular obras a cualquier manager.
--
-- MEDIO -- herramientas internas/cron sin chequeo, impacto acotado:
--   get_kyc_pending_users, increment_coupon_redemptions,
--   mark_abandoned_drafts_as_failed, check_renewals_cron_health,
--   get_user_library_tier, y los 4 detect_* creados en esta misma sesion
--   para purchase-integrity-monitor / subscription-reconciliation-cron
--   (ya tenian "grant to service_role" explicito, pero el grant a PUBLIC
--   por defecto de Postgres seguia vigente por encima).
--
-- HIGIENE -- funciones trigger, nunca deben llamarse via RPC directo:
--   enforce_profiles_immutable_columns, notify_admin_alert_email.
--
-- Se mantienen SIN cambios (necesarias para RLS, o ya protegidas
-- internamente con has_role -- verificado leyendo su definicion):
--   has_role, is_active_manager, manager_can_access_artist,
--   get_public_app_setting, admin_get_user_credit_audit,
--   get_admin_ai_generation_logs, get_admin_ai_generation_log_payloads,
--   get_operation_pricing_admin.
--
-- Confirmado (grep en src/) que ninguna de las 21 funciones revocadas se
-- llama desde el frontend -- solo desde edge functions con service role.

revoke execute on function add_managed_artist(uuid, text, uuid, text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function create_manager_contract(uuid, text, text, integer, integer, integer, numeric, text, boolean, boolean, date, date, text, uuid) from public, anon, authenticated;
revoke execute on function link_managed_work(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function get_emails_by_user_ids(uuid[]) from public, anon, authenticated;
revoke execute on function get_profiles_with_email(integer, integer, boolean) from public, anon, authenticated;
revoke execute on function get_kyc_pending_users_with_email(integer, timestamptz, integer) from public, anon, authenticated;
revoke execute on function get_kyc_pending_users(integer, timestamptz, integer) from public, anon, authenticated;
revoke execute on function increment_coupon_redemptions(uuid) from public, anon, authenticated;
revoke execute on function mark_abandoned_drafts_as_failed() from public, anon, authenticated;
revoke execute on function check_renewals_cron_health() from public, anon, authenticated;
revoke execute on function increment_user_credits(uuid, integer) from public, anon, authenticated;
revoke execute on function refund_credits_ordered(uuid, integer, integer, text) from public, anon, authenticated;
revoke execute on function refund_user_credits(uuid, integer, text) from public, anon, authenticated;
revoke execute on function deduct_credits_ordered(uuid, integer, text, text) from public, anon, authenticated;
revoke execute on function get_user_library_tier(uuid) from public, anon, authenticated;
revoke execute on function detect_active_plan_without_subscription(timestamptz) from public, anon, authenticated;
revoke execute on function detect_free_high_credits(integer, text[]) from public, anon, authenticated;
revoke execute on function detect_high_credit_candidates() from public, anon, authenticated;
revoke execute on function detect_profiles_missing_subscription_row() from public, anon, authenticated;
revoke execute on function enforce_profiles_immutable_columns() from public, anon, authenticated;
revoke execute on function notify_admin_alert_email() from public, anon, authenticated;

grant execute on function add_managed_artist(uuid, text, uuid, text, text, text, text, text, text) to service_role;
grant execute on function create_manager_contract(uuid, text, text, integer, integer, integer, numeric, text, boolean, boolean, date, date, text, uuid) to service_role;
grant execute on function link_managed_work(uuid, uuid, uuid, text) to service_role;
grant execute on function get_emails_by_user_ids(uuid[]) to service_role;
grant execute on function get_profiles_with_email(integer, integer, boolean) to service_role;
grant execute on function get_kyc_pending_users_with_email(integer, timestamptz, integer) to service_role;
grant execute on function get_kyc_pending_users(integer, timestamptz, integer) to service_role;
grant execute on function increment_coupon_redemptions(uuid) to service_role;
grant execute on function mark_abandoned_drafts_as_failed() to service_role;
grant execute on function check_renewals_cron_health() to service_role;
grant execute on function increment_user_credits(uuid, integer) to service_role;
grant execute on function refund_credits_ordered(uuid, integer, integer, text) to service_role;
grant execute on function refund_user_credits(uuid, integer, text) to service_role;
grant execute on function deduct_credits_ordered(uuid, integer, text, text) to service_role;
grant execute on function get_user_library_tier(uuid) to service_role;
grant execute on function detect_active_plan_without_subscription(timestamptz) to service_role;
grant execute on function detect_free_high_credits(integer, text[]) to service_role;
grant execute on function detect_high_credit_candidates() to service_role;
grant execute on function detect_profiles_missing_subscription_row() to service_role;

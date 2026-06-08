
DO $$
DECLARE r record; new_payload jsonb;
BEGIN
  FOR r IN
    SELECT msg_id, message FROM pgmq.q_transactional_emails
    WHERE message->>'label' = 'distribution_onboarding'
  LOOP
    new_payload := r.message
      || jsonb_build_object('queued_at', to_jsonb(to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
    PERFORM pgmq.send('transactional_emails', new_payload);
    PERFORM pgmq.delete('transactional_emails', r.msg_id);
  END LOOP;
END $$;

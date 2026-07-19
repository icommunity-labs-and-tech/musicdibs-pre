-- Security scan (2026-07-19): "Users can tamper with work distribution
-- tracking fields". La politica UPDATE de 'works' ya protegia
-- status/hashes/certificados (blockchain_hash, certificate_url,
-- ibs_evidence_id, ibs_signature_id, file_hash, status,
-- file_hash_sha512_b64, ibs_payload_algorithm, ibs_payload_checksum,
-- checker_url, certified_at), pero no blockchain_network -- un usuario
-- podia falsificar la red de blockchain mostrada en su propio certificado.
--
-- distributed_at/distribution_clicks se dejan editables a proposito: los
-- actualiza legitimamente el cliente (DistributeButton.tsx) al pulsar
-- "Distribuir", y son solo un contador de vanidad (no afectan
-- certificacion, pagos ni prueba legal).
drop policy if exists "Users can update distribution on own works" on works;

create policy "Users can update distribution on own works" on works
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and blockchain_hash is not distinct from (select w.blockchain_hash from works w where w.id = works.id)
  and blockchain_network is not distinct from (select w.blockchain_network from works w where w.id = works.id)
  and certificate_url is not distinct from (select w.certificate_url from works w where w.id = works.id)
  and ibs_evidence_id is not distinct from (select w.ibs_evidence_id from works w where w.id = works.id)
  and ibs_signature_id is not distinct from (select w.ibs_signature_id from works w where w.id = works.id)
  and file_hash is not distinct from (select w.file_hash from works w where w.id = works.id)
  and status is not distinct from (select w.status from works w where w.id = works.id)
  and file_hash_sha512_b64 is not distinct from (select w.file_hash_sha512_b64 from works w where w.id = works.id)
  and ibs_payload_algorithm is not distinct from (select w.ibs_payload_algorithm from works w where w.id = works.id)
  and ibs_payload_checksum is not distinct from (select w.ibs_payload_checksum from works w where w.id = works.id)
  and checker_url is not distinct from (select w.checker_url from works w where w.id = works.id)
  and certified_at is not distinct from (select w.certified_at from works w where w.id = works.id)
  and failure_reason is not distinct from (select w.failure_reason from works w where w.id = works.id)
);

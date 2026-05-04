CREATE POLICY "Admins can delete operation_pricing"
ON public.operation_pricing FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert operation_pricing"
ON public.operation_pricing FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
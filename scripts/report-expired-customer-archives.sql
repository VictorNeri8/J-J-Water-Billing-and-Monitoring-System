-- Read-only report. This script never deletes customer or financial data.

SELECT
  customers.id,
  customers.account_number,
  customers.customer_name,
  customers.archived_at,
  customers.archive_expires_at,
  customers.archived_by_email,
  customers.archive_expires_at <= NOW() AS archive_expired,
  (SELECT COUNT(*) FROM public.meter_readings WHERE customer_id = customers.id) AS meter_reading_count,
  (SELECT COUNT(*) FROM public.billings WHERE customer_id = customers.id) AS billing_count,
  (SELECT COUNT(*) FROM public.sms_logs WHERE customer_id = customers.id) AS sms_log_count,
  COALESCE((
    SELECT SUM(GREATEST(amount - COALESCE(amount_paid, 0), 0))
    FROM public.billings
    WHERE customer_id = customers.id
  ), 0) AS outstanding_balance,
  customers.archive_expires_at <= NOW()
    OR NOT EXISTS (
      SELECT 1
      FROM public.billings
      WHERE customer_id = customers.id
        AND amount > COALESCE(amount_paid, 0)
    ) AS can_be_permanently_deleted
FROM public.customers
WHERE customers.archived_at IS NOT NULL
ORDER BY customers.archive_expires_at ASC;

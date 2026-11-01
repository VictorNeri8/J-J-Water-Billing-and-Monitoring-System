-- Analytics functions for /admin/analytics
-- Run this in Supabase SQL Editor.
-- Usage is sourced from meter_readings so rolled-forward billings do not double count usage.
-- Revenue is sourced from paid_date so collections are grouped by when money was actually received.
-- Billing status is sourced from the latest billing row per customer.

CREATE OR REPLACE FUNCTION public.analytics_water_usage(
  p_start_date DATE DEFAULT NULL,
  p_bucket TEXT DEFAULT 'month'
)
RETURNS TABLE (
  bucket_date DATE,
  total_usage NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    CASE
      WHEN p_bucket = 'day' THEN reading_date
      ELSE DATE_TRUNC('month', reading_date)::DATE
    END AS bucket_date,
    COALESCE(SUM(usage_cubic), 0) AS total_usage
  FROM public.meter_readings
  WHERE p_start_date IS NULL OR reading_date >= p_start_date
  GROUP BY 1
  ORDER BY 1 ASC;
$$;

CREATE OR REPLACE FUNCTION public.analytics_revenue(
  p_start_date DATE DEFAULT NULL,
  p_bucket TEXT DEFAULT 'month',
  p_status TEXT DEFAULT 'paid'
)
RETURNS TABLE (
  bucket_date DATE,
  total_revenue NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH paid_snapshots AS (
    SELECT
      customer_id,
      paid_date AS event_date,
      MAX(COALESCE(amount_paid, amount)) AS revenue_value
    FROM public.billings
    WHERE p_status = 'paid'
      AND status = 'paid'
      AND paid_date IS NOT NULL
      AND (p_start_date IS NULL OR paid_date >= p_start_date)
    GROUP BY customer_id, paid_date
  ),
  partial_snapshots AS (
    SELECT
      customer_id,
      billing_date AS event_date,
      COALESCE(amount_paid, 0) AS revenue_value,
      ROW_NUMBER() OVER (
        PARTITION BY customer_id
        ORDER BY billing_date DESC, created_at DESC
      ) AS row_num
    FROM public.billings
    WHERE p_status = 'partial'
      AND status = 'partial'
      AND COALESCE(amount_paid, 0) > 0
      AND (p_start_date IS NULL OR billing_date >= p_start_date)
  ),
  selected_rows AS (
    SELECT event_date, revenue_value
    FROM paid_snapshots
    WHERE p_status = 'paid'

    UNION ALL

    SELECT event_date, revenue_value
    FROM partial_snapshots
    WHERE p_status = 'partial' AND row_num = 1
  )
  SELECT
    CASE
      WHEN p_bucket = 'day' THEN event_date
      ELSE DATE_TRUNC('month', event_date)::DATE
    END AS bucket_date,
    COALESCE(SUM(revenue_value), 0) AS total_revenue
  FROM selected_rows
  GROUP BY 1
  ORDER BY 1 ASC;
$$;

CREATE OR REPLACE FUNCTION public.analytics_billing_status_count(p_start_date DATE DEFAULT NULL)
RETURNS TABLE (
  status TEXT,
  value BIGINT
)
LANGUAGE sql
STABLE
AS $$
  WITH ranked_billings AS (
    SELECT
      customer_id,
      status,
      billing_date,
      created_at,
      ROW_NUMBER() OVER (
        PARTITION BY customer_id
        ORDER BY billing_date DESC, created_at DESC
      ) AS row_num
    FROM public.billings
    WHERE p_start_date IS NULL OR billing_date >= p_start_date
  )
  SELECT
    status,
    COUNT(*) AS value
  FROM ranked_billings
  WHERE row_num = 1
  GROUP BY status
  ORDER BY status ASC;
$$;

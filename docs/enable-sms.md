# Enable SMS Checklist

SMS sending is disabled as of June 4, 2026. The code is preserved behind `SMS_FEATURE_ENABLED`.

## Files To Review

- `lib/config/features.ts` - feature flag and disabled message
- `lib/sms.ts` - preserved SMS provider implementation
- `app/api/sms/send/route.ts` - manual SMS API endpoint
- `app/api/cron/send-reminders/route.ts` - overdue reminder endpoint
- `components/admin/send-manual-sms-dialog.tsx` - admin manual send UI

## Required Environment

Enable the feature flag:

```env
SMS_FEATURE_ENABLED=true
```

For the intended future Semaphore provider:

```env
SEMAPHORE_API_KEY=your_api_key
SEMAPHORE_SENDER_NAME=your_sender_name
```

If reusing the preserved FMCSMS implementation:

```env
SMS_PROVIDER=fmcsms
FMCSMS_API_KEY=your_api_key
FMCSMS_API_URL=https://www.fortmed.org/web/FMCSMS/api/messages.php
FMCSMS_SENDER_NAME=J&J Water
FMCSMS_FROM_NUMBER=+639171234567
```

## Re-enable Steps

1. Set `SMS_FEATURE_ENABLED=true`.
2. Configure the chosen provider credentials.
3. Confirm the SMS provider account has enough credits.
4. Redeploy the application.
5. Send one manual SMS from `/admin/sms`.
6. Run or trigger the overdue reminder flow and confirm skipped, sent, and failed statuses behave correctly.

## Test Checklist

- `/api/sms/send` sends only when `SMS_FEATURE_ENABLED=true`.
- `/api/cron/send-reminders` remains protected by cron authorization.
- Missing provider credentials fail only when SMS is enabled.
- Billing, payment recording, customer creation, dashboard, and email notifications still work.
- SMS history remains readable in `/admin/sms`.

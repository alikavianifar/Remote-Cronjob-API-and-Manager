# Cron Period Wizard: UX/Logic Design

## 1. Logic Flow & Decision Tree

هدف تبدیل زبان طبیعی (Mental Model کاربر) به سینتکس تکنیکال Cron است. ما از یک رویکرد "Top-Down" استفاده می‌کنیم که از کلیات (تکرار) شروع شده و به جزئیات (زمان دقیق) می‌رسد.

### The Decision Map

1.  **Select Frequency (Mode)**
    *   **Preset**: انتخاب‌های سریع (Common patterns)
    *   **Interval**: تکرار هر X واحد زمان
    *   **Specific**: زمان‌های دقیق (Specific Time)
    *   **Advanced**: ورود دستی عبارت Cron

2.  **Configuration Paths**

    *   **Path A: User selects "Minutes/Hours" (Interval Focus)**
        *   IF `Every N Minutes`: Input `[Interval]` -> `*/n * * * *`
        *   IF `Every N Hours`: Input `[Interval]` + `[C Minute]` -> `m */n * * *`

    *   **Path B: User selects "Daily" (Time Focus)**
        *   Input `[Time (HH:mm)]` -> `m h * * *`
        *   Input `[Every N Days]` option? -> `m h */n * *`

    *   **Path C: User selects "Weekly" (Day Focus)**
        *   Input `[Days Selection (Mon...Sun)]` -> `m h * * 1,2,5`
        *   Input `[Time (HH:mm)]` -> `m h * * days`

    *   **Path D: User selects "Monthly" (Date Focus)**
        *   Input `[Day of Month (1-31)]` -> `m h n * *`
        *   Input `[Time (HH:mm)]`

    *   **Path E: User selects "Workdays" (Business context)**
        *   Implicitly selects `Mon-Fri` -> `m h * * 1-5`
        *   Input `[Time (HH:mm)]`

---

## 2. UI Configuration Schema (JSON)

این فایل JSON می‌تواند مستقیماً توسط یک Form Builder در React (مثل `react-hook-form` یا یک مپ ساده) رندر شود.

```json
{
  "wizardConfig": {
    "steps": [
      {
        "id": "frequency",
        "label": "How often?",
        "type": "select",
        "options": [
          { "value": "minute", "label": "Minutes", "description": "Every n minutes" },
          { "value": "hourly", "label": "Hourly", "description": "Every n hours or at specific minute" },
          { "value": "daily", "label": "Daily", "description": "At a specific time every day" },
          { "value": "weekly", "label": "Weekly", "description": "On specific days of the week" },
          { "value": "monthly", "label": "Monthly", "description": "On specific days of the month" },
          { "value": "custom", "label": "Advanced", "description": "Raw cron expression" }
        ]
      },
      {
        "id": "details",
        "dependence": "frequency",
        "fields": {
          "minute": [
            {
              "key": "interval",
              "type": "number",
              "label": "Every (minutes)",
              "min": 1,
              "max": 59,
              "defaultValue": 5
            }
          ],
          "hourly": [
            {
              "key": "mode",
              "type": "radio",
              "options": [
                { "value": "every", "label": "Every X Hours" },
                { "value": "at", "label": "At Minute X past the hour" }
              ],
              "defaultValue": "every"
            },
            {
              "key": "interval",
              "type": "number",
              "label": "Hours Interval",
              "min": 1,
              "max": 23,
              "showIf": { "mode": "every" }
            },
            {
              "key": "specificMinute",
              "type": "number",
              "label": "At Minute",
              "min": 0,
              "max": 59,
              "showIf": { "mode": "at" }
            }
          ],
          "daily": [
            {
              "key": "time",
              "type": "time",
              "label": "Run at time",
              "defaultValue": "00:00"
            }
          ],
          "weekly": [
            {
              "key": "days",
              "type": "multiselect",
              "label": "On Days",
              "options": [
                { "value": "1", "label": "Mon" },
                { "value": "2", "label": "Tue" },
                { "value": "3", "label": "Wed" },
                { "value": "4", "label": "Thu" },
                { "value": "5", "label": "Fri" },
                { "value": "6", "label": "Sat" },
                { "value": "0", "label": "Sun" }
              ]
            },
            {
              "key": "time",
              "type": "time",
              "label": "At Time",
              "defaultValue": "09:00"
            }
          ],
          "monthly": [
            {
              "key": "dates",
              "type": "multiselect_grid",
              "label": "On Dates",
              "range": [1, 31]
            },
            {
              "key": "time",
              "type": "time",
              "label": "At Time",
              "defaultValue": "00:00"
            }
          ]
        }
      }
    ]
  },
  "generatorLogic": "See section 3 for the pseudo-code to parse this config"
}
```

---

## 3. Human-to-Cron Conversion Logic (Pseudo-Code)

This logic maps the JSON form values to a cron string.

```javascript
// Input: Form Values { frequency, ...details }
// Output: Cron String "* * * * *"

function generateCron(values) {
    const { frequency, details } = values;
    
    switch(frequency) {
        case 'minute':
            // "Every 5 minutes" -> "*/5 * * * *"
            return `*/${details.interval} * * * *`;
            
        case 'hourly':
            if (details.mode === 'every') {
                // "Every 2 hours" -> "0 */2 * * *"
                return `0 */${details.interval} * * *`;
            } else {
                // "At 15 mins past hour" -> "15 * * * *"
                return `${details.specificMinute} * * * *`;
            }
            
        case 'daily':
            // "At 14:30" -> "30 14 * * *"
            const [h, m] = details.time.split(':');
            return `${parseInt(m)} ${parseInt(h)} * * *`;
            
        case 'weekly':
            // "Mon,Fri at 09:00" -> "0 9 * * 1,5"
            const [wh, wm] = details.time.split(':');
            const days = details.days.join(',');
            return `${parseInt(wm)} ${parseInt(wh)} * * ${days}`;
            
        case 'monthly':
            // "1st and 15th at 00:00" -> "0 0 1,15 * *"
            const [mh, mm] = details.time.split(':');
            const dates = details.dates.join(',');
            return `${parseInt(mm)} ${parseInt(mh)} ${dates} * *`;
            
        default:
            return "* * * * *";
    }
}
```

## 4. UX Best Practices included

1.  **Progressive Disclosure**: کاربر ابتدا فقط "Frequency" را می‌بیند. فیلدهای پیچیده (مثل انتخاب روزهای هفته) فقط وقتی نمایش داده می‌شوند که کاربر "Weekly" را انتخاب کند.
2.  **Smart Defaults**: فیلدها با مقادیر منطقی (مثل 9 صبح برای کارهای روزانه) پر شده‌اند تا تصمیم‌گیری سریع‌تر شود.
3.  **Human Readable Preview**: همیشه در پایین فرم، عبارت Cron تولید شده (مثلاً `0 9 * * 1-5`) به همراه ترجمه انسانی آن (با استفاده از `cronstrue` موجود در پروژه) نمایش داده می‌شود.
    > *"At 09:00 AM, Monday through Friday"*

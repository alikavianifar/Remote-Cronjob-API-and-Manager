# Technical Analysis Report: Remote Cronjob API & Manager

## 1. Executive Summary
این گزارش به تحلیل عمیق معماری سیستم "Remote Cronjob API & Manager"، بررسی مکانیزم‌های داخلی لینوکس، و ارزیابی امنیتی پیاده‌سازی فعلی می‌پردازد. تحلیل‌ها نشان می‌دهد که اگرچه معماری کلی برای یک MVP مناسب است، اما در بخش **Security** و **Concurrency** دارای آسیب‌پذیری‌های حیاتی (Critical) است که پیش از استقرار در محیط عملیاتی (Production) باید رفع شوند.

---

## 2. Linux Crontab Internals & Architecture

### مکانیزم مدیریت فایل‌ها توسط دیمون‌های Cron
دیمون‌های استاندارد مانند `cronie` (رایج در RHEL/Fedora) یا `vixie-cron` (رایج در Debian/Ubuntu) فایل‌های crontab کاربران را معمولاً در مسیر `/var/spool/cron/crontabs/` (یا `/var/spool/cron/`) نگهداری می‌کنند.

*   **File Handling**: دیمون cron در هنگام استارت‌آپ، دایرکتوری spool را اسکن می‌کند و جدول زمان‌بندی را در حافظه بارگذاری می‌کند.
*   **Modification Detection**: برخلاف سرویس‌هایی که نیاز به `SIGHUP` دارند، cron مدرن هر دقیقه `mtime` (زمان تغییر) دایرکتوری spool را چک می‌کند. اگر تغییری در `mtime` دایرکتوری یا فایل‌های داخل آن مشاهده کند، جدول‌های تغییر یافته را مجدداً بارگذاری (Reload) می‌کند.
    *   **نتیجه**: نوشتن در `/var/spool/cron` نیاز به ریستارت دیمون *ندارد*.

### چالش همزمانی (Concurrency) و مدیریت فایل
نوشتن مستقیم در فایل‌های `/var/spool/cron` خطرناک است زیرا:
1.  **Race Conditions**: اگر دو فرآیند همزمان فایل را باز کنند، یکی تغییرات دیگری را بازنویسی می‌کند.
2.  **Atomicity**: اگر نوشتن فایل در میانه کار قطع شود (مثلاً کرش سیستم)، فایل crontab فاسد (Corrupt) شده و کل jobهای آن کاربر از کار می‌افتد.

**راهکار استاندارد (استفاده شده در لینوکس):**
دستور `crontab -e` یا `crontab -` از روش **Atomic Rename** استفاده می‌کند:
1.  یک فایل موقت (Temp file) ایجاد می‌شود.
2.  تغییرات در فایل موقت نوشته می‌شود.
3.  با استفاده از سیستمی‌کال `rename()`، فایل موقت جایگزین فایل اصلی می‌شود. این عملیات در لینوکس اتمیک است (یا فایل جدید کامل هست یا فایل قدیمی دست‌نخورده باقی می‌ماند).

---

## 3. Node.js Integration Analysis

### Vulnerability Analysis: `child_process.exec` vs `spawn`

در کد فعلی (`crontab.js`) از روش زیر برای آپدیت استفاده شده است:

```javascript
// src/backend/services/crontab.js
await execAsync(`echo "${newCrontab}" | crontab -`);
```

**⚠️ Critical Vulnerability: Shell Injection**
استفاده از `exec` یک Shell (/bin/sh) اسپان می‌کند. در اینجا محتوای `newCrontab` مستقیماً داخل یک رشته دستوری Shell قرار گرفته است.
اگر یک مهاجم (یا کاربر مخرب) در نام Job یا دستور Job کاراکتر `"` (دابل کوتیشن) وارد کند، می‌تواند از دستور `echo` خارج شده و دستورات دلخواه خود را اجرا کند.

**مثال حمله:**
اگر `command` برابر با `"; rm -rf /; echo "` باشد، دستور اجرایی نهایی چیزی شبیه این می‌شود:
```bash
echo "... "; rm -rf /; echo " ..." | crontab -
```
این منجر به اجرای دستور مخرب با سطح دسترسی پروسه Node.js می‌شود.

### Best Practice: Safe Execution implies `spawn`
برای امنیت، همیشه باید از `child_process.spawn` استفاده کرد که آرگومان‌ها را مستقیماً به کرنل می‌دهد و از Shell عبور نمی‌کند (مگر اینکه `shell: true` تنظیم شود).

**روش امن پیشنهادی (Correct Implementation):**

```javascript
const { spawn } = require('child_process');

function writeCrontab(content) {
    return new Promise((resolve, reject) => {
        const child = spawn('crontab', ['-']);
        
        // Write content to stdin safely
        child.stdin.write(content);
        child.stdin.end();

        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`crontab exited with code ${code}`));
        });
        
        // Handle errors...
    });
}
```
در این روش، محتوا (Content) به عنوان **دیتا** از طریق STDIN منتقل می‌شود، نه به عنوان **کد** در آرگومان‌های Shell. این کار Injection را غیرممکن می‌کند.

---

## 4. Security Boundaries & Privilege Management

### معضل دسترسی (The Privilege Dilemma)
برای ویرایش crontab یک کاربر خاص (مثلاً root یا کاربر سرویس)، پروسه Node.js باید دسترسی نوشتن داشته باشد.
1.  **Running as Root**: اجرای وب‌سرور (`server.js`) با کاربر Root.
    *   **ریسک**: اگر یک باگ امنیتی در Express یا کد شما کشف شود، مهاجم دسترسی Root کامل به سرور دارد. **(بسیار خطرناک و غیرتوصیه شده)**
2.  **Running as User**: اجرای با کاربر معمولی.
    *   **محدودیت**: فقط می‌تواند crontab همان کاربر را ویرایش کند. نمی‌تواند سرویس‌های سیستمی را مدیریت کند.

### راهکار پیشنهادی: جدا کردن سطوح دسترسی (Privilege Separation)

**مدل "The Curator Pattern":**
اپلیکیشن Node.js باید با یک کاربر محدود (مثلاً `cron-manager`) اجرا شود.
برای اعمال تغییرات در crontab، نباید مستقیماً دستور را اجرا کند، بلکه باید از مکانیزم **Limited Sudo** استفاده کند.

**تنظیمات `/etc/sudoers`:**
```text
cron-manager ALL=(root) NOPASSWD: /usr/bin/crontab
```
این اجازه می‌دهد که اپلیکیشن فقط دستور `crontab` را اجرا کند، نه هر دستوری را.

*نکته پیشرفته*: حتی بهتر است یک اسکریپت Wrapper کوچک (مثلاً در Bash یا Go) نوشته شود که فقط فرمت خاصی از فایل را قبول و آن را به crontab بدهد، و به Node.js فقط اجازه اجرای آن Wrapper داده شود.

## 5. Summary of Recommendations

1.  **Fix Injection**: فوراً تمام فراخوانی‌های `exec` که ورودی کاربر را در بر دارند به `spawn` تغییر دهید و ورودی‌ها را از طریق STDIN منتقل کنید.
2.  **Input Validation**: اعتبارسنجی سخت‌گیرانه روی فیلدهای `command` و `name` انجام دهید (مثلاً جلوگیری از کاراکترهای کنترلی عجیب).
3.  **Privilege Drop**: سرویس Node.js نباید به عنوان Root اجرا شود. از یک کاربر اختصاصی استفاده کنید.
4.  **Logging**: خروجی `stderr` و `stdout` دستورات اجرا شده باید در جایی امن‌تر از مموری یا فایل‌سیستم محلی (در صورت امکان) لاگ شود تا از پر شدن دیسک جلوگیری شود (Log Rotation).

---

## 6. Architecture: State Synchronization (Drift Detection)

یکی از چالش‌های اصلی سیستم‌هایی که روی ابزارهای سیستمی لایه می‌سازند (Layered Architecture)، عدم هماهنگی (Drift) بین "وضعیت واقعی سیستم" و "وضعیت دیتابیس نرم‌افزار" است.

### سناریوی Drift
کاربر از طریق پنل یک Job می‌سازد. دیتابیس و Crontab هماهنگ هستند.
سپس یک Sysadmin مستقیماً با `crontab -e` وارد سرور شده و آن Job را پاک می‌کند یا زمانش را تغییر می‌دهد.
**نتیجه**: پنل هنوز Job را فعال نشان می‌دهد، اما در واقعیت وجود ندارد.

### راهکارها (Strategies)

#### A. Single Source of Truth (Stateless)
نرم‌افزار دیتابیس جداگانه برای تعریف Jobها ندارد. هر بار لیست را می‌خواهد، `crontab -l` را پارس می‌کند.
*   **مزایا**: همگام‌سازی تضمینی. Zero Drift.
*   **معایب**: کندی (DDoS روی دیسک/پروسه)، از دست رفتن متادیتایی که در فرمت cron جا نمی‌شوند (مثل "تاریخ ایجاد"، "نام سازنده"، لاگ‌های تاریخی).

#### B. Metadata Embedding (Magic Comments) - **Recommended**
اطلاعات مهم (مثل UUID) را داخل کامنت‌های خود فایل Crontab ذخیره کنید (کاری که الان در `crontab.js` تا حدودی انجام شده).
```bash
# CRONMGR_ID: 550e8400-e29b-41d4-a716-446655440000
# CRONMGR_NAME: Backup DB
0 5 * * * /opt/scripts/backup.sh
```

#### C. Reconciliation Loop (Self-Healing)
یک پروسه background (مثلاً هر دقیقه) اجرا شود:
1.  `crontab -l` را می‌خواند.
2.  IDهای موجود در کامنت‌ها را با DB مقایسه می‌کند.
3.  اگر Jobای در فایل بود که در DB نبود -> در DB بسازد (Import).
4.  اگر Jobای در DB بود که در فایل نبود -> در DB غیرفعال/حذف کند.
5.  اگر تغییری در Schedule بود -> DB را آپدیت کند.

**Best Practice**: ترکیب روش B و C. استفاده از کامنت برای لینک کردن، و یک Watcher یا Poller برای سینک کردن وضعیت.

---

## 7. Real-time Log Streaming Strategy

برای نمایش زنده خروجی Jobها در فرانت‌اند، مقایسه روش‌ها به شرح زیر است:

### Comparison Table

| Feature | Polling | WebSockets (Socket.io) | Server-Sent Events (SSE) |
| :--- | :--- | :--- | :--- |
| **Direction** | Client Pull | Full Duplex (Bidirectional) | Server Push (Unidirectional) |
| **Latency** | High (Interval based) | Very Low | Very Low |
| **Complexity** | Low | High (Handshakes, Ping/Pong) | Medium |
| **Firewall** | Friendly (Standard HTTP) | Can be tricky | Friendly (Standard HTTP) |
| **Reconnect** | Manual | Supported by libraries | Native Browser Support |
| **Resource** | High Overhead (Many requests) | Persistent Connection | Persistent Connection |

### Recommendation: Server-Sent Events (SSE)

برای این پروژه، **SSE** بهترین انتخاب است.
**چرا؟**
1.  **ماهیت دیتا**: لاگ‌ها فقط از سرور به کلاینت می‌آیند (One-way). ما نیاز نداریم کلاینت در وسط استریم پیامی بفرستد (برخلاف ترمینال تعاملی).
2.  **سادگی پیاده‌سازی**: در Express.js پیاده‌سازی SSE بسیار ساده است (تنظیم هدر `text/event-stream`).
3.  **پایداری**: اگر کانال قطع شود، مرورگر به صورت خودکار تلاش می‌کند وصل شود و می‌توان `Last-Event-ID` فرستاد تا لاگ‌های گم شده در زمان قطعی را دوباره گرفت.

**Implementation Sketch:**

```javascript
// Express Route
app.get('/api/jobs/:id/stream-logs', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const jobProcess = spawn(job.command);

    jobProcess.stdout.on('data', (data) => {
        res.write(`data: ${JSON.stringify({ type: 'stdout', content: data.toString() })}\n\n`);
    });

    jobProcess.stderr.on('data', (data) => {
        res.write(`data: ${JSON.stringify({ type: 'stderr', content: data.toString() })}\n\n`);
    });

    req.on('close', () => jobProcess.kill()); // Cleanup
});
```
این روش بسیار سبکتر از Socket.io است و برای لاگ‌ها ایده‌آل است.

---

## 8. Market Analysis: Build vs. Buy

چرا باید این ابزار را بسازیم وقتی ابزارهای دیگری وجود دارند؟ تجزیه و تحلیل زیر نشان می‌دهد که این پروژه یک شکاف خاص (Niche) را پر می‌کند که ابزارهای موجود آن را نادیده گرفته‌اند.

### تحلیل رقبا (Existing Solutions)

#### 1. **Healthchecks.io**
*   **عملکرد**: این ابزار صرفاً یک **Passive Monitor** است. منتظر می‌ماند که Job شما پس از اجرا یک درخواست HTTP (Ping) بفرستد.
*   **محدودیت**: هیچ قابلیتی برای **اجرا**، **ویرایش زمان‌بندی** یا **مدیریت** Jobها ندارد. شما همچنان باید دستی `crontab -e` کنید و دستور curl را به انتهای اسکریپت اضافه کنید.
*   **نتیجه**: این ابزار مکمل پروژه ماست، نه رقیب.

#### 2. **Ofelia**
*   **عملکرد**: جایگزین مدرن cron برای محیط‌های Docker.
*   **محدودیت**: جایگزین (Replacer) دیمون cron می‌شود، نه مدیر آن. اگر شما اسکریپت‌های Legacy روی هاست دارید که داخل کانتینر نیستند، Ofelia کمک زیادی نمی‌کند. فایل‌های سیستمی Crontab را مدیریت نمی‌کند.
*   **نتیجه**: مناسب محیط‌های Pure Cloud-Native، نامناسب برای سرورهای هیبریدی یا سنتی لینوکس.

#### 3. **Rundeck**
*   **عملکرد**: پلتفرم Enterprise برای Job Scheduling و Runbook Automation.
*   **محدودیت**: بسیار سنگین (Java-based)، پیچیده (Steep Learning Curve) و "Overkill" برای مدیریت ساده Jobهای یک سرور. نیاز به تعریف Jobها در فرمت XML/YAML خاص خود دارد و مستقیماً با Crontab لینوکس کار نمی‌کند.
*   **نتیجه**: هزینه نگهداری بالا برای یک نیاز ساده.

### ارزش پیشنهادی منحصر به فرد (Unique Value Proposition)

پروژه "Remote Cronjob API" به دلایل زیر توجیه فنی و تجاری دارد:

1.  **Native Crontab Integration**: برخلاف Rundeck یا Ofelia، این سیستم روی **استاندارد لینوکس** (Native Crontab) سوار می‌شود. این یعنی اگر سرویس Node.js از کار بیفتد، **Jobهای مهم سیستم همچنان توسط کرنل و دیمون cron اجرا می‌شوند.** این پایداری حیاتی است.
2.  **Modern DX for Legacy Tools**: هیچ ابزار سبک دیگری وجود ندارد که به سادگی یک REST API روی crontab موجود بکشد. این قابلیت اجازه می‌دهد Cronjobها را وارد پایپ‌لاین‌های مدرن CI/CD کنید.
3.  **Lightweight & Drop-in**: نیاز به مایگریشن اسکریپت‌ها یا تغییر زیرساخت نیست. فقط نصب کنید و Jobهای فعلی را مدیریت کنید.

---

## 9. Recommended Project Structure & Stack

برای تبدیل این MVP به یک محصول Production-Grade، ساختار و ابزارهای زیر پیشنهاد می‌شود.

### A. Recommended Directory Structure (Bulletproof Node.js)

ساختار فعلی ساده است، اما برای مقیاس‌پذیری و تمیزی کد (Separation of Concerns) ساختار زیر پیشنهاد می‌شود:

```text
src/
├── api/                    # لایه اینترفیس (Routes & Controllers)
│   ├── middlewares/        # اعتبارسنجی، لاگینگ، Auth
│   ├── routes/             # تعریف مسیرها
│   └── controllers/        # مدیریت درخواست و پاسخ (بدون Logic سنگین)
├── config/                 # تنظیمات محیطی (Environment Variables)
├── loaders/                # اسکریپت‌های استارتاپ (DB connection, Logger init)
├── services/               # بیزنس لاجیک اصلی (CrontabService, AuthService)
├── models/                 # مدل‌های دیتابیس (SQLite Schema)
├── utils/                  # توابع کمکی (Helpers)
├── types/                  # تعاریف تایپ‌ها (JSDoc یا TypeScript types)
└── app.js                  # نقطه ورودی اصلی (Entry Point)
```

**نکته کلیدی**: جداسازی `Controller` از `Service`. کنترلر فقط باید ورودی را بگیرد، به سرویس بدهد و پاسخ را برگرداند. منطق "چگونه Crontab ویرایش شود" فقط باید در Service باشد.

### B. Essential NPM Packages

لیست پکیج‌های ضروری برای افزایش امنیت، پایداری و کیفیت کد:

#### Security & Stability
| Package | Purpose | Why? |
| :--- | :--- | :--- |
| **helmet** | Security Headers | محافظت در برابر حملات XSS و تنظیم هدرهای امنیتی HTTP به صورت خودکار. |
| **zod** | Validation | اعتبارسنجی دقیق ورودی‌ها (Schema Validation). جایگزین قدرتمند برای Joi. |
| **cors** | CORS Handling | مدیریت دقیق دامنه‌های مجاز برای درخواست به API. |
| **express-rate-limit** | DDoS Protection | جلوگیری از حملات Brute-force روی لاگین و اسپم کردن API. |

#### Core Logic
| Package | Purpose | Why? |
| :--- | :--- | :--- |
| **cron-parser** | Parsing | ابزار استاندارد برای تحلیل، اعتبارسنجی و محاسبه زمان بعدی اجرای Cron Expression. |
| **uuid** | Identity | تولید IDهای یکتا برای Jobها (جلوگیری از تداخل نام). |
| **execa** | Process Execution | جایگزین مدرن و امن‌تر برای `child_process`. مدیریت بهتر سیگنال‌ها و پروسه‌ها. |

#### Observability
| Package | Purpose | Why? |
| :--- | :--- | :--- |
| **winston** / **pino** | Logging | سیستم لاگ‌بندی ساختاریافته (JSON Logs) به جای `console.log` ساده. |
| **better-sqlite3** | Storage | سریع‌ترین درایور SQLite برای Node.js (برای ذخیره لاگ‌های اجرا و متادیتا). |

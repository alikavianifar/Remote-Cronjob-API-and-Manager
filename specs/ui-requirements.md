# UI/UX Requirements Specification

## 1. Design Philosophy

### 1.1 Core Principles
- **Modern & Premium**: State-of-the-art design that impresses at first glance
- **Intuitive**: Easy to use without documentation
- **Responsive**: Works seamlessly on desktop, tablet, and mobile
- **Accessible**: Keyboard navigation and screen reader support

### 1.2 Visual Style
- **Theme**: Dark mode primary with light mode option
- **Colors**: Vibrant gradient accents on dark background
- **Typography**: Inter font family for clean readability
- **Animations**: Subtle micro-animations for enhanced UX

---

## 2. Color Palette

### 2.1 Dark Theme (Primary)
```css
--bg-primary: #0a0a0f;      /* Main background */
--bg-secondary: #12121a;    /* Cards, panels */
--bg-tertiary: #1a1a24;     /* Hover states */
--border: #2a2a3a;          /* Borders */

--text-primary: #ffffff;     /* Main text */
--text-secondary: #a0a0b0;   /* Secondary text */
--text-muted: #606070;       /* Muted text */

--accent-primary: #6366f1;   /* Indigo - primary actions */
--accent-secondary: #8b5cf6; /* Purple - secondary */
--accent-gradient: linear-gradient(135deg, #6366f1, #8b5cf6);

--success: #10b981;          /* Green - active/success */
--warning: #f59e0b;          /* Orange - paused/warning */
--error: #ef4444;            /* Red - error */
--info: #3b82f6;             /* Blue - info */
```

### 2.2 Light Theme (Optional)
```css
--bg-primary: #f8fafc;
--bg-secondary: #ffffff;
--bg-tertiary: #f1f5f9;
--border: #e2e8f0;

--text-primary: #0f172a;
--text-secondary: #475569;
--text-muted: #94a3b8;
```

---

## 3. Typography

### 3.1 Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### 3.2 Font Sizes
| Name | Size | Usage |
|------|------|-------|
| xs | 12px | Labels, captions |
| sm | 14px | Secondary text |
| base | 16px | Body text |
| lg | 18px | Subheadings |
| xl | 20px | Card titles |
| 2xl | 24px | Section headers |
| 3xl | 30px | Page titles |
| 4xl | 36px | Hero text |

---

## 4. Component Specifications

### 4.1 Header/Navigation
```
┌─────────────────────────────────────────────────────────────────┐
│  🕐 CronManager              [Search...]     [🔔] [👤 Admin ▼] │
└─────────────────────────────────────────────────────────────────┘
```
- Logo with gradient icon
- Global search bar
- Notification bell
- User dropdown menu

### 4.2 Sidebar (Optional - for future expansion)
```
┌──────────────┐
│  📊 Dashboard │
│  📋 Jobs      │
│  📝 Logs      │
│  ⚙️ Settings  │
│  ❓ Help      │
└──────────────┘
```

### 4.3 Jobs List View
```
┌─────────────────────────────────────────────────────────────────┐
│  Jobs                                          [+ New Job]      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ● Backup Database           Every day at 2:00 AM       │    │
│  │   /opt/scripts/backup.sh    Last: 2h ago ✓  Next: 22h  │    │
│  │                              [▶ Run] [✏️ Edit] [🗑️]     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ○ Cleanup Logs              Every Sunday at 12:00 AM   │    │
│  │   find /var/log...          Paused                     │    │
│  │                              [▶ Run] [✏️ Edit] [🗑️]     │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

**Status Indicators:**
- 🟢 Active (green dot)
- 🟡 Paused (yellow dot)
- 🔴 Error (red dot)

### 4.4 Job Form Modal
```
┌─────────────────────────────────────────────────────────────────┐
│  Create New Job                                          [×]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Job Name                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Backup Database                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Command                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ /opt/scripts/backup.sh                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Schedule                    [Use Wizard ✨]                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 0 2 * * *                                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│  📅 Runs: Every day at 2:00 AM                                 │
│                                                                 │
│  Description (optional)                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Daily backup of the main database                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                          [Cancel]  [Save Job]                   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Period Wizard
```
┌─────────────────────────────────────────────────────────────────┐
│  Schedule Builder                                        [×]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Quick Presets:                                                 │
│  [Every Minute] [Hourly] [Daily] [Weekly] [Monthly]            │
│                                                                 │
│  ─────────────────── OR Custom ───────────────────              │
│                                                                 │
│  Minute          Hour            Day of Month                   │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐                   │
│  │ Every ▼ │     │ At 2  ▼ │     │ Every ▼ │                   │
│  └─────────┘     └─────────┘     └─────────┘                   │
│                                                                 │
│  Month            Day of Week                                   │
│  ┌─────────┐     ┌─────────┐                                   │
│  │ Every ▼ │     │ Every ▼ │                                   │
│  └─────────┘     └─────────┘                                   │
│                                                                 │
│  Preview: 0 2 * * *                                            │
│  📅 "Every day at 2:00 AM"                                     │
│                                                                 │
│  Next 5 runs:                                                   │
│  • Tomorrow at 2:00 AM                                          │
│  • Jan 17 at 2:00 AM                                           │
│  • Jan 18 at 2:00 AM                                           │
│                                                                 │
│                          [Cancel]  [Apply]                      │
└─────────────────────────────────────────────────────────────────┘
```

### 4.6 Log Viewer
```
┌─────────────────────────────────────────────────────────────────┐
│  Logs: Backup Database                                   [×]    │
├─────────────────────────────────────────────────────────────────┤
│  [Schedule ▼] [All Status ▼] [Last 7 days ▼]                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ✓ Jan 15, 2024 02:00:00  Duration: 1.5s  Exit: 0          │ │
│  │ ▼ stdout:                                                  │ │
│  │   Starting backup...                                       │ │
│  │   Backup completed: 3 files (15MB)                         │ │
│  │                                                            │ │
│  │   stderr: (empty)                                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ✓ Jan 14, 2024 02:00:00  Duration: 1.8s  Exit: 0          │ │
│  │ ▶ Click to expand...                                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Interaction Patterns

### 5.1 Animations
- **Page transitions**: Fade in (200ms)
- **Modal open**: Scale + fade (300ms)
- **Button hover**: Scale 1.02 + shadow (150ms)
- **Card hover**: Subtle elevation change (200ms)
- **Status change**: Color pulse animation
- **Loading**: Skeleton screens, not spinners

### 5.2 Feedback
- **Success**: Green toast notification (3s)
- **Error**: Red toast with action button
- **Loading**: Button shows spinner
- **Confirmation**: Modal for destructive actions

### 5.3 Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `N` | New job |
| `S` | Save |
| `Esc` | Close modal |
| `/` | Focus search |
| `?` | Show help |

---

## 6. Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, bottom nav |
| Tablet | 640-1024px | Two columns |
| Desktop | > 1024px | Full layout with sidebar |

---

## 7. Accessibility Requirements

- WCAG 2.1 AA compliance
- Color contrast ratio ≥ 4.5:1
- Focus indicators on all interactive elements
- Alt text for all images
- ARIA labels for icons
- Skip navigation link

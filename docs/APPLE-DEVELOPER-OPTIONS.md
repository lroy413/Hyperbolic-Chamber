# What an Apple Developer account would actually unlock for Oboros

You asked what becomes possible if you enrol — notifications, scheduling, accountability partners. The honest headline is that **the first one on your list does not need the account at all**, and knowing that changes what the $99 is really for.

---

## The thing worth knowing first

Web push works on iOS today, for free, with no Apple Developer Program membership. Apple states this explicitly: *"You do not need to be a member of the Apple Developer Program to use it."* It has worked since iOS 16.4, and iOS 18.4 added Declarative Web Push, which shows a notification straight from a JSON payload without a service worker even having to wake up.

There are two conditions. The user must add Oboros to their Home Screen — a tab in Safari cannot receive push. And the permission prompt must be triggered by a real tap, not on page load.

The second thing worth knowing is that installing to the Home Screen fixes a storage problem you currently have and may not know about. Safari deletes script-created storage for any origin the user has not interacted with in seven days. An installed web app is exempt and gets the same quota as Safari itself — around 60% of free disk. For an app whose whole premise is that a 40-hour course sits in IndexedDB and works on a plane, that is not a nice-to-have. Every course body Oboros stores is currently one quiet week away from being evicted.

So there is a piece of work here worth doing regardless of what you decide about Apple: make Oboros installable properly, prompt for it, and call `navigator.storage.persist()`.

---

## What the $99 actually buys

| | Without enrolling | With the account |
|---|---|---|
| Push notifications | Yes, iOS 16.4+, Home Screen only | Yes, plus richer native ones |
| **Scheduled reminders offline** | **No** | **Yes** |
| Home Screen icon and badge | Yes | Yes |
| Storage that survives | Yes, once installed | Yes |
| Widgets / Lock Screen | No | Yes |
| Live Activities | No | Yes |
| Shortcuts and Siri | No | Yes |
| Focus filters | No | Yes |
| Sync between your devices | Needs a server | CloudKit, free |
| App Store listing | No | Yes |
| Screen Time enforcement | No | Only with a further approval |

The row in bold is the real one, and it is the reason to enrol if you enrol.

### Scheduling is the genuine gap

A web app cannot schedule a notification. The API that would have allowed it never shipped. So "remind me at 7am on weekdays" on the web means a server has to be awake at 7am in your timezone to push it to you. That is a backend, a cron, a subscription database, and a thing that breaks silently when a token expires.

A native app schedules up to 64 pending local notifications entirely on the device. No server, no network, no account. It fires on a plane. For an app that is otherwise fully offline, having its reminder system be the one part that requires a server is an ugly seam — and the only way to remove that seam is a native wrapper.

This is worth being clear-eyed about: it is a *large* difference in architecture for a feature that, from the user's side, looks like one toggle.

### CloudKit replaces the backend you were going to build

Sync between your own iPhone, iPad and Mac via CloudKit costs nothing, needs no server, and the data sits in the user's own iCloud rather than a database you are responsible for. That is strictly better than the optional Supabase adapter for the single-user case, and it removes you as a custodian of anyone's learning history.

CloudKit also has record sharing, which is the mechanism I would build accountability partners on. More on that below.

### Live Activities and widgets

A Lock Screen widget showing your streak and what is next up, or a Live Activity that runs during a study session showing elapsed time and the module you are in, are both native-only. I would rate the widget as genuinely useful and the Live Activity as a nice demo that most people turn off — a study session is not a pizza delivery; there is no state changing while you look away.

---

## Accountability partners: what is actually buildable

You said you have an idea for this, so treat the following as the menu of mechanisms rather than a design.

**CloudKit sharing** is the one I would reach for. You share a small record — streak, current path, last active date, weekly hours — with one named person via their iCloud account. They see it in their copy of the app. No server, no accounts to manage, no privacy liability for you, and it works between any two people who have the app. The limitation is that it is Apple-only, so an Android partner is out.

**Push between partners** follows from that: when your partner's record changes, or fails to change, their device or yours can raise a notification. "Sam has studied four days this week. You have studied one." The interesting version is the *negative* signal, because that is what accountability actually is, and it is also the version most likely to feel like nagging. Worth prototyping the tone before the plumbing.

**A shared commitment** is the strongest evidence-backed mechanism and needs almost none of this. Two people pick a path and an end date, the app computes a schedule for each, and each can see whether the other is ahead or behind. The completion literature is unambiguous that a deadline plus another person is worth more than any feature on this page — cohort courses finish at around 72% against 5–15% for solo free ones. You could build a weak version of this with no Apple account and no server at all, by having both people export and exchange a small progress file.

**Screen Time enforcement** — the version where the app actually blocks Instagram until you have done your module — is possible via `FamilyControls`, `ManagedSettings` and `DeviceActivity`, but requires a separate entitlement request to Apple on top of the $99. Developers report it taking weeks and sometimes going unanswered. It also changes the character of the app substantially. Oboros currently has no dark patterns and that is one of its few real differentiators; a feature that seizes control of the user's phone is a strange thing to bolt onto it. I would leave this one alone unless the blocking *is* the product.

---

## What I would actually do

Enrol, because the scheduling gap is real and CloudKit is a better answer to sync than anything you would otherwise build. But do not wait on it, because three things are worth doing this week regardless.

Make Oboros properly installable and prompt for it — that alone gets you push, the badge, and storage that does not evaporate after a quiet week. Ship the shared-commitment version of accountability, which needs no Apple involvement and carries most of the measured benefit. And keep every notification path optional and degradable, so that whichever way the native question lands, the web version never becomes the crippled one.

The native wrapper, when it comes, should be exactly that: a wrapper around the same single HTML file, adding local notification scheduling, CloudKit, and a widget. Not a rewrite. The whole value of what you have built is that it is one file that works everywhere, and that property is worth protecting.

---

## Sources

- [Meet Declarative Web Push](https://webkit.org/blog/16535/meet-declarative-web-push/) — WebKit, confirming no Developer Program membership is required
- [Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — MDN, on the seven-day rule and the Home Screen exemption
- [PWA iOS Limitations and Safari Support](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — on Background Sync, Background Fetch and the Home Screen requirement
- [Requesting the Family Controls entitlement](https://developer.apple.com/documentation/familycontrols/requesting-the-family-controls-entitlement) — Apple, on the separate approval
- [Family Controls entitlement delays](https://developer.apple.com/forums/thread/821964) — developer reports of multi-week waits
- [Online Course Completion Statistics](https://www.skillademia.com/statistics/online-course-completion-statistics/) — cohort versus solo completion rates

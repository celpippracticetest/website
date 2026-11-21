# Manual (human) test cases: celpippracticetest.com

End-to-end checks a person runs in a real browser, the way a student would use
the site. Not unit or integration tests.

- **Run before every release** at least the cases marked **P1**, plus the
  regression cases (section 0) for anything touched in that release.
- **Test as each user type.** Many cases differ by who is signed in:
  - **G** = guest (not signed in, private/incognito window)
  - **F** = signed in, free plan
  - **P** = signed in, paid plan (weekly / monthly / quarterly)
  - **A** = admin (CMS access)
  - **App** = inside the Android/iOS app WebView
- **Devices.** Desktop Chrome at 1366×768 and 1920×1080; phone at 375×812
  (iPhone) and 412×915 (Android); tablet 768×1024. Spot-check Safari and
  Firefox for P1 cases.
- **Production safety.** The live site has many real users. On production,
  only run cases marked **Safe-prod**. Everything that creates accounts,
  sends email, takes payment, writes answers or changes CMS data must be run
  on a Vercel preview / staging deployment with test accounts and Stripe
  test mode.
- **Recording results.** Copy the run template at the end into
  `docs/qa/runs/YYYY-MM-DD.md` and mark each case Pass / Fail / Blocked /
  Not run, with a note and screenshot for every Fail.

Priority: **P1** = blocks learning or payment, or crashes a page. **P2** = wrong
behaviour with a workaround. **P3** = cosmetic / copy.

---

## 0. Regression cases (bugs fixed, must stay fixed)

| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| REG-01 | G | Open Reading Task 1 → free prompt. Scroll the questions panel so Q3+ is visible. Click an option of Q3, Q4, Q5, Q6 one by one. | The page never jumps/scrolls; the header stays where it was; each option is selected. | P1 | Safe-prod |
| REG-02 | G | Same as REG-01 in Mock Test 1 → Reading. | No page jump. | P1 | Safe-prod |
| REG-03 | G | Reading free prompt: answer 1+ questions. | "Submit and Next" and "Submit and See result" become enabled. | P1 | Safe-prod |
| REG-04 | G | Reading free prompt: answer some questions → "Submit and See result". | Result screen shows score, correct / wrong / not answered and the correct answer for each question. No network call to `POST /api/answers`. | P1 | Safe-prod |
| REG-05 | G | Listening free prompt: answer → reach the last question. | Submit buttons enabled once at least one answer is chosen; "See result" works. | P1 | Safe-prod |
| REG-06 | F/P | Reading and Listening: answer → "Submit and See result". | Result shows, and the attempt is saved (reopen the prompt: it shows as completed / answers restored). | P1 | Staging |
| REG-07 | G | Writing free prompt: type a full paragraph. | No popup while typing. Word counter updates. | P1 | Safe-prod |
| REG-08 | G | Writing free prompt: type → Submit. | "Login to your account" popup with "Create a free account to submit your answer…". Its links contain `redirect_url` back to the prompt. ✕ closes it. | P1 | Safe-prod |
| REG-09 | G | Writing free prompt: type, reload the page. | The draft is still there and the word count matches. | P2 | Safe-prod |
| REG-10 | G→F | Writing: type → Submit → Create a free account → finish sign-up. | Lands back on the same prompt with the draft restored; Submit now scores it; draft is cleared after scoring. | P1 | Staging |
| REG-11 | G | Speaking free prompt (Task 1 "Adopting a Pet"): let the 30 s preparation run out. | Sign-up popup ("Create a free account to record your answer…"), not the pricing popup. | P1 | Safe-prod |
| REG-12 | F | Speaking locked prompt (direct URL) or recording without access. | Pricing popup opens once (not repeatedly). | P2 | Staging |
| REG-13 | F | Mock exam (paid) Writing part via direct URL, type in the box. | No popup while typing; pricing appears only on Submit. | P2 | Staging |
| REG-14 | G | Old wiki URLs from the SEO sheet, e.g. `/wiki/celpip-exam-overview`. | Single permanent redirect to the matching `/blog/...` article (200). | P2 | Safe-prod |
| REG-15 | G | `https://celpippracticetest.com/.well-known/assetlinks.json` | 200, JSON, package `com.celpippt.app`. | P1 (app links) | Safe-prod |
| REG-16 | G | In DevTools console on the site, run `fetch('/api/practices/000000000000000000000000',{method:'PUT',headers:{'Content-Type':'application/json'},body:'{}',credentials:'omit'}).then(r=>r.status)`. Repeat with `DELETE` on a **non-existent** id, `/api/exams` (PUT), `/api/examParts?examId=<paid mock id>` (GET). | 401 (or 403 when signed in as a non-admin). Never 200/400. Use only fake ids and empty bodies so nothing can change. | P1 (security) | Safe-prod |
| REG-17 | G | Open a Reading prompt page, view page source / DevTools → search the HTML for `"answer":"`. | Only the free prompt on screen contains answers (≤ its question count); other prompts in the task have no passages/answers. | P1 (paid content) | Safe-prod |
| REG-18 | G | `fetch('/api/practices?type=reading&page=0&limit=3&taskId=<task id>').then(r=>r.text())` and `fetch('/api/practices/<locked prompt id>')`. | List items have `passages: []`; the locked prompt has no passages/answers. | P1 (paid content) | Safe-prod |
| REG-19 | A | CMS: edit and save a practice, an exam part, a task and a blog post; delete a test item. | Works for admins (the new admin check accepts the CMS session). | P1 | Staging |

---

## 1. Global: header, footer, navigation

| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| NAV-01 | G | Desktop: click each header item: logo, Practice, Mock Exams, Learning, Words, Pricing, Sign In / Sign Up. | Each opens the right page; active item is highlighted; no full-page error. | P1 | Safe-prod |
| NAV-02 | F/P | Same header as signed in. | Shows avatar / profile menu instead of Sign In; "Upgrade" for free users, no "Upgrade" for paid users. | P1 | Staging |
| NAV-03 | G | Homepage: scroll past the hero. | "Start Free Practice" appears in the header with its animation; hides again while the "Ready to reach your target CLB?" banner is visible. | P3 | Safe-prod |
| NAV-04 | G | Phone: open the burger menu, tap every item, close it with the button and with a tap outside. | Smooth open/close; Pricing is inside the menu; focus doesn't escape the open menu; page doesn't scroll behind it. | P2 | Safe-prod |
| NAV-05 | G/F | Phone (dashboard pages): bottom navigation Practice / Mock Exams / Learning / Words. | Correct page, correct active icon; bar never covers buttons at the bottom of the page. | P1 | Safe-prod |
| NAV-06 | G | Footer: click every link (including social links). | No 404s; external links open in a new tab. | P2 | Safe-prod |
| NAV-07 | G | Browser Back / Forward across 5+ pages. | Each page restores correctly, no blank page, no stuck loader. | P2 | Safe-prod |
| NAV-08 | G | Open `/this-page-does-not-exist`. | Branded 404 page with a way back home; HTTP status 404. | P2 | Safe-prod |
| NAV-09 | G | Keyboard only: Tab through header and homepage. | Visible focus ring on every interactive element; Enter/Space activate them. | P2 | Safe-prod |

## 2. Homepage `/`

| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| HOME-01 | G | Load `/` on desktop and phone. | Hero fills the first screen; no layout shift after load; no console errors. | P1 | Safe-prod |
| HOME-02 | G | Click every "Start Free Practice" / CTA button (hero, skills, banner). | Each goes to a working practice start; hover animation on desktop, plays once on scroll on touch. | P1 | Safe-prod |
| HOME-03 | G | Skills section: open each skill tab/card. | Correct content per skill; links work. | P2 | Safe-prod |
| HOME-04 | G | Testimonials / user reviews: use arrows, swipe on phone. | Moves one item at a time, no blank slides. | P3 | Safe-prod |
| HOME-05 | G | Blog section: click each of the 4 featured cards. | Covers all load; each opens its article. | P2 | Safe-prod |
| HOME-06 | G | FAQ: open/close every question. | Smooth accordion; only intended items open; text readable. | P3 | Safe-prod |
| HOME-07 | G | Check share preview: paste `/` into a chat app or use a meta-tag checker. | Title, description and `/og-home.png` image show. | P3 | Safe-prod |

## 3. Skill guide pages `/reading`, `/writing`, `/listening`, `/speaking`

| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| GUIDE-01 | G | Open each page. | Guide page (hero, practice cards, format table, task cards, tips, samples, scoring, list, checklist if any, FAQ, other skills). Sections in the content doc's order. | P1 | Safe-prod |
| GUIDE-02 | G | Click "Start Free Practice" and every task/part card. | Opens that task's prompt list (`?taskId=`) or prompt. | P1 | Safe-prod |
| GUIDE-03 | G | Click "See all tasks/parts". | Scrolls to the practice section. | P3 | Safe-prod |
| GUIDE-04 | G | Sample section links (blog templates / part practice). | Each opens (200). | P2 | Safe-prod |
| GUIDE-05 | G | FAQ: open/close each item. | Works without JavaScript errors. | P3 | Safe-prod |
| GUIDE-06 | G | Phone: format table. | Shown as stacked cards (no horizontal scroll). Task 5 timing shows on two lines. | P2 | Safe-prod |
| GUIDE-07 | F/P | Open `/speaking` (no params). | Signed-in task list (not the guide). `/speaking?view=guide` shows the guide. Same for the other three. | P1 | Staging |
| GUIDE-08 | F/P | Practice overview → "Speaking guide" (desktop) / "Guide" (phone) for each skill. | Opens the guide; on phone, tapping "Guide" doesn't toggle the accordion. | P2 | Staging |

## 4. Practice overview `/practice-overview`

| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| PO-01 | G/F/P | Desktop: 4 columns load with every task card. | All four skills with correct task counts; cards aligned. | P1 | Safe-prod |
| PO-02 | G/F/P | Click each task card. | Desktop: opens first prompt of that task. Phone: opens task list. Loader shows on the clicked card only. | P1 | Safe-prod |
| PO-03 | G | Phone: open/close each skill accordion. | Smooth; all tasks listed. | P2 | Safe-prod |
| PO-04 | G | Slow network (DevTools "Slow 4G"). | Skeleton shows, then content; no blank screen. | P2 | Safe-prod |

## 5. Practice: task list and prompt views (all skills)

Run for each skill with **G**, **F** and **P**.

| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| PR-01 | G/F/P | `/reading?taskId=<id>` (and the other skills). | Prompt list for that task; the free prompt shows "Free", others show a lock for G/F; no locks for P. Task card opens by default (signed-in view). | P1 | Safe-prod |
| PR-02 | G | Click a locked prompt. | Login / sign-up popup (G) or upgrade popup (F). Popup closes with ✕ and click outside. | P1 | Safe-prod |
| PR-03 | G/F/P | Open a prompt; check timer counts down. | Timer starts at the official time for the task; shows "Time's Up!" at 0 without crashing. | P1 | Safe-prod |
| PR-04 | G/F/P | Use the side menu to switch prompts. | Loads the chosen prompt; previous answers don't leak into the new one. | P1 | Safe-prod |
| PR-05 | G/F/P | Back arrow in the prompt header on the first prompt. | Returns to the task list (URL and screen both change). | P2 | Safe-prod |
| PR-06 | G/F/P | Answer, then press F5. | (Expected product behaviour to confirm) In-progress answers and timer are restored for signed-in users. | P2 | Staging |
| PR-07 | G/F/P | Answer, then browser Back. | "Leave page? Unsaved work" warning appears. | P2 | Safe-prod |
| PR-08 | P | Submit and Next on the last prompt of a task. | "Submit and Next" hidden; "Submit and See result" works; retake banner offers a restart. | P2 | Staging |
| PR-09 | F | Use all free attempts on writing/speaking. | Clear "credits are over" message and Subscribe button; no crash. | P2 | Staging |
| PR-10 | P | Mobile app: open a prompt inside the app. | Layout fits; recording permission prompt (speaking) works. | P1 | Staging |

### 5a. Reading practice
| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| RD-01 | G/F/P | Task 1–4: answer all questions with mouse; then with keyboard (Tab + arrows/Space). | Every option selectable both ways; selected state visible. | P1 | Safe-prod |
| RD-02 | G/F/P | Task 2 (diagram): open the diagram image; zoom on phone. | Diagram readable; questions align with it. | P2 | Safe-prod |
| RD-03 | G/F/P | Task 3 (fill-the-blank style): open each blank's popover, choose an answer, change it. | Popover doesn't cover the text being answered; choice shows in the blank. | P2 | Safe-prod |
| RD-04 | G/F/P | Result screen. | Correct / wrong / not answered counts add up to total; each question shows the correct answer. | P1 | Safe-prod |

### 5b. Listening practice
| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| LS-01 | G/F/P | Play audio, pause, resume; let it finish. | Plays once; controls work; questions appear when expected. | P1 | Safe-prod |
| LS-02 | G/F/P | Answer each question (single and dropdown types). | Selection saved when moving between questions. | P1 | Safe-prod |
| LS-03 | G/F/P | Mute device / no audio output. | No crash; clear message or silent playback. | P3 | Safe-prod |
| LS-04 | G/F/P | Result screen and answer key. | Correct counts; per-question correct answer. | P1 | Safe-prod |

### 5c. Writing practice
| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| WR-01 | G/F/P | Type, paste a long text (1,000+ words), delete everything. | Counter accurate; no lag or crash. | P1 | Safe-prod |
| WR-02 | F/P | Submit with fewer than 20 words. | "Your response must be at least 20 words long." | P2 | Staging |
| WR-03 | F/P | Submit a real answer. | Progress messages, then AI score with criteria; free attempts counter decreases for F. | P1 | Staging |
| WR-04 | F/P | Open the sample responses (Basic / Good / Excellent). | Each expands and is readable. | P3 | Safe-prod |
| WR-05 | G/F/P | Emoji / non-Latin text / HTML like `<b>x</b>` in the box. | Shown as plain text; no layout break; counter sensible. | P3 | Safe-prod |

### 5d. Speaking practice
| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| SP-01 | F/P | Let preparation finish → allow microphone → speak → recording ends at the time limit. | Recording UI with countdown; upload; AI feedback appears. | P1 | Staging |
| SP-02 | F/P | Deny the microphone permission. | Clear message on how to enable the mic; no crash; can retry. | P1 | Staging |
| SP-03 | F/P | No microphone connected. | Clear error message. | P2 | Staging |
| SP-04 | F/P | Task 5: choose an option during the selection phase, then prepare and record. | Both phases timed correctly (60 s + 60 s, 60 s speaking). | P2 | Staging |
| SP-05 | G/F/P | Open sample responses. | Expand/collapse works. | P3 | Safe-prod |

## 6. Mock exams `/exam-overview`, `/exams/...`

| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| MX-01 | G/F/P | `/exam-overview`: all mock cards load. | Mock Test 1 shows "Free". (Known gap: paid mocks show no lock for G/F until clicked.) | P1 | Safe-prod |
| MX-02 | G | Mock Test 1 → Start → each of Complete Test / Listening / Reading / Writing / Speaking. | Opens the right part with its "What is this part?" screen. | P1 | Safe-prod |
| MX-03 | G | Any paid mock → Start → any item. | Login popup; nothing loads behind it. | P1 | Safe-prod |
| MX-04 | F | Paid mock → Start. | Upgrade popup with the same prices as `/pricing`. | P1 | Staging |
| MX-05 | P | Complete Test from start to finish (Listening → Reading → Writing → Speaking). | Parts advance in order; timers correct; "View Answers & Score" shows results with an overall score. | P1 | Staging |
| MX-06 | G/F/P | Part selector dropdown (top right) switches parts. | Correct part; answers from other parts kept. | P2 | Safe-prod |
| MX-07 | G/F/P | Reload in the middle of a part. | (Product decision) Answers/timer restored or a clear warning; never a crash. | P2 | Safe-prod |
| MX-08 | G | Open a runner URL with a fake `attemptId`. | No crash; starts a new attempt or explains. | P3 | Safe-prod |
| MX-09 | P | "Ask Beavo" button inside an exam. | Opens the assistant; doesn't cover answer controls on phone. | P3 | Staging |

## 7. Learning (AI chat) `/learning`

| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| LRN-01 | G | Press Enter in an empty box. | Nothing is sent; guest limit unchanged. | P2 | Safe-prod |
| LRN-02 | G | Click each topic chip. | Suggested questions for that topic appear. | P3 | Safe-prod |
| LRN-03 | G | Send one message; then try a second. | First gets an answer; second shows the guest-limit message with sign-up. | P1 | Staging |
| LRN-04 | F/P | Send messages, use the microphone button, scroll a long conversation. | Answers stream; mic transcribes; scroll works; limits per plan respected. | P1 | Staging |

## 8. Words `/words`

| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| WD-01 | G | Open `/words`. | Loader, then the guest intro with a sign-up path; no errors. | P2 | Safe-prod |
| WD-02 | F/P | Add a word from a practice passage (word menu), then open `/words`. | Word appears with definition, pronunciation, example. | P1 | Staging |
| WD-03 | F/P | Flashcards: flip, mark known/unknown, delete a word. | State saved after reload. | P2 | Staging |
| WD-04 | G | Use the word menu inside a passage. | "Please log in to add the word" popup. | P2 | Safe-prod |

## 9. Blog `/blog`, `/blog/<slug>`

| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| BL-01 | G | `/blog`: filters/categories, pagination, every card. | Cards open; covers load; no empty pages. | P2 | Safe-prod |
| BL-02 | G | Article: table of contents (desktop sidebar, phone "On this page"). | Clicking an item scrolls to the heading; the current section is highlighted. | P2 | Safe-prod |
| BL-03 | G | Share card: X, Facebook, LinkedIn, Telegram, Instagram, Copy link. | Each opens the right share page in a new tab; Instagram uses the share sheet (phone) or copies; "Link copied" shows. | P3 | Safe-prod |
| BL-04 | G | Copy box "Copy" button inside an article. | Text copied; button shows "Copied". | P3 | Safe-prod |
| BL-05 | G | Newsletter: submit empty, invalid email (`abc`). | Browser/inline validation; nothing saved. | P2 | Safe-prod |
| BL-06 | G | Newsletter: valid email. | "You're subscribed" message; second time "already on the list". | P2 | Staging |
| BL-07 | G | Author card email icon; related articles. | `mailto:` opens; related links work. | P3 | Safe-prod |
| BL-08 | G | All `/sitemap.xml`, `/pages-sitemap.xml`, `/blog-sitemap.xml` URLs. | Every URL returns 200. | P2 | Safe-prod |

## 10. Pricing and checkout

| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| PAY-01 | G | `/pricing` from Canada, India, Nigeria, Pakistan (VPN). | C$ prices for Canada/others; ₹ / ₦ / Rs local prices for IN / NG / PK; sale badges consistent. | P1 | Safe-prod |
| PAY-02 | G | Click "Get Premium" on each plan. | Asked to sign in / sign up first, then returns to checkout. | P1 | Safe-prod (stop before paying) |
| PAY-03 | F | Checkout each plan with Stripe test card `4242 4242 4242 4242`. | Stripe Checkout in the right currency; success → `/success`; plan active immediately. | P1 | Staging only |
| PAY-04 | F | Declined test card `4000 0000 0000 0002`. | Clear decline; `/failed` "Try again" returns to pricing/checkout. | P1 | Staging only |
| PAY-05 | F | Pricing popup (from practice/exams): prices match `/pricing`; close button. | Same prices; closes. | P2 | Staging |
| PAY-06 | P | Profile → change plan / cancel. | Correct confirmation; access stays until period end. | P1 | Staging only |
| PAY-07 | App | Purchase in the Android app. | Google Play billing (not Stripe) per store rules; plan syncs to the website. | P1 | Staging only |

## 11. Authentication

| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| AU-01 | G | Sign up with email (new test address). | Confirmation email; after confirming, onboarding then dashboard. | P1 | Staging |
| AU-02 | G | Sign up / sign in with Google. | Completes; lands on `redirect_url` or `/practice-overview`. | P1 | Staging |
| AU-03 | G | Sign in with wrong password; unknown email; empty fields. | Clear inline errors; no crash; no account enumeration message. | P1 | Staging |
| AU-04 | G | Forgot password → email link → set new password. | Works once; expired link shows a clear message. | P1 | Staging |
| AU-05 | F | Sign out from the avatar menu on a gated page. | Signed out; header switches to Sign In. | P2 | Staging |
| AU-06 | G | `/profile` signed out. | Redirect to sign-in (currently goes to `/practice-overview`). | P3 | Safe-prod |
| AU-07 | G | Login popup links from any page. | Return to the same page after sign-in (`redirect_url`). | P2 | Staging |
| AU-08 | F | Same account on 3+ devices. | Account-sharing protection message matches the plan's device limit. | P2 | Staging |

## 12. Profile, referral, earn100

| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| PF-01 | F/P | `/profile`: every tab and button; edit name; upload avatar. | Saved after reload; validation on bad input. | P1 | Staging |
| PF-02 | F/P | Referral page: copy link, share buttons. | Correct personal link; copied message. | P2 | Staging |
| PF-03 | F | Open a friend's referral link in a private window and sign up. | Referral recorded; discount applied at checkout. | P1 | Staging |
| PF-04 | G | `/referral`, `/earn100` as guest. | Sensible guest view or redirect; no errors. | P3 | Safe-prod |

## 13. Onboarding

| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| ON-01 | F (new) | Complete onboarding survey with every option type; Back and Next. | Answers saved; lands on dashboard; survey not shown again. | P1 | Staging |
| ON-02 | F (new) | Close/skip the survey. | Doesn't block the site; reappears only if intended. | P2 | Staging |

## 14. Legal and static pages

| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| ST-01 | G | `/privacy-policy`, `/terms-of-service`, `/refund-policy`, `/contact-us`. | Load (200), readable on phone, links work; support `mailto:` opens. | P3 | Safe-prod |
| ST-02 | G | `/robots.txt`, `/manifest.json`, `/.well-known/assetlinks.json`. | 200 with valid content. | P2 | Safe-prod |

## 15. CMS (admin)

All on staging with an admin test account. Never edit production content as a test.

| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| CMS-01 | A | Sidebar: every item reachable on a laptop screen (scroll) and on phone (drawer). | All items visible; drawer opaque; overlay dim. | P2 | Staging |
| CMS-02 | A | Blog: create post with every editor block (callouts, copy box, checklist, CTA, table design, colours, highlight, link, image). Save, publish, view `/blog/<slug>`. | Published page matches the editor preview. | P1 | Staging |
| CMS-03 | A | Blog: edit, unpublish, delete a test post. | Changes reflect on the site after revalidation. | P1 | Staging |
| CMS-04 | A | Practice and exam CRUD for each skill (create, edit, delete a test item). | Saved and visible in practice/exams; validation on missing fields. | P1 | Staging |
| CMS-05 | A | Users: search, open a user, assign a plan. | Plan applies; user sees it after reload. | P1 | Staging |
| CMS-06 | A | Plans, NPS, Reports, Withdrawal requests, Tasks pages. | Load, filter, paginate without errors. | P2 | Staging |
| CMS-07 | F | Open `/cms/dashboard` as a non-admin. | Redirected away; no admin data visible. | P1 | Safe-prod |

## 16. Robustness ("try to break it")

| ID | Who | Steps | Expected | Pri | Prod |
|---|---|---|---|---|---|
| RB-01 | G/F | Double-click / rapid-click every submit-type button. | Only one action happens; no duplicate requests or double charges. | P1 | Staging |
| RB-02 | G/F | Go offline (DevTools) mid-practice, then submit. | Clear error; answers kept; works after reconnecting. | P2 | Staging |
| RB-03 | G | Open several practice tabs at once. | Timers and answers independent per tab. | P3 | Safe-prod |
| RB-04 | G | Edit URL params by hand (`taskId=abc`, `selectedPracticeId=xyz`). | Redirect to a valid page or a clear message; no crash/500. | P2 | Safe-prod |
| RB-05 | G/F | Leave a prompt open until the timer ends. | "Time's Up!" state; can still submit or see results as designed. | P2 | Safe-prod |
| RB-06 | G | Zoom 200% and very wide screens (2560px). | Layout usable; no overlapping sections. | P3 | Safe-prod |
| RB-07 | G | Ad blocker / strict tracking protection on. | Site works (analytics may be blocked). | P2 | Safe-prod |

---

## Run template

```
# Test run YYYY-MM-DD: <environment URL>, <browser/device>, tester: <name>

| ID | Result | Notes / screenshot |
|---|---|---|
| REG-01 | Pass | |
| ... | | |
```

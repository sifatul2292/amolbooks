# Automatic WhatsApp order messages

When a customer places an order on the website (cash on delivery, like the order SMS), the shop
sends a WhatsApp message to the order's phone number. Orders added by staff (Orders page "Add
Order", Customer Manager, Incomplete Orders) get no WhatsApp order message, only the SMS as before:
the customer already agreed the order with staff (owner, 2026-11-10; `OrderService.staffAddedOrder`
= orderOrigin admin/incomplete or a manualOrderSource). When the order is booked with the courier (by staff, in bulk,
or by Future delivery) it can send a second message with the tracking code (off since 2026-11-10).

Order SMS (owner, 2026-11-10): while WhatsApp messages are on, the order SMS waits. If WhatsApp
reports the message **delivered** (✓✓) the SMS is not sent (the order gets `orderSmsSkippedAt`; the
Orders page badge tooltip says "order SMS not sent"). If the message fails, or is still not
delivered after 2 minutes (`WHATSAPP_SMS_WAIT_SECONDS`, default 120), the SMS goes out as before.
Waiting SMS are on the order (`orderSmsDueAt`) and checked every 15 seconds, so a restart loses none.
A customer who confirms on WhatsApp gets the WhatsApp answer and no confirmation SMS; a staff
confirm still sends the confirmation SMS.

Code: `api/src/shared/whatsapp/` (WhatsappService, webhook controller), hooks in
`api/src/pages/sales/order/order.service.ts` (`notifyWhatsapp`), record on the order
(`whatsappMessages`), badge on the Orders page (`api/upload/static/custom-orders.html`
`whatsappBadge`), checkout note (`gtm-snippets/checkout-whatsapp-note.html`). Check:
`node scripts/check-whatsapp-orders.cjs` (fake WhatsApp server, throwaway database).

It is **off** until `WHATSAPP_ENABLED=true` and the keys below are in `api/.env` on the server.

## 1. Meta setup (owner)

1. business.facebook.com → the business that runs the Amol Books ads → **WhatsApp accounts → Add**.
   Meta may ask for business verification (trade licence or similar).
2. Add the phone number that will send the messages. A number that is not in the WhatsApp app is
   simplest. Meta also lets some WhatsApp Business app numbers keep the app and use the API
   ("coexistence"); the setup screen says if yours can.
3. developers.facebook.com → **My apps → Create app → Business** → add the **WhatsApp** product and
   link it to that WhatsApp account. Note the **Phone number ID** (WhatsApp → API setup).
4. Business settings → **System users → Add** (admin) → **Generate token** for the app with the
   `whatsapp_business_messaging` and `whatsapp_business_management` permissions, no expiry.
   This is `WHATSAPP_ACCESS_TOKEN`. Keep it secret (only in `api/.env`, never in git or chat).
5. App settings → Basic → **App secret** → `WHATSAPP_APP_SECRET`.
6. Add a payment method to the WhatsApp account (Meta bills per message, in USD).

## 2. Message templates (WhatsApp Manager → Message templates → Create)

Category **Utility**, language **Bengali (bn)**. Names and placeholders must match exactly
(the code fills `{{1}}`, `{{2}}`… in this order). Body text:

**`order_received`**

```
আসসালামু আলাইকুম {{1}},
আমল বুকস থেকে আপনার অর্ডার #{{2}} পেয়েছি।
বই: {{3}}
মোট: ৳{{4}} (ডেলিভারি চার্জসহ)
৩ দিনের মধ্যে ডেলিভারি করা হবে ইনশাআল্লাহ। কোনো প্রশ্ন থাকলে WhatsApp করুন 01893-058682 নম্বরে।
— আমল বুকস
```

Sample values for Meta's review: `রহিম`, `1024`, `প্রোডাক্টিভ মুসলিম × 1`, `945`.

Which number sends (checked 2026-11-10): the API number **+880 1302-771586** (WhatsApp account
"Amol Books" 1647000126524022, app "CRM Amol") sends these messages. Nobody reads replies to that
number (the webhook only records delivery), so the text points customers to the staff WhatsApp
Business app number **01893-058682**.

**`order_shipped`**

```
আসসালামু আলাইকুম {{1}},
আপনার অর্ডার #{{2}} কুরিয়ারে পাঠানো হয়েছে।
কুরিয়ার: {{3}}
ট্র্যাকিং কোড: {{4}}
অর্ডারের অবস্থা দেখুন: https://www.amolbooks.com/order-track/{{5}}
শিগগিরই ডেলিভারি পাবেন ইনশাআল্লাহ।
— আমল বুকস
```

Sample values: `রহিম`, `1024`, `Steadfast`, `SFR123456`, `6a0000000000000000000000`.

Meta usually approves Utility templates within minutes to a day. Leave a template's name empty in
`.env` to stop just that message.

**`order_confirm_v2`** (current order message, owner's text; submitted 2026-11-10, Utility, Bengali, in review)

```
আসসালামু আলাইকুম {{1}},
আমল বুকস থেকে আপনার অর্ডার #{{2}} পেয়েছি।
বই: {{3}}
মোট: ৳{{4}} (ডেলিভারি চার্জসহ)
সব ঠিক থাকলে নিচে "অর্ডার কনফার্ম" চাপুন। একই ডেলিভারি চার্জে আরও বই যোগ করতে, নিচের "একই ডেলিভারি চার্জে আরও বই নিবো" চাপুন।
৩ দিনের মধ্যে ডেলিভারি করা হবে ইনশাআল্লাহ।
— amolbooks.com
```

Two **Quick reply** buttons (type "Custom"), in this order: **অর্ডার কনফার্ম**, **একই ডেলিভারি চার্জে আরও বই নিবো**
(Meta's form allows 40 characters per button; this one is 31 and fits one line). Same sample values as `order_received`. The shop sends the payloads `confirm:<order id>` /
`more:<order id>`. The "same delivery charge" line is an offer, so Meta may file the template as
Marketing (dearer per message); check the category Meta shows before switching to it.

**`order_confirm`** (first version with buttons; approved 2026-11-10)

Same body as `order_received`, but the line about questions is replaced by
`সব ঠিক থাকলে নিচে "অর্ডার কনফার্ম" চাপুন। কিছু বদলাতে চাইলে "পরিবর্তন চাই" চাপুন।`
followed by `৩ দিনের মধ্যে ডেলিভারি করা হবে ইনশাআল্লাহ।`, plus two **Quick reply** buttons (type
"Custom"), in this order: **অর্ডার কনফার্ম**, **পরিবর্তন চাই**. The shop sends each button a payload
`confirm:<order id>` / `change:<order id>` (`WHATSAPP_CONFIRM_BUTTONS=true`).

What a tap does (`OrderService.handleWhatsappReply`), only from the order's own phone number:
- **অর্ডার কনফার্ম** on a Pending/Processing order that is not booked or cancelled: status becomes
  Confirmed like a staff confirm (timeline; no confirmation SMS, the WhatsApp answer replaces it),
  the order shows "✓ Customer confirmed" on the Orders page, and the customer gets
  "ধন্যবাদ! আপনার অর্ডার #… কনফার্ম হয়েছে ✅". A second tap gets "আগেই কনফার্ম করা আছে".
  Booked/cancelled orders are never reopened.
- **একই ডেলিভারি চার্জে আরও বই নিবো** (order_confirm_v2) / **পরিবর্তন চাই** (order_confirm): status unchanged, the order
  shows "➕ Wants more books" / "✎ Wants change" (`customerRequest`), and the customer gets a
  tap-to-chat link to the staff number (`WHATSAPP_HELP_NUMBER`, default 8801893058682) with
  "Order #… - add more books" / "Order #… - change" already typed. Works until the order is booked
  with the courier (a confirmed order too); after that the answer says nothing can be added.
- Any other message to the API number: one answer per customer per 12 hours pointing to the staff
  number, naming their latest order ("অর্ডার #… নিয়ে প্রশ্ন বা কথা বলতে…").
All answers end with "— amolbooks.com". They are free-form messages inside Meta's 24-hour
customer-service window, which the customer opens by tapping or writing: Meta does not charge them.
Not sent to the courier automatically (staff still press "send to courier").

**`order_feedback`** (review request 14 days after delivery; submitted 2026-11-14 on WhatsApp account
1647000126524022, Utility, Bengali, in review). Set `WHATSAPP_TEMPLATE_REVIEW_REQUEST=order_feedback`.

```
আসসালামু আলাইকুম {{1}},
আমল বুকস থেকে আপনার অর্ডার #{{2}} ডেলিভারি হয়েছে।
বই: {{3}}
বই কেমন লাগছে? এই অর্ডার নিয়ে আপনার মতামত জানাতে নিচের "মতামত দিন" বাটনে চাপ দিন। কোনো সমস্যা হলে "সমস্যা আছে" চাপুন।
— amolbooks.com
```

No footer. Buttons, in exactly this order (the first one opens the shop):
1. **Visit website**, text **মতামত দিন**, URL type **Dynamic**: `https://amolbooks.com/rate/{{1}}`,
   sample `https://amolbooks.com/rate/AbCdEfGh12345678`.
2. **Quick reply** (Custom): **এখনো পড়িনি**
3. **Quick reply** (Custom): **সমস্যা আছে**

Sample body values: `রহিম`, `1024`, `প্রোডাক্টিভ মুসলিম, দ্য বারাকাহ ইফেক্ট ও আরও ২টি বই`. {{2}} is the
order number, {{3}} the order's books, kept short: one name, two names ("ক ও খ"), or two names and
"ও আরও Nটি বই"; "বই কেমন লাগছে?" reads right for one book or several, and the review page lists every
book (one card each, reviewed one by one).

Why this wording (Meta's template categorization rules): a feedback request is Utility only when it
names the specific order and has no promotional or persuasive line. The first version,
**`review_request`** (no order number, "আপনার সৎ মতামত অন্য পাঠকদের বই বাছতে সাহায্য করবে", a STOP
footer), was moved to Marketing by Meta on 2026-11-14; it is still approved as Marketing but no longer
matches the code (2 values instead of 3), so do not use it. Keep this one plain: no discount, coupon,
book suggestion or "help other readers" line. If Meta also moves it to Marketing it still works (it
costs more per message); do not keep resubmitting Utility versions, since Meta limits accounts that
repeatedly mark marketing as utility (that can hit the order messages too). (An older order message
may still carry a **ভালো লাগছে** tap; it is still answered.)

`ReviewRequestService` (api/src/pages/review-request) looks at each delivered order once, 14 days
after delivery (Delivered status date, else the courier's "delivered" update), between 7 and 9 pm
Dhaka time, and sends this message with a private review page link (`amolbooks.com/rate/<code>`,
no login, open 60 days). Not asked: cancelled/returned/partly delivered orders, numbers asked in
the last 30 days, numbers that wrote "stop", chats with an open inbox request, staff numbers
(`REVIEW_REQUEST_SKIP_NUMBERS`), orders with only gifts. Each order keeps the outcome in
`reviewRequest` (sent / failed / skipped with the reason / holdout).

**মতামত দিন** opens the review page in the shop (header, menu, cart): the order's books to rate,
then login with an SMS code, then "আপনার জন্য আরও বই" — up to 4 books to buy next (best sellers
by the same author, else publisher, else category; published, in stock, never bought on that
number), each opening its book page, plus "সব বই দেখুন". After login the customer lands in their
account (/account/profile): orders with progress, "আবার কিনুন" on delivered books, their reviews,
and the same "আপনার জন্য আরও বই" shelf.

What a tap does (free answers inside the 24-hour window the tap opens):
- **ভালো লাগছে** (older messages only): the review link again, the coupon line when
  `REVIEW_REWARD_COUPON` is set, and one book suggestion (same rules) unless the customer already
  ordered again.
- **এখনো পড়িনি**: the review link ("open for 60 days"). No reminder later.
- **সমস্যা আছে**: "tell us here, a photo helps" plus the link; the chat shows "⚠ Has a problem" in
  the WhatsApp Inbox (and the order on the Orders page) until staff press Mark done.
- A customer who writes only "stop" / "বন্ধ" gets no more review requests or suggestions (order
  messages still go out).

**Daily limit and Customer Manager** (owner, 2026-11-14: "send out about 50 messages a day … from
this customer manager page, I want to see who responded"): at most 50 requests a day by default
(`REVIEW_REQUEST_DAILY_LIMIT`, or the "Daily limit" box on Customer Manager, Super Admin / Admin,
up to 1,000; it wins over the env value and needs no restart). Newest deliveries go first, so
each day's buyers are asked at the 14-day mark; orders that do not fit within the 3 catch-up days
are not asked. Customer Manager shows a "Feedback requests" strip (on/off, today's count / limit,
quick filters All asked · Responded · Reviews to approve · Published · Problems), a Feedback column
(Asked · delivered/read, Replied "…", ★ Review to approve, Review published + published message
status, Problem, Not delivered), a "Latest feedback first" sort, and a Feedback tab in the customer
popup with every request, tap and review; a Super Admin can "Approve & publish" a review there
(same route as admin → Reviews, so the customer gets the `review_approved` message).

Reviews from the page are saved like any customer review: pending until approved in the admin
panel's Reviews, one per book per order (editable until approved), marked as a verified purchase.
After the first review the page shows the reward coupon. Numbers: admin menu → Analytics →
Review Requests.

The review page (inside the shop, with its header and footer) shows writing ideas under each
book, read from the book's description (its listed parts / features, else its category) plus five
general ones. After the review the customer types their mobile number (it must be the order's),
gets an SMS code and is logged in to their shop account (made for them if they have none). The
account then has their name, number, the order's address, their orders by that number, and the
review ("অনুমোদনের অপেক্ষায়" until approved) in the customer dashboard (/account/profile).

**`review_published`** (review published; submitted 2026-11-14 on WhatsApp account 1647000126524022,
Utility, Bengali, in review). Set `WHATSAPP_TEMPLATE_REVIEW_APPROVED=review_published`.

```
আসসালামু আলাইকুম {{1}},
আপনার অর্ডার #{{2}} থেকে কেনা "{{3}}" বই নিয়ে আপনার রিভিউ আমল বুকসে প্রকাশিত হয়েছে। রিভিউটি দেখতে নিচের "রিভিউ দেখুন" বাটনে চাপ দিন। ধন্যবাদ।
— amolbooks.com
```

No footer. One button: **Visit website**, text **রিভিউ দেখুন**, URL type **Dynamic**:
`https://amolbooks.com/rate/{{1}}`, sample `https://amolbooks.com/rate/AbCdEfGh12345678` (the same
page: the published review with a link to the book, and "আপনার জন্য আরও বই" to buy next).
Sample body values: `রহিম`, `1024`, `প্রোডাক্টিভ মুসলিম`.

Why this wording: the first version, **`review_approved`** ("মতামতের জন্য ধন্যবাদ! আরও কোনো বই
লাগবে?" + quick replies **হ্যাঁ, বই লাগবে** / **এখন না**), is a cross-sell, so Meta approved it as
Marketing. Utility needs a plain update about the customer's own order: order number, the book, a
link, no "need more books?" line or buttons (the book suggestions stay on the page the link opens).
`review_approved` is still approved but no longer matches the code (2 values instead of 3): do not
use it. If Meta moves `review_published` to Marketing too, keep it (it still works) rather than
resubmitting again.

When staff approve a review written from the WhatsApp link (admin panel → Reviews), the customer
gets this once per order. Not for numbers that wrote "stop". Taps on older messages that still
have the buttons keep working:
- **হ্যাঁ, বই লাগবে**: "tell us which books here" plus one book suggestion (same rules as above);
  the chat shows "📚 Wants new books" in the WhatsApp Inbox (and the Orders page) until staff press
  Mark done. Make a new order for them (the reviewed order is delivered). An open "problem" on the
  same order is kept first.
- **এখন না**: a thank-you, nothing else.

## WhatsApp Inbox (admin menu → Sales → WhatsApp Inbox)

Everything customers send to the API number is kept (text, photos, voice notes, files, location,
button taps), together with the shop's own messages (order message, automatic answers, staff
replies). Page: `/upload/static/whatsapp-inbox.html` (source `gtm-snippets/whatsapp-inbox.html`,
served with the shared admin menu). Routes `GET /api/whatsapp-inbox/chats`,
`GET /api/whatsapp-inbox/chats/:number`, `POST /api/whatsapp-inbox/chats/:number/reply`,
`GET /api/whatsapp-inbox/media/:id`, all staff-login only. Storage: collections `whatsappchats`
(one per number: name, last message, unread, last customer message) and `whatsappchatmessages`.

- The list shows numbers that wrote to the shop, newest first, with unread counts; search by name
  or number. Opening a chat marks it read (by that staff member) and shows the customer's orders
  (links open them on the Orders page). The WhatsApp badge on the Orders page opens the chat.
- Staff can reply for 24 hours after the customer's last message (Meta's rule; free). After that
  the page says the chat is closed: call or SMS, or wait until they write again.
- Photos / voice notes are fetched from WhatsApp when shown (Meta keeps them 30 days).
- "একই ডেলিভারি চার্জে আরও বই নিবো" / "পরিবর্তন চাই" taps put an orange "Wants more books" / "Wants a
  change" tag on the chat, count under "Needs action", and show a banner in the chat with
  "Open order" and "Mark done" (marks the order's request handled). Booking or cancelling the order
  also clears it.
- Messages from before the inbox went live were not kept anywhere.
- Replying (2026-11-12): an answer shows at once with a clock and the box is free for the next;
  answers go out one after another in order. One that WhatsApp refuses stays in the chat with the
  reason and "Send again" / "Edit". Half-written answers stay with their chat (this browser, 3 days).
  The open chat refreshes every 4 s.
- Phones: one screen at a time (list, chat, order details) and the phone's Back button steps back
  through them; the page fits above the keyboard, order chips and the banner step aside while typing,
  and the keyboard stays open after Send.
- Ready answers: the ⚡ button left of the box, or type `/` (e.g. `/price`), arrows + Enter to pick.
  They go into the box for checking, never straight to the customer: "More books · order #N"
  (book list without what is in that order), "Books added · order #N" (the order's current total),
  "Price list (popular books)" (the owner's price-list message), "Ask for name & address",
  "Delivery charge", "Thank you". Route `GET /api/whatsapp-inbox/chats/:number/quick-replies`.
  The "Wants more books" banner has a "Book list" button that puts the more-books list in the box.
- "একই ডেলিভারি চার্জে আরও বই নিবো" now gets the popular books with today's website price (books
  already in that order left out) and the amolbooks.com link, asking for the names or numbers.
  The list is `DEFAULT_BOOK_LIST` in `whatsapp.service.ts` (slugs on the website); unpublished
  books are skipped. `WHATSAPP_BOOK_LIST` (comma-separated slugs) replaces it without a code change.

Automatic answer to customers' own messages (`WHATSAPP_AUTO_REPLY`): `inbox` (default: "আপনার
মেসেজ পেয়েছি ✅ … আমাদের টিম এখানেই উত্তর দেবে", once per 12 hours, not while staff are replying;
button answers also say "এখানেই লিখুন"), `handover` (point them to the staff number, as before) or
`off` (no automatic answer). Check: `node scripts/check-whatsapp-inbox.cjs`.

## 3. Server settings (`api/.env`, then restart)

```
WHATSAPP_ENABLED=true
WHATSAPP_ACCESS_TOKEN=<system user token>
WHATSAPP_PHONE_NUMBER_ID=<phone number id>
WHATSAPP_APP_SECRET=<app secret>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<any long random text you choose>
WHATSAPP_TEMPLATE_ORDER_PLACED=order_confirm_v2
# true: second button follows the template (order_confirm = পরিবর্তন চাই, order_confirm_v2 = একই ডেলিভারি চার্জে আরও বই নিবো)
WHATSAPP_CONFIRM_BUTTONS=true
# courier message off (owner, 2026-11-10); set to order_shipped to turn it on
WHATSAPP_TEMPLATE_ORDER_SHIPPED=
# optional
WHATSAPP_TEMPLATE_LANGUAGE=bn
WHATSAPP_API_VERSION=v26.0
WHATSAPP_HELP_NUMBER=8801893058682
# seconds the order SMS waits for WhatsApp delivery (min 30)
WHATSAPP_SMS_WAIT_SECONDS=120
# customers' own messages: inbox (default) | handover | off
WHATSAPP_AUTO_REPLY=inbox
# books offered on "আরও বই নিবো" and in the price list (website slugs, comma-separated); empty = built-in list
WHATSAPP_BOOK_LIST=
# review request 14 days after delivery: the approved template's name, order_feedback (empty = off)
WHATSAPP_TEMPLATE_REVIEW_REQUEST=
# "Your review is published" (template review_published, above); empty = off
WHATSAPP_TEMPLATE_REVIEW_APPROVED=
# optional: days after delivery (14) and send hours in Dhaka time (19-21 = 7:00 to 8:59 pm)
# most review requests a day (Dhaka day); the Customer Manager page can change it (that wins)
REVIEW_REQUEST_DAILY_LIMIT=50
REVIEW_REQUEST_DAYS=14
REVIEW_REQUEST_HOURS=19-21
# optional: coupon code made in admin → Coupons, shown after a review (any rating); empty = no reward
REVIEW_REWARD_COUPON=
# optional: % of customers not asked, to see whether the message brings reorders (0 = ask everyone)
REVIEW_REQUEST_HOLDOUT_PERCENT=0
# optional: staff numbers that are never asked (comma-separated)
REVIEW_REQUEST_SKIP_NUMBERS=
```

Then `pm2 restart amolbooks-api`. Turning it off: `WHATSAPP_ENABLED=false` and restart.

## 4. Delivery updates (webhook)

App dashboard → WhatsApp → Configuration → Webhook:

- Callback URL: `https://apisub.amolbooks.com/api/whatsapp/webhook`
- Verify token: the same text as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- Subscribe to the **messages** field.

Each order then shows a small WhatsApp badge under the phone number on the Orders page:
grey ✓ sent, green ✓✓ delivered, blue ✓✓ read, red ✕ not delivered (hover for the reason,
e.g. "131026 Message undeliverable" when the number has no WhatsApp; the SMS still went out).

## 5. First test

Place one real cash-on-delivery order with your own phone number and check that the message
arrives and the badge turns blue after you read it. Cancel that order afterwards.

## Cost

Meta charges per delivered template message; for Bangladesh about $0.0037 per Utility message
(from 1 October 2026; check Meta's rate card), more if Meta files the template as Marketing.
Answers to taps and messages are free. Each order whose WhatsApp is delivered also saves its SMS.

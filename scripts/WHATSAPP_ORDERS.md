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

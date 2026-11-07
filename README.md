# Matnchi Bot

Telegram bot Cloudflare Workers webhook orqali ishlaydi.

## Ishga tushirish uchun kerakli sozlamalar

Cloudflare Worker bindings:
- `USER_STATE` — KV namespace
- `AI` — Cloudflare Workers AI

Cloudflare secrets:
- `TELEGRAM_BOT_TOKEN`
- `WEBHOOK_SECRET`
- `SETUP_SECRET`

GitHub Actions secret:
- `CLOUDFLARE_API_TOKEN`

`wrangler.toml` ichida Worker nomi va KV namespace ID saqlanadi. Maxfiy tokenlarni repozitoriyga yozmang.

## Joylash

`main` tarmog‘iga o‘zgarish yuborilganda GitHub Actions:
1. JavaScript sintaksisini tekshiradi.
2. Wrangler dry-run bajaradi.
3. Worker'ni Cloudflare'ga joylaydi.

Webhookni birinchi marta ulash yoki qayta ulash uchun Worker manzilidagi `/register?key=SETUP_SECRET` yo‘li ishlatiladi.

## Bot xizmatlari

- Tarjima: Cloudflare Workers AI, Google Translate va MyMemory zaxira yo‘llari.
- Lotin/kirill: Worker ichidagi o‘zgartirish funksiyalari.
- Imlo: Yandex Speller (ruscha va inglizcha).

Eslatma: bepul xizmatlar kvota va so‘rov cheklovlariga ega. Tarjima sifati va mavjudligi alohida amaliy sinovdan o‘tkazilishi kerak.

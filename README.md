# Matnchi Bot

Matnchi Bot — Telegram uchun Cloudflare Workers webhook boti. Bitta Worker ichida tarjima, imlo tekshiruvi, yangi lotin alifbosi va lotin-kirill o‘girish xizmatlari ishlaydi.

## Xizmatlar

- **Tarjima:** o‘zbek, rus, ingliz, arab va turk tillariga Google Translate public endpoint orqali. Tarjima natijasi ortiqcha sarlavhasiz yuboriladi; o‘zbekcha natija yangi lotin alifbosiga moslanadi.
- **Imlo:** Cloudflare Workers AI (`@cf/qwen/qwen3-30b-a3b-fp8`) orqali o‘zbek, rus, ingliz, turk va arab matnlari.
- **Yozuv o‘girish:** lotin → kirill va kirill → yangi o‘zbek lotin yozuvi.
- **Obunachilar:** foydalanuvchi holati va obunachilar ro‘yxati Durable Object storage’da saqlanadi.

## Cloudflare sozlamalari

`wrangler.toml` ichidagi bindinglar:
- `AI` — Workers AI binding.
- `USER_STATE_DO` — `UserState` Durable Object binding.

Cloudflare Worker secrets:
- `TELEGRAM_BOT_TOKEN`
- `WEBHOOK_SECRET`
- `SETUP_SECRET`

GitHub Actions repository secret:
- `CLOUDFLARE_API_TOKEN`

`CLOUDFLARE_ACCOUNT_ID` deploy workflow ichida sozlangan. Token yoki boshqa maxfiy qiymatlarni GitHub kodiga yozmang.

## Webhookni ulash

Worker joylangandan keyin bir marta quyidagi manzilni oching:

`https://matnchi-bot.pirajokoooo.workers.dev/register?key=SETUP_SECRET`

`SETUP_SECRET` o‘rniga Cloudflare’da saqlangan haqiqiy maxfiy qiymat ishlatiladi. Uni hech kimga yubormang.

## Tekshirish va joylash

Lokal tekshiruv:
- `npm install`
- `npm run verify`

`main` yoki `master` tarmog‘iga o‘zgarish yuborilganda GitHub Actions sintaksisni tekshiradi, testlarni bajaradi va shundan keyingina Worker’ni Cloudflare’ga joylaydi.

## Muhim eslatma

Tarjima Google Translate’ning ommaviy endpointiga bog‘liq; u rasmiy API kafolatlari yoki doimiy ishlash kafolatiga ega emas. Tarjima sifati va imlo natijalarini Telegram’da haqiqiy matnlar bilan alohida sinash kerak.

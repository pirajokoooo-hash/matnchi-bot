# Matnchi Bot — Cloudflare Workers

Telegram botning webhook varianti.

## Cloudflare sozlamalari
1. Workers & Pages bo‘limida GitHub orqali loyihani ulang.
2. `USER_STATE` nomli KV namespace yarating va uning ID sini `wrangler.toml` ichidagi `REPLACE_WITH_KV_NAMESPACE_ID` o‘rniga yozing.
3. Worker secrets sifatida `BOT_TOKEN`, `WEBHOOK_SECRET`, `SETUP_SECRET` kiriting.
4. Deploy qiling.
5. Worker manzilidagi `/register?key=SETUP_SECRET qiymati` manzilini bir marta oching. Javobda `"ok":true` chiqishi webhook o‘rnatilganini bildiradi.
6. Telegram botga `/start` yuboring.

`WEBHOOK_SECRET` va `SETUP_SECRET` uchun uzun, tasodifiy maxfiy qiymatlar ishlating. Ularni GitHub yoki chatga yozmang.

## Xizmatlar
- Tarjima: Google Translate ommaviy manzili (uchinchi tomon; rasmiy API kafolati yo‘q).
- Ruscha va inglizcha imlo: Yandex Speller.
- Lotin/kirill: bot ichidagi o‘zgartirish funksiyalari.
- Foydalanuvchi tanlovi: Cloudflare KV da 30 kun saqlanadi.

Muhim: `bot.py` dagi polling botini webhook bilan bir vaqtda ishga tushirmang.

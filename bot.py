import asyncio
import logging
import os
import re
import aiohttp
from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton

logging.basicConfig(level=logging.INFO)
BOT_TOKEN = os.getenv("BOT_TOKEN")
if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN muhiti o'rnatilmagan")
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
user_modes = {}
user_languages = {}
APOSTROPHES = "'’‘ʻʼ´"

MAIN_KEYBOARD = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text="🌐 Tarjima", callback_data="mode:translate")],
    [InlineKeyboardButton(text="🔤 Lotin ↔ Кирилл", callback_data="mode:translit")],
    [InlineKeyboardButton(text="✍️ Imlo tuzatish", callback_data="mode:spell")],
])
LANG_KEYBOARD = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text="🇺🇿 O‘zbekcha", callback_data="lang:uz"),
     InlineKeyboardButton(text="🇷🇺 Ruscha", callback_data="lang:ru"),
     InlineKeyboardButton(text="🇬🇧 Inglizcha", callback_data="lang:en")],
    [InlineKeyboardButton(text="🇹🇷 Turkcha", callback_data="lang:tr"),
     InlineKeyboardButton(text="🇸🇦 Arabcha", callback_data="lang:ar")],
    [InlineKeyboardButton(text="⬅️ Menyuga qaytish", callback_data="home")],
])
BACK_KEYBOARD = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text="⬅️ Menyuga qaytish", callback_data="home")]
])

def _case_like(source: str, lower: str, upper: str) -> str:
    if source.isupper():
        return upper
    if source[:1].isupper():
        return upper[:1] + lower[1:]
    return lower


def latin_to_cyrillic(text: str, new_alphabet: bool = False) -> str:
    """Convert Uzbek Latin text to Cyrillic; optionally accept the 2026 alphabet."""
    apostrophes = re.escape(APOSTROPHES)
    text = re.sub(r"(?i)o[" + apostrophes + r"]", "Ў", text)
    text = re.sub(r"(?i)g[" + apostrophes + r"]", "Ғ", text)

    pairs = {
        "sh": "Ш", "ch": "Ч", "yo": "Ё", "yu": "Ю",
        "ya": "Я", "ye": "Е", "ts": "Ц",
    }
    singles = {
        "a":"А","b":"Б","d":"Д","e":"Е","f":"Ф","g":"Г","h":"Ҳ",
        "i":"И","j":"Ж","k":"К","l":"Л","m":"М","n":"Н","o":"О",
        "p":"П","q":"Қ","r":"Р","s":"С","t":"Т","u":"У","v":"В",
        "x":"Х","y":"Й","z":"З","w":"В",
        "ў":"Ў","ғ":"Ғ","ö":"Ў","ğ":"Ғ","ş":"Ш","ç":"Ч",
    }
    out = []
    i = 0
    while i < len(text):
        ch = text[i]
        pair = text[i:i+2].lower()
        if pair in pairs:
            out.append(_case_like(text[i:i+2], pairs[pair].lower(), pairs[pair]))
            i += 2
            continue
        low = ch.lower()
        if low in singles:
            value = singles[low]
            out.append(value if ch.isupper() else value.lower())
        elif ch in APOSTROPHES:
            out.append("Ъ" if ch.isupper() else "ъ")
        else:
            out.append(ch)
        i += 1
    return "".join(out)


def cyrillic_to_latin(text: str, new_alphabet: bool = False) -> str:
    mapping = {
        "а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"yo","ж":"j",
        "з":"z","и":"i","й":"y","к":"k","л":"l","м":"m","н":"n","о":"o",
        "п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"x","ц":"ts",
        "ч":"ç" if new_alphabet else "ch",
        "ш":"ş" if new_alphabet else "sh",
        "щ":"shch","ъ":"'","ь":"","э":"e","ю":"yu","я":"ya",
        "ў":"ö" if new_alphabet else "o‘",
        "ғ":"ğ" if new_alphabet else "g‘",
        "қ":"q","ҳ":"h",
    }
    out = []
    for ch in text:
        low = ch.lower()
        if low in mapping:
            value = mapping[low]
            if ch.isupper() and value:
                if len(value) > 1 and value.isalpha():
                    value = value[0].upper() + value[1:]
                else:
                    value = value.upper()
            out.append(value)
        else:
            out.append(ch)
    return "".join(out)

async def translate_text(text: str, target: str) -> str:
    url = "https://translate.googleapis.com/translate_a/single"
    params = {"client":"gtx","sl":"auto","tl":target,"dt":"t","q":text}
    timeout = aiohttp.ClientTimeout(total=25)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.get(url, params=params) as response:
            response.raise_for_status()
            data = await response.json(content_type=None)
    return "".join(part[0] for part in data[0] if part and part[0])

async def spellcheck(text: str):
    url = "https://speller.yandex.net/services/spellservice.json/checkText"
    params = {"text":text,"lang":"ru,en","options":"512"}
    timeout = aiohttp.ClientTimeout(total=20)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.get(url, params=params) as response:
            response.raise_for_status()
            mistakes = await response.json(content_type=None)
    corrected = text
    for item in reversed(mistakes):
        suggestions = item.get("s") or []
        if suggestions:
            start = item["pos"]
            end = start + item["len"]
            corrected = corrected[:start] + suggestions[0] + corrected[end:]
    if not mistakes:
        return text, "Ruscha yoki inglizcha matnda imlo xatosi topilmadi."
    return corrected, f"{len(mistakes)} ta ehtimoliy xato tuzatildi."

@dp.message(CommandStart())
async def start(message: Message):
    user_modes.pop(message.from_user.id, None)
    await message.answer("Assalomu alaykum! Men Matnchi Botman.\nQuyidagi xizmatlardan birini tanlang:", reply_markup=MAIN_KEYBOARD)

@dp.message(Command("help"))
async def help_command(message: Message):
    await message.answer("Xizmatlar:\n🌐 Tarjima — matnni kerakli tilga o‘giradi.\n🔤 Lotin ↔ Кирилл — yozuvni almashtiradi.\n✍️ Imlo tuzatish — ruscha va inglizcha matndagi imlo xatolarini tekshiradi.\n\n/start — asosiy menyu\n/cancel — joriy amalni bekor qilish")

@dp.message(Command("cancel"))
async def cancel(message: Message):
    user_modes.pop(message.from_user.id, None)
    await message.answer("Amal bekor qilindi.", reply_markup=MAIN_KEYBOARD)

@dp.callback_query(F.data == "home")
async def go_home(call: CallbackQuery):
    user_modes.pop(call.from_user.id, None)
    await call.message.edit_text("Kerakli xizmatni tanlang:", reply_markup=MAIN_KEYBOARD)
    await call.answer()

@dp.callback_query(F.data == "mode:translate")
async def choose_translate(call: CallbackQuery):
    await call.message.edit_text("Matn qaysi tilga tarjima qilinsin?", reply_markup=LANG_KEYBOARD)
    await call.answer()

@dp.callback_query(F.data.startswith("lang:"))
async def choose_language(call: CallbackQuery):
    user_languages[call.from_user.id] = call.data.split(":")[1]
    user_modes[call.from_user.id] = "translate_text"
    await call.message.edit_text("Endi tarjima qilinadigan matnni yuboring.", reply_markup=BACK_KEYBOARD)
    await call.answer()

@dp.callback_query(F.data == "mode:translit")
async def choose_translit(call: CallbackQuery):
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Eski lotin → Кирилл", callback_data="translit:old_lc")],
        [InlineKeyboardButton(text="Yangi lotin → Кирилл", callback_data="translit:new_lc")],
        [InlineKeyboardButton(text="Кирилл → Eski lotin", callback_data="translit:old_cl")],
        [InlineKeyboardButton(text="Кирилл → Yangi lotin", callback_data="translit:new_cl")],
        [InlineKeyboardButton(text="⬅️ Menyuga qaytish", callback_data="home")]])
    await call.message.edit_text("Qaysi yo‘nalishda o‘zgartiray?", reply_markup=keyboard)
    await call.answer()

@dp.callback_query(F.data.startswith("translit:"))
async def choose_translit_direction(call: CallbackQuery):
    user_modes[call.from_user.id] = call.data.split(":")[1]
    await call.message.edit_text("O‘zgartiriladigan matnni yuboring.", reply_markup=BACK_KEYBOARD)
    await call.answer()

@dp.callback_query(F.data == "mode:spell")
async def choose_spell(call: CallbackQuery):
    user_modes[call.from_user.id] = "spell"
    await call.message.edit_text("Imlosini tekshirish uchun ruscha yoki inglizcha matnni yuboring.\nO‘zbekcha imlo tekshiruvi hozircha to‘liq qo‘llab-quvvatlanmaydi.", reply_markup=BACK_KEYBOARD)
    await call.answer()

@dp.message(F.text)
async def process_text(message: Message):
    uid = message.from_user.id
    mode = user_modes.get(uid)
    if not mode:
        await message.answer("Avval menyudan xizmatni tanlang:", reply_markup=MAIN_KEYBOARD)
        return
    text = message.text.strip()
    if not text:
        await message.answer("Iltimos, matn yuboring.")
        return
    if len(text) > 4500:
        await message.answer("Matn juda uzun. 4500 belgidan qisqaroq matn yuboring.")
        return
    status = await message.answer("⏳ Bajarilmoqda...")
    try:
        if mode == "translate_text":
            result = await translate_text(text, user_languages.get(uid, "uz"))
            title = "🌐 Tarjima natijasi:"
        elif mode in ("old_lc", "new_lc"):
            result = latin_to_cyrillic(text, new_alphabet=(mode == "new_lc"))
            title = "🔤 Кирилл yozuvida:"
        elif mode in ("old_cl", "new_cl"):
            result = cyrillic_to_latin(text, new_alphabet=(mode == "new_cl"))
            title = "🔤 Lotin yozuvida:"
        elif mode == "spell":
            result, note = await spellcheck(text)
            title = "✍️ Imlo tekshiruvi:\n" + note + "\n\n"
        else:
            await status.edit_text("Amalni tanlashda xatolik. /start ni bosing.")
            return
        await status.edit_text(f"{title}\n\n{result}", reply_markup=BACK_KEYBOARD)
    except asyncio.TimeoutError:
        await status.edit_text("So‘rov vaqti tugadi. Qayta urinib ko‘ring.")
    except Exception:
        logging.exception("Matnni qayta ishlashda xatolik")
        await status.edit_text("Xatolik yuz berdi. Birozdan keyin qayta urinib ko‘ring.")

@dp.message()
async def unsupported(message: Message):
    await message.answer("Iltimos, matn yuboring yoki /start orqali xizmatni tanlang.")

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())

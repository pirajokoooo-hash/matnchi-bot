import os

os.environ.setdefault("BOT_TOKEN", "123456789:TEST_TOKEN_FOR_CI_ONLY")

from bot import latin_to_cyrillic, cyrillic_to_latin


def test_old_latin_to_cyrillic():
    assert latin_to_cyrillic("O‘zbekiston G‘alaba") == "Ўзбекистон Ғалаба"
    assert latin_to_cyrillic("Shahar va CHIROY") == "Шаҳар ва ЧИРОЙ"


def test_new_latin_to_cyrillic():
    assert latin_to_cyrillic("Özbekiston Ğalaba Şahar Çiroy", new_alphabet=True) == "Ўзбекистон Ғалаба Шаҳар Чирой"


def test_cyrillic_to_old_latin():
    assert cyrillic_to_latin("Ўзбекистон Ғалаба Шаҳар Чирой") == "O‘zbekiston G‘alaba Shahar Chiroy"


def test_cyrillic_to_new_latin():
    assert cyrillic_to_latin("Ўзбекистон Ғалаба Шаҳар Чирой", new_alphabet=True) == "Özbekiston Ğalaba Şahar Çiroy"

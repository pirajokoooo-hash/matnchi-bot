import test from "node:test";
import assert from "node:assert/strict";
import worker, { UserState } from "../src/index.js";

function makeEnv() {
  const stores = new Map();
  const calls = [];
  const aiCalls = [];
  const binding = {
    idFromName(name) { return name; },
    get(id) {
      if (!stores.has(id)) {
        const data = new Map();
        const ctx = { storage: {
          async get(k) { return data.get(k); },
          async put(k, v) { data.set(k, structuredClone(v)); }
        }};
        stores.set(id, new UserState(ctx, {}));
      }
      const instance = stores.get(id);
      return { fetch: (input, init) => instance.fetch(new Request(input, init)) };
    }
  };
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.includes("api.telegram.org")) {
      const method = u.split("/").pop();
      const body = JSON.parse(init.body || "{}");
      calls.push({ method, body });
      return Response.json({ ok: true, result: { message_id: 10 } });
    }
    if (u.includes("translate.googleapis.com")) {
      const parsed = new URL(u);
      const target = parsed.searchParams.get("tl");
      const translated = target === "ru" ? "Привет, мир!" : target === "ar" ? "مرحبا بالعالم!" : target === "tr" ? "Merhaba dünya!" : target === "en" ? "Hello, world!" : "Salom, dunyo!";
      return Response.json([[[translated, parsed.searchParams.get("q"), null, null]], null, "en"]);
    }
    throw new Error("Unexpected fetch: " + u);
  };
  return {
    calls,
    aiCalls,
    env: {
      TELEGRAM_BOT_TOKEN: "test-token",
      WEBHOOK_SECRET: "test-secret",
      USER_STATE_DO: binding,
      AI: { async run(model, input) {
        aiCalls.push({ model, input });
        return { response: "Test javobi." };
      } }
    }
  };
}

async function update(env, body) {
  return worker.fetch(new Request("https://worker.example/telegram", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": "test-secret"
    },
    body: JSON.stringify(body)
  }), env);
}

test("start clears saved user mode", async () => {
  const { env, calls } = makeEnv();
  await update(env, {
    callback_query: {
      id: "cb2",
      from: { id: 888 },
      data: "mode:spell",
      message: { message_id: 6, chat: { id: 888 } }
    }
  });
  await update(env, {
    message: { from: { id: 888 }, chat: { id: 888 }, text: "/start" }
  });
  await update(env, {
    message: { from: { id: 888 }, chat: { id: 888 }, text: "Hello there" }
  });
  const last = calls.filter(x => x.method === "sendMessage").at(-1);
  assert.match(last.body.text, /Avval menyudan xizmatni tanlang/);
});

test("2026 Uzbek alphabet Latin-to-Cyrillic uses Ö Ğ Ş Ç", async () => {
  const { env, calls } = makeEnv();
  await update(env, {
    callback_query: {
      id: "cb6",
      from: { id: 1003 },
      data: "translit:new_lc",
      message: { message_id: 11, chat: { id: 1003 } }
    }
  });
  await update(env, {
    message: {
      from: { id: 1003 },
      chat: { id: 1003 },
      text: "Özbek Ğalaba Şahar Çiroq"
    }
  });
  const sent = calls.filter(x => x.method === "editMessageText").at(-1);
  assert.equal(sent.body.text, "Ўзбек Ғалаба Шаҳар Чироқ");
});

test("2026 Uzbek alphabet Cyrillic-to-Latin uses Ö Ğ Ş Ç", async () => {
  const { env, calls } = makeEnv();
  await update(env, {
    callback_query: {
      id: "cb7",
      from: { id: 1004 },
      data: "translit:new_cl",
      message: { message_id: 12, chat: { id: 1004 } }
    }
  });
  await update(env, {
    message: {
      from: { id: 1004 },
      chat: { id: 1004 },
      text: "Ўзбек Ғалаба Шаҳар Чироқ"
    }
  });
  const sent = calls.filter(x => x.method === "editMessageText").at(-1);
  assert.equal(sent.body.text, "Özbek Ğalaba Şahar Çiroq");
});


test("new Uzbek Latin O‘ and tutuq signs transliterate correctly with case preserved", async () => {
  const { env, calls } = makeEnv();
  await update(env, {
    callback_query: {
      id: "cb8",
      from: { id: 1005 },
      data: "translit:new_lc",
      message: { message_id: 13, chat: { id: 1005 } }
    }
  });
  await update(env, {
    message: {
      from: { id: 1005 },
      chat: { id: 1005 },
      text: "O‘ZBEK TILI — MA’RIFAT VA TA’LIM"
    }
  });
  const sent = calls.filter(x => x.method === "editMessageText").at(-1);
  assert.equal(sent.body.text, "ЎЗБЕК ТИЛИ — МАЪРИФАТ ВА ТАЪЛИМ");
});

test("new Uzbek Latin apostrophe variants and G‘ are handled", async () => {
  const { env, calls } = makeEnv();
  await update(env, {
    callback_query: {
      id: "cb9",
      from: { id: 1006 },
      data: "translit:new_lc",
      message: { message_id: 14, chat: { id: 1006 } }
    }
  });
  await update(env, {
    message: {
      from: { id: 1006 },
      chat: { id: 1006 },
      text: "O'zbek, G‘alaba, ma’rifat va ta’lim"
    }
  });
  const sent = calls.filter(x => x.method === "editMessageText").at(-1);
  assert.equal(sent.body.text, "Ўзбек, Ғалаба, маърифат ва таълим");
});

test("Uzbek proofreading uses the upgraded Qwen model in one request", async () => {
  const { env, calls, aiCalls } = makeEnv();
  env.AI.run = async (model, input) => {
    aiCalls.push({ model, input });
    return { response: "Kecha men Toshkentdan Xivaga bordim, Xurshid akam bilan." };
  };
  await update(env, {
    callback_query: {
      id: "spell1",
      from: { id: 2001 },
      data: "mode:spell",
      message: { message_id: 21, chat: { id: 2001 } }
    }
  });
  await update(env, {
    message: {
      from: { id: 2001 },
      chat: { id: 2001 },
      text: "kecha men toshkentdan xivaga bordim xurshid akam bilan."
    }
  });
  assert.equal(aiCalls.length, 1, "a normal Uzbek text should use one AI request");
  assert.equal(aiCalls[0].model, "@cf/qwen/qwen3-30b-a3b-fp8");
  assert.equal(Object.hasOwn(aiCalls[0].input, "reasoning_effort"), false);
  const sent = calls.filter(x => x.method === "editMessageText").at(-1);
  assert.match(sent.body.text, /Toşkentdan Xivaga/);
  assert.match(sent.body.text, /Imlo tekşirildi/);
});

test("Uzbek proofreading rejects duplicated final words instead of sending bad text", async () => {
  const { env, calls } = makeEnv();
  env.AI.run = async () => ({ response: "O‘z tarixini bilmagan xalq kelajagini qura olmaydi. Olmaydi." });
  await update(env, {
    callback_query: {
      id: "spell2",
      from: { id: 2002 },
      data: "mode:spell",
      message: { message_id: 22, chat: { id: 2002 } }
    }
  });
  await update(env, {
    message: {
      from: { id: 2002 },
      chat: { id: 2002 },
      text: "oz tarixini bilmagan xalq kelajagini qura olmaydi."
    }
  });
  const sent = calls.filter(x => x.method === "editMessageText").at(-1);
  assert.match(sent.body.text, /takrorlangan.*aniqlandi/);
  assert.doesNotMatch(sent.body.text, /Imlo tekşirildi/);
});


test("Latin transliteration handles sh, ch and Uzbek yo‘ as complete sounds", async () => {
  const { env, calls } = makeEnv();
  await update(env, {
    callback_query: {
      id: "tr1", from: { id: 3001 }, data: "translit:new_lc",
      message: { message_id: 31, chat: { id: 3001 } }
    }
  });
  await update(env, {
    message: {
      from: { id: 3001 }, chat: { id: 3001 },
      text: "shahar chiroq yo‘l yo‘q"
    }
  });
  const sent = calls.filter(x => x.method === "editMessageText").at(-1);
  assert.equal(sent.body.text, "шаҳар чироқ йўл йўқ");
});

test("English spelling does not get misclassified because the sentence starts with I", async () => {
  const { env, calls, aiCalls } = makeEnv();
  env.AI.run = async (model, input) => {
    aiCalls.push({ model, input });
    return { response: "I want to learn English and improve my skills." };
  };
  await update(env, {
    callback_query: {
      id: "sp-en", from: { id: 3101 }, data: "mode:spell",
      message: { message_id: 32, chat: { id: 3101 } }
    }
  });
  await update(env, {
    message: {
      from: { id: 3101 }, chat: { id: 3101 },
      text: "I want to learn English and improve my skills."
    }
  });
  assert.match(aiCalls[0].input.messages[0].content, /English proofreader/);
  const sent = calls.filter(x => x.method === "editMessageText").at(-1);
  assert.match(sent.body.text, /English spelling checked|Inglizcha imlo tekshirildi/);
});

test("Turkish spelling is detected without confusing it with Uzbek house letters", async () => {
  const { env, calls, aiCalls } = makeEnv();
  env.AI.run = async (model, input) => {
    aiCalls.push({ model, input });
    return { response: "Yarın şehirdeki çocuklar mutlu." };
  };
  await update(env, {
    callback_query: {
      id: "sp-tr", from: { id: 3102 }, data: "mode:spell",
      message: { message_id: 33, chat: { id: 3102 } }
    }
  });
  await update(env, {
    message: {
      from: { id: 3102 }, chat: { id: 3102 },
      text: "yarın şehirdeki çocuklar mutlu"
    }
  });
  assert.match(aiCalls[0].input.messages[0].content, /Turkish proofreader/);
  const sent = calls.filter(x => x.method === "editMessageText").at(-1);
  assert.match(sent.body.text, /Turkcha imlo tekshirildi/);
  assert.match(sent.body.text, /Yarın şehirdeki çocuklar mutlu\./);
});

test("Russian spelling is kept in Russian", async () => {
  const { env, calls, aiCalls } = makeEnv();
  env.AI.run = async (model, input) => {
    aiCalls.push({ model, input });
    return { response: "Сегодня мы поедем в город." };
  };
  await update(env, {
    callback_query: {
      id: "sp-ru", from: { id: 3103 }, data: "mode:spell",
      message: { message_id: 34, chat: { id: 3103 } }
    }
  });
  await update(env, {
    message: {
      from: { id: 3103 }, chat: { id: 3103 },
      text: "сегодня мы поедем в город"
    }
  });
  assert.match(aiCalls[0].input.messages[0].content, /Russian proofreader/);
  const sent = calls.filter(x => x.method === "editMessageText").at(-1);
  assert.match(sent.body.text, /Ruscha imlo tekshirildi/);
  assert.match(sent.body.text, /Сегодня мы поедем в город\./);
});

test("Uzbek Cyrillic spelling is not mistaken for Russian", async () => {
  const { env, calls, aiCalls } = makeEnv();
  env.AI.run = async (model, input) => {
    aiCalls.push({ model, input });
    return { response: "Бугун мен Тошкентга бордим." };
  };
  await update(env, {
    callback_query: {
      id: "sp-uz-cy", from: { id: 3104 }, data: "mode:spell",
      message: { message_id: 35, chat: { id: 3104 } }
    }
  });
  await update(env, {
    message: {
      from: { id: 3104 }, chat: { id: 3104 },
      text: "бугун мен тошкентга бордим"
    }
  });
  assert.match(aiCalls[0].input.messages[0].content, /Uzbek-language proofreader/);
  const sent = calls.filter(x => x.method === "editMessageText").at(-1);
  assert.match(sent.body.text, /Бугун мен Тошкентга бордим\./);
  assert.match(sent.body.text, /Imlo tekşirildi/);
});

test("Arabic spelling uses Arabic proofreader and preserves Arabic script", async () => {
  const { env, calls, aiCalls } = makeEnv();
  env.AI.run = async (model, input) => {
    aiCalls.push({ model, input });
    return { response: "السلام عليكم، كيف حالكم؟" };
  };
  await update(env, {
    callback_query: {
      id: "sp-ar", from: { id: 3105 }, data: "mode:spell",
      message: { message_id: 36, chat: { id: 3105 } }
    }
  });
  await update(env, {
    message: {
      from: { id: 3105 }, chat: { id: 3105 },
      text: "السلام عليكم كيف حالكم"
    }
  });
  assert.match(aiCalls[0].input.messages[0].content, /Arabic proofreader/);
  const sent = calls.filter(x => x.method === "editMessageText").at(-1);
  assert.match(sent.body.text, /Arabcha imlo tekshirildi/);
  assert.match(sent.body.text, /السلام عليكم، كيف حالكم؟/);
});


test("Uzbek proofreading makes one model request and refuses an empty response", async () => {
  const { env, calls } = makeEnv();
  let requests = 0;
  env.AI.run = async () => {
    requests++;
    return { response: "" };
  };
  await update(env, {
    callback_query: {
      id: "sp-empty", from: { id: 3201 }, data: "mode:spell",
      message: { message_id: 37, chat: { id: 3201 } }
    }
  });
  await update(env, {
    message: {
      from: { id: 3201 }, chat: { id: 3201 },
      text: "kecha men toshkentga bordim"
    }
  });
  assert.equal(requests, 1, "proofreading should not call a slower second model");
  const sent = calls.filter(x => x.method === "editMessageText").at(-1);
  assert.doesNotMatch(sent.body.text, /Imlo tekşirildi/);
  assert.match(sent.body.text, /bo‘sh javob|Xizmatda xatolik/);
});

test("translation menu selects target language and returns untranslated-script output", async () => {
  const { env, calls } = makeEnv();
  await update(env, {
    callback_query: {
      id: "tr-menu", from: { id: 4001 }, data: "mode:translate",
      message: { message_id: 41, chat: { id: 4001 } }
    }
  });
  const menu = calls.filter(x => x.method === "editMessageText").at(-1);
  assert.match(menu.body.text, /Tarjima qilinadigan tilni tanlang/);
  assert.equal(menu.body.reply_markup.inline_keyboard[0][0].callback_data, "lang_uz");
  await update(env, {
    callback_query: {
      id: "tr-lang", from: { id: 4001 }, data: "lang_ru",
      message: { message_id: 41, chat: { id: 4001 } }
    }
  });
  await update(env, {
    message: { from: { id: 4001 }, chat: { id: 4001 }, text: "Hello, world!" }
  });
  const sent = calls.filter(x => x.method === "editMessageText").at(-1);
  assert.match(sent.body.text, /Привет, мир!/);
  assert.match(sent.body.text, /Asl til: English/);
  assert.match(sent.body.text, /Tarjima tili: Русский/);
  assert.doesNotMatch(sent.body.text, /Привет, мир.*Ö|Привет, мир.*Ğ/);
});


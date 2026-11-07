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
        return model.includes("m2m100")
          ? { translated_text: "Я хочу изучать английский и улучшать свои навыки." }
          : input.messages[1].content.includes("o‘zbek tilidan turk tiliga") ? { response: "Yarın arkadaşım ile şehire gideceğim." } : input.messages[1].content.includes("Onam menga doimo yaxshilik tilaydi.") ? { response: "أُمِّي تَتَمَنَّى لِي الْخَيْرَ دَائِمًا." } : { response: "السلام عليكم، كيف حالكم؟ أتمنى لكم السلام والسعادة." };
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

test("chosen translation language survives callback and next message", async () => {
  const { env, calls } = makeEnv();
  await update(env, {
    callback_query: {
      id: "cb1",
      from: { id: 777 },
      data: "lang:ru",
      message: { message_id: 5, chat: { id: 777 } }
    }
  });
  await update(env, {
    message: { from: { id: 777 }, chat: { id: 777 }, text: "I want to learn English and improve my skills." }
  });
  const sent = calls.find(x => x.method === "editMessageText" && x.body.text === "Я хочу изучать английский и улучшать свои навыки.");
  assert.ok(sent, "bot should send a translation");
  assert.equal(sent.body.text, "Я хочу изучать английский и улучшать свои навыки.");
});

test("Uzbek Latin greeting is detected as Uzbek before Arabic translation", async () => {
  const { env, calls, aiCalls } = makeEnv();
  await update(env, {
    callback_query: {
      id: "cb3",
      from: { id: 999 },
      data: "lang:ar",
      message: { message_id: 7, chat: { id: 999 } }
    }
  });
  await update(env, {
    message: {
      from: { id: 999 },
      chat: { id: 999 },
      text: "Assalomu alaykum, yaxshimisiz? Sizga tinchlik va baxt tilayman."
    }
  });
  const qwen = aiCalls.find(x => x.model.includes("qwen"));
  assert.ok(qwen, "Uzbek text should use the Uzbek-capable translation model");
  const prompt = qwen.input.messages[1].content;
  assert.match(prompt, /o‘zbek tilidan arab tiliga/);
  const sent = calls.filter(x => x.method === "editMessageText").at(-1);
  assert.equal(sent.body.text, "السلام عليكم، كيف حالكم؟ أتمنى لكم السلام والسعادة.");
});


test("Uzbek sentence about mother is detected as Uzbek before Arabic translation", async () => {
  const { env, calls, aiCalls } = makeEnv();
  await update(env, {
    callback_query: {
      id: "cb5",
      from: { id: 1002 },
      data: "lang:ar",
      message: { message_id: 9, chat: { id: 1002 } }
    }
  });
  await update(env, {
    message: {
      from: { id: 1002 },
      chat: { id: 1002 },
      text: "Onam menga doimo yaxshilik tilaydi."
    }
  });
  const qwen = aiCalls.find(x => x.model.includes("qwen"));
  assert.ok(qwen, "Uzbek sentence should use the Uzbek-capable translation model");
  assert.match(qwen.input.messages[1].content, /o‘zbek tilidan arab tiliga/);
  const sent = calls.filter(x => x.method === "sendMessage").at(-1);
  assert.equal(sent.body.text, "أُمِّي تَتَمَنَّى لِي الْخَيْرَ دَائِمًا.");
});

test("Turkish translation corrects the observed şehir dative spelling error", async () => {
  const { env, calls, aiCalls } = makeEnv();
  await update(env, {
    callback_query: {
      id: "cb4",
      from: { id: 1001 },
      data: "lang:tr",
      message: { message_id: 8, chat: { id: 1001 } }
    }
  });
  await update(env, {
    message: {
      from: { id: 1001 },
      chat: { id: 1001 },
      text: "Ertaga do‘stim bilan shaharga boraman."
    }
  });
  const qwen = aiCalls.find(x => x.model.includes("qwen"));
  assert.ok(qwen, "Uzbek-to-Turkish should use the Uzbek-capable model");
  assert.match(qwen.input.messages[0].content, /şehir is şehre, never şehire/);
  const sent = calls.filter(x => x.method === "sendMessage").at(-1);
  assert.equal(sent.body.text, "Yarın arkadaşım ile şehre gideceğim.");
});

test("start clears saved user mode", async () => {
  const { env, calls } = makeEnv();
  await update(env, {
    callback_query: {
      id: "cb2",
      from: { id: 888 },
      data: "lang:ru",
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
  const sent = calls.filter(x => x.method === "sendMessage").at(-1);
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
  const sent = calls.filter(x => x.method === "sendMessage").at(-1);
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
  const sent = calls.filter(x => x.method === "sendMessage").at(-1);
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
  const sent = calls.filter(x => x.method === "sendMessage").at(-1);
  assert.equal(sent.body.text, "Ўзбек, Ғалаба, маърифат ва таълим");
});

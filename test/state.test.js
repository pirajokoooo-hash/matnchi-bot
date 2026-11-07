import test from "node:test";
import assert from "node:assert/strict";
import worker, { UserState } from "../src/index.js";

function makeEnv() {
  const stores = new Map();
  const calls = [];
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
      return { fetch: (...args) => instance.fetch(...args) };
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
    env: {
      TELEGRAM_BOT_TOKEN: "test-token",
      WEBHOOK_SECRET: "test-secret",
      USER_STATE_DO: binding,
      AI: { async run() { return { response: "Я хочу изучать английский и улучшать свои навыки." }; } }
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
  const sent = calls.find(x => x.method === "sendMessage");
  assert.ok(sent, "bot should send a translation");
  assert.equal(sent.body.text, "Я хочу изучать английский и улучшать свои навыки.");
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

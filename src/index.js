// ========================================
// Cloudflare Worker — Awtrix 3 Salat
// ========================================
// Variables d'environnement :
//   AWTRIX_BASE_URL    → http://r2d5.freeboxos.fr:4242
//   AWTRIX_BASIC_AUTH  → base64(user:pass)
//   MAWAQIT_SLUG       → slug de la mosquée sur mawaqit.net
// ========================================

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handle(env));
  },

  async fetch(request, env, ctx) {
    try {
      const result = await handle(env);
      return new Response(JSON.stringify({ status: "ok", ...result }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ status: "error", message: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};

// ── Icônes base64 par prière ──
const ICONS = {
  Fajr: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAIAAgDAREAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5u/4Zz+Dn/Cmv7L/4TKP/AIWPj7V/buJ/svnbf+PXysY+z9vM2+bu/efd/cV8l/ZnHf8Aa/t/qkPqm3J7SlzWv8fNzfH15b8lvd3/AHh6/wBZ4c+p8v1z99vf2dXl9P4e3na/5H//2Q==",
  Dhuhr: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAIAAgDAREAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCL/i0//DPf/M5/8jR/06f2h9u+yf8Agt+w/wBl/wDbl9ir+Qf+F7+3v+XP8H+/ycnP/wCFHtvrH/cf2599/sv1X7XxeV72/wDAOXk/7d5T/9k=",
  Asr: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAIAAgDAREAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5svdK+FWm/Ahftb6Ja/EltWjZdHmsbRFMjwCKO1DmTP8AZzW7LIL37RklhcCXzTtr8Rp1s9q53+7U3hOR++pTeilzOduW3t1NOLo+z0S9lyez1P0GVPLoZf73Kq/MvdtHqrKN7/w3HVVOf+/zc2h//9k=",
  Maghrib: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAIAAgDAREAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD448/4Z48Bf8IF9n/4WJof/AAlufN+2ebP9mzj/AFW3ys7P9vG7POMfLXwv9o579e5/qNT2G1uR83+L18r2tpvqftH+qWU/2V7L26+t783NHk/w25vh/vW5r62t7p//2Q==",
  Isha: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAIAAgDAREAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5U+J6W/jr9kLwL4/vbDT/AAHqukWSeA7HTZ7GE2/iuyguWuXv9OG1pobmKZ2F1MdschlYLMHkkt2AP//Z",
};

// ── Couleurs par prière ──
const COLORS = {
  Fajr: "#00AEEF",
  Dhuhr: "#FFD700",
  Asr: "#FFA500",
  Maghrib: "#FF4500",
  Isha: "#9B30FF",
};

// ── Son adhān ──
const ADHAN_RTTTL = "Pling:d=16,o=6,b=140:e6,32p,d6";

// ── Helper pour envoyer à Awtrix ──
async function awtrixSend(env, endpoint, payload) {
  const base = env.AWTRIX_BASE_URL;
  const auth = env.AWTRIX_BASIC_AUTH;

  const url = `${base}${endpoint}`;
  console.log(`DEBUG → POST ${url} | body: ${JSON.stringify(payload)}`);

  const res = await fetch(url, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${auth}`,
      "User-Agent": "Mozilla/5.0 (compatible; AwtrixSalat/1.0)",
      "Accept": "*/*",
    },
    body: JSON.stringify(payload),
  });

  if (res.status >= 300 && res.status < 400) {
    console.log(`REDIRECT ${res.status} → ${res.headers.get("location")}`);
  }

  const text = await res.text();
  console.log(`Awtrix ${endpoint} → ${res.status} | ${text}`);
  return res.ok;
}

// ── Récupère les horaires depuis mawaqit.net, avec cache KV jusqu'à minuit ──
async function fetchMawaqit(slug, kv) {
  const today = new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
  const cacheKey = `mawaqit:${slug}:${today}`;

  // Vérifie le cache
  if (kv) {
    const cached = await kv.get(cacheKey);
    if (cached) {
      console.log("[Cache] horaires depuis KV");
      return JSON.parse(cached);
    }
  }

  // Fetch mawaqit
  const res = await fetch(`https://mawaqit.net/fr/m/${slug}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AwtrixSalat/1.0)" },
  });
  if (!res.ok) throw new Error(`Mawaqit fetch error: ${res.status}`);
  const html = await res.text();

  const match = html.match(/confData\s*=\s*(\{.+\});/);
  if (!match) throw new Error("confData introuvable dans la page mawaqit");

  const conf = JSON.parse(match[1]);
  if (!conf.times || conf.times.length < 5) throw new Error("times manquant dans confData");

  // Calcule les secondes restantes jusqu'à minuit Paris
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const ttl = Math.floor((midnight - now) / 1000);

  // Stocke en KV jusqu'à minuit
  if (kv) await kv.put(cacheKey, JSON.stringify(conf.times), { expirationTtl: ttl });
  console.log(`[Cache] horaires fetchés depuis mawaqit, TTL ${ttl}s`);

  return conf.times;
}

async function handle(env) {
  if (!env.AWTRIX_BASE_URL) throw new Error("AWTRIX_BASE_URL non configuré");
  if (!env.AWTRIX_BASIC_AUTH) throw new Error("AWTRIX_BASIC_AUTH non configuré");

  const slug = env.MAWAQIT_SLUG || "ennour";

  // ── 1. Récupérer les horaires depuis mawaqit (avec cache KV) ──
  const times = await fetchMawaqit(slug, env.KV);
  const prayerNames = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const prayers = prayerNames.map((name, i) => ({
    name,
    time: times[i],
    color: COLORS[name],
    icon: ICONS[name],
  }));

  // ── 2. Heure actuelle (fuseau Paris) ──
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" })
  );

  // ── 3. Prochaine prière ──
  let nextPrayer = null;
  for (const p of prayers) {
    const [h, m] = p.time.split(":").map(Number);
    const pDate = new Date(now);
    pDate.setHours(h, m, 0, 0);
    if (pDate > now) {
      nextPrayer = { ...p, date: pDate };
      break;
    }
  }
  // Toutes passées → Fajr demain
  if (!nextPrayer) {
    const [h, m] = prayers[0].time.split(":").map(Number);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(h, m, 0, 0);
    nextPrayer = { ...prayers[0], date: tomorrow };
  }

  // ── 4. Countdown ──
  const diffMs = nextPrayer.date - now;
  const diffMin = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMin / 60);
  const minutes = diffMin % 60;

  const countdownText = hours > 0
    ? `${nextPrayer.name} ${nextPrayer.time} -${hours}h${String(minutes).padStart(2, "0")}`
    : `${nextPrayer.name} ${nextPrayer.time} -${minutes}min`;

  // ── 5. App : prochaine prière + countdown ──
  await awtrixSend(env, "/api/custom?name=salat_next", {
    text: countdownText,
    icon: nextPrayer.icon,
    color: nextPrayer.color,
    duration: 30,
    lifetime: 120,
    pushIcon: 2,
  });

  // ── 6. App : scroll toutes les prières ──
  const allText = prayers.map((p) => `${p.name} ${p.time}`).join("  ·  ");
  await awtrixSend(env, "/api/custom?name=salat_all", {
    text: allText,
    icon: prayers[1].icon, // icône Dhuhr (soleil) par défaut
    color: "#FFFFFF",
    scrollSpeed: 80,
    duration: 30,
    lifetime: 120,
  });

  // ── 7. Notification adhān si c'est l'heure (±1 min) ──
  let adhanTriggered = false;
  if (diffMin <= 1 && diffMin >= 0) {
    adhanTriggered = true;
    const holdVal = env.ADHAN_HOLD ?? "true";
    const adhanPayload = {
      text: `ADHAN ${nextPrayer.name}`,
      icon: nextPrayer.icon,
      color: "#FFFFFF",
      rtttl: ADHAN_RTTTL,
      repeat: 3,
    };
    if (holdVal === "true") {
      adhanPayload.hold = true;
    } else {
      adhanPayload.duration = parseInt(holdVal, 10);
    }
    await awtrixSend(env, "/api/notify", adhanPayload);
  }

  const log = {
    time: now.toLocaleTimeString("fr-FR"),
    next: `${nextPrayer.name} ${nextPrayer.time}`,
    countdown: `${hours}h${String(minutes).padStart(2, "0")}`,
    adhan: adhanTriggered,
  };
  console.log("[Salat]", JSON.stringify(log));
  return log;
}

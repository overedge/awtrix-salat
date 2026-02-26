# 🕌 awtrix-salat

> **T'as une matrice LED chez toi et t'oublies les prières ? Plus d'excuses.**

---

## C'est quoi ?

Un Cloudflare Worker qui tourne **toutes les minutes**, récupère les horaires de prière directement depuis **ta mosquée sur mawaqit.net**, et les balance sur une **Awtrix 3** (la petite matrice LED 32×8 pixels).

Résultat : t'as les horaires qui défilent sur ton bureau, et quand c'est l'heure — ça bipe.

---

## Ce que ça fait concrètement

### 🟦 App 1 — Prochaine prière
```
Maghrib 18:32 -2h20
```
Compte à rebours en temps réel. Icône et couleur changent selon la prière.

### 📜 App 2 — Toutes les prières du jour
```
Fajr 06:28  ·  Dhuhr 13:05  ·  Asr 15:56  ·  Maghrib 18:32  ·  Isha 20:02
```
Texte défilant, toujours visible.

### 🔔 Notification adhān
Quand c'est l'heure (à la minute près) :
- Notification prioritaire sur toute la matrice
- Son RTTTL qui sort du buzzer intégré
- Reste affiché jusqu'à ce que tu interagisses

---

## Stack

| Truc | Rôle |
|------|------|
| **Cloudflare Workers** | Cron toutes les minutes, zéro serveur |
| **Cloudflare KV** | Cache des horaires jusqu'à minuit (1 fetch/jour) |
| **mawaqit.net** | Horaires de ta mosquée, pas un calcul générique |
| **Awtrix 3** | La matrice LED sur ton bureau |
| **Freebox** | Expose l'Awtrix en HTTP depuis l'extérieur |

---

## Pourquoi mawaqit plutôt qu'une API de calcul ?

Parce que les horaires viennent **directement de ta mosquée**. Si l'imam ajuste l'heure de Fajr de 5 minutes pour le quartier, tu le récupères automatiquement. Pas besoin de configurer une méthode de calcul, une latitude, ou quoi que ce soit.

---

## Setup

### 1. Ce qu'il te faut
- Une [Awtrix 3](https://blueforcer.github.io/awtrix3/) (ESP32 + matrice 32×8)
- Un compte [Cloudflare](https://cloudflare.com) (gratuit)
- Node.js 20+

### 2. Clone & install
```bash
git clone https://github.com/overedge/awtrix-salat
cd awtrix-salat
npm install
```

### 3. Trouve le slug de ta mosquée

Va sur [mawaqit.net](https://mawaqit.net), cherche ta mosquée. Le slug c'est la dernière partie de l'URL :
```
https://mawaqit.net/fr/m/ennour
                          ^^^^^^ → slug = "ennour"
```

### 4. Configure `wrangler.toml`
```toml
[vars]
AWTRIX_BASE_URL = "http://ton-ip-ou-dns:4242"
MAWAQIT_SLUG    = "ennour"   # ← slug de ta mosquée

[[kv_namespaces]]
binding = "KV"
id      = "TON_ID_KV"        # ← généré à l'étape suivante
```

### 5. Crée le namespace KV
```bash
npx wrangler kv namespace create "KV"
# → copie l'id retourné dans wrangler.toml
```

### 6. Configure le secret auth
```bash
echo "base64(user:password)" | npx wrangler secret put AWTRIX_BASIC_AUTH
```

### 7. Deploy
```bash
npx wrangler deploy
```

C'est tout. Le cron démarre automatiquement.

---

## Comment tester sans attendre le cron

Le worker expose une URL HTTP qui déclenche exactement la même logique :

```bash
curl https://ton-worker.workers.dev
```

Réponse :
```json
{
  "status": "ok",
  "time": "16:11:09",
  "next": "Maghrib 18:32",
  "countdown": "2h20",
  "adhan": false
}
```

---

## Cache KV — comment ça marche

```
Minute 0    → pas de cache → fetch mawaqit.net → stocke en KV (TTL jusqu'à minuit)
Minute 1    → cache KV hit → 0 fetch externe
Minute 2    → cache KV hit → 0 fetch externe
...
Minuit      → cache expiré → nouveau fetch → nouveau TTL
```

**1 seul appel à mawaqit par jour** au lieu de 1440.

---

## Couleurs par prière

| Prière | Couleur | Vibe |
|--------|---------|------|
| Fajr | `#00AEEF` 🔵 | Aube, calme |
| Dhuhr | `#FFD700` 🟡 | Soleil à son zénith |
| Asr | `#FFA500` 🟠 | Après-midi dorée |
| Maghrib | `#FF4500` 🔴 | Coucher de soleil |
| Isha | `#9B30FF` 🟣 | Nuit tombée |

---

## Architecture

```
┌─────────────────────┐
│  Cloudflare Worker  │  ← cron * * * * *
│  (Edge, gratuit)    │
└────────┬────────────┘
         │                      ┌──────────────────┐
         ├── jour J, 1ère min → │  mawaqit.net     │
         │   fetch + mise       │  (ta mosquée)    │
         │   en cache KV        └──────────────────┘
         │
         │                      ┌──────────────────┐
         ├── autres minutes  → │  Cloudflare KV   │
         │   lecture cache      │  (cache/jour)    │
         │                      └──────────────────┘
         │
         │  POST /api/custom
         │  POST /api/notify
         ▼
┌─────────────────────┐
│     Ton routeur     │  ← ton-ip-ou-dns:4242
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│      Awtrix 3       │  ← ESP32 sur le bureau
│   32×8 LED matrix  │
└─────────────────────┘
```

---

## C'est gratuit ?

Oui, largement dans le free tier Cloudflare :

| Resource | Limite gratuite | Usage réel |
|----------|----------------|------------|
| Worker invocations | 100 000 / jour | 1 440 / jour |
| KV lectures | 100 000 / jour | ~1 439 / jour |
| KV écritures | 1 000 / jour | **1 / jour** |
| KV stockage | 1 GB | ~200 octets |

---

## Pourquoi Cloudflare et pas un Raspberry Pi ?

Parce que le Raspberry Pi finit toujours par crasher à 3h du matin.
Cloudflare Workers c'est **0€, 0 serveur, 0 maintenance**, et ça tourne dans 300 datacenters en même temps.

---

## Crédits & inspiration

- [Awtrix 3](https://blueforcer.github.io/awtrix3/) par Blueforcer
- [Mawaqit](https://mawaqit.net) — horaires de plus de 8000 mosquées
- Cloudflare Workers + KV — edge computing pour les pauvres (et les malins)
- [Une tasse de café — Awtrix 3 & Ulanzi sur Home Assistant](https://une-tasse-de.cafe/blog/awtrix3-ulanzi-home-assistant/) — le tuto qui a tout déclenché


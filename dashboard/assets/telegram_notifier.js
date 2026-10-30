/**
 * Módulo Cliente de Notificações Telegram — Vinheria Agnello (Grupo Admin Vinheira)
 * Envia avisos em tempo real via Telegram Bot API oficial diretamente do navegador
 * para o grupo "Admin Vinheira" (Chat ID: -5001665013).
 * Suporta alerta geral e notificação ao clicar em vinho específico da Cava.
 */
(function (root) {
  const DEFAULT_BOT_TOKEN = "8777267552:AAHG5UuhhjSk5Vionulj1wWuq1OWbyDzaww";
  const DEFAULT_CHAT_ID = "-5001665013";
  let lastSentMap = {};
  let lastWineSentMap = {};

  function cleanToken(t) {
    if (!t || typeof t !== "string") return DEFAULT_BOT_TOKEN;
    t = t.trim().replace(/^['"]|['"]$/g, "");
    if (!t.includes(":") || t.length < 25) return DEFAULT_BOT_TOKEN;
    return t;
  }

  function cleanChatId(c) {
    if (!c || typeof c !== "string") return DEFAULT_CHAT_ID;
    c = c.trim().replace(/^['"]|['"]$/g, "");
    if (!c || c === "null" || c === "undefined") return DEFAULT_CHAT_ID;
    return c;
  }

  function getStoredToken() {
    const raw = localStorage.getItem("vinheria_telegram_token");
    const tok = cleanToken(raw);
    if (raw !== tok) {
      try { localStorage.setItem("vinheria_telegram_token", tok); } catch (_) {}
    }
    return tok;
  }

  function getStoredChatId() {
    const raw = localStorage.getItem("vinheria_telegram_chat_id");
    const cid = cleanChatId(raw);
    if (raw !== cid) {
      try { localStorage.setItem("vinheria_telegram_chat_id", cid); } catch (_) {}
    }
    return cid;
  }

  function setCredentials(token, chatId) {
    if (token) localStorage.setItem("vinheria_telegram_token", cleanToken(token));
    if (chatId) localStorage.setItem("vinheria_telegram_chat_id", cleanChatId(chatId));
  }

  /**
   * Envio resiliente à API do Telegram:
   * 1. POST com JSON (suporta Markdown e mensagens longas)
   * 2. Fallback GET com URL params (sem preflight OPTIONS, contorna extensões e proxies)
   * 3. Fallback backend local APENAS em localhost (nunca em GitHub Pages, evitando 405)
   */
  async function dispatchToTelegram(messageText, customToastSuccess) {
    const token = getStoredToken();
    const chatId = getStoredChatId();
    let delivered = false;
    let lastErrorDesc = "";

    // 1. Envio Direto via POST (CORS habilitado pela API do Telegram)
    try {
      const postRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: "Markdown"
        })
      });
      const postJson = await postRes.json().catch(() => ({}));
      if (postRes.ok && postJson.ok) {
        delivered = true;
      } else {
        lastErrorDesc = postJson.description || `HTTP ${postRes.status}`;
      }
    } catch (e1) {
      lastErrorDesc = e1.message;
    }

    // 2. Fallback direto via GET com Query Parameters (evita preflight OPTIONS)
    if (!delivered) {
      try {
        const getUrl = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${encodeURIComponent(chatId)}&text=${encodeURIComponent(messageText)}&parse_mode=Markdown`;
        const getRes = await fetch(getUrl);
        const getJson = await getRes.json().catch(() => ({}));
        if (getRes.ok && getJson.ok) {
          delivered = true;
        } else {
          lastErrorDesc = getJson.description || lastErrorDesc;
        }
      } catch (e2) {
        lastErrorDesc = e2.message || lastErrorDesc;
      }
    }

    // 3. Fallback via backend Node.js local (APENAS se estiver rodando em localhost)
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!delivered && isLocalhost) {
      try {
        const localRes = await fetch("/api/v1/telegram/alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: messageText, chat_id: chatId })
        });
        if (localRes.ok) delivered = true;
      } catch (_) {}
    }

    if (delivered) {
      showTelegramToast(true, customToastSuccess || "✅ Mensagem enviada para o grupo Admin Vinheira no Telegram!");
      return { ok: true };
    } else {
      if (lastErrorDesc.includes("chat not found")) {
        showTelegramToast(false, `❌ Telegram: Grupo não encontrado (${chatId}). Verifique se o bot @vinheria_agnello_bot está no grupo.`);
      } else if (lastErrorDesc.includes("Unauthorized")) {
        localStorage.removeItem("vinheria_telegram_token");
        showTelegramToast(false, "❌ Token do Bot inválido. Clique com botão direito no botão Telegram para atualizar.");
      } else {
        showTelegramToast(false, `⚠️ Telegram: ${lastErrorDesc}`);
      }
      return { ok: false, error: lastErrorDesc };
    }
  }

  /**
   * Disparo ao clicar em um vinho específico na Cava (Ex: Château Margaux, Catena Zapata, Tignanello...)
   */
  async function sendWineSelectionNotification(lot, evalResult, activePreset) {
    if (!lot) return { ok: false };
    const now = Date.now();
    const lotCode = lot.code || "LOTE";

    // Anti-flood de 4 segundos por vinho específico para não sobrecarregar
    if (lastWineSentMap[lotCode] && (now - lastWineSentMap[lotCode] < 4000)) {
      showTelegramToast(true, `🍷 ${lot.winery} já notificado no Telegram!`);
      return { ok: true, throttled: true };
    }
    lastWineSentMap[lotCode] = now;

    const p = activePreset || (window.PRESETS && window.PRESETS[lot.style]) || {};
    const tMin = p.tMin ?? (lot.temp ? lot.temp[0] : 14.0);
    const tMax = p.tMax ?? (lot.temp ? lot.temp[1] : 18.0);
    const hMin = p.hMin ?? (lot.hum ? lot.hum[0] : 60.0);
    const hMax = p.hMax ?? (lot.hum ? lot.hum[1] : 75.0);
    const lMax = p.lMax ?? (lot.lum ?? 25.0);

    const ev = evalResult || { score: 100, verdict: "IDEAL", stateKey: "ideal" };
    const liveT = typeof lot.liveT === "number" ? lot.liveT.toFixed(1) : (lot.baseT || 15.6).toFixed(1);
    const liveH = Math.round(lot.liveH ?? lot.baseH ?? 68);
    const liveL = Math.round(lot.liveL ?? lot.baseL ?? 5);

    const ledTxt = ev.stateKey === "critico"
      ? "🔴 LED Vermelho (D18) ACESO + Buzzer (D4) Apitando"
      : (ev.stateKey === "padrao" ? "🟡 LED Amarelo (D2) ACESO" : "🟢 LED Verde (D5) ACESO");

    const message = `🍷 *SELEÇÃO DE VINHO NA ADEGA · VINHERIA AGNELLO*
━━━━━━━━━━━━━━━━━━━━━
🏷️ *Lote:* \`${lot.code}\`
🍇 *Vinho:* *${lot.winery} — ${lot.wine}*
✨ *Estilo:* ${lot.styleLabel || "Vinho Fino"} · Safra ${lot.vintage || 2020} ${lot.flag || "🍇"}
📍 *Terroir & Origem:* ${lot.region || "Cava"}, ${lot.country || "Mundo"}
🍇 *Casta / Varietal:* ${lot.casta || "Uvas Nobres"}
🪵 *Maturação / Estágio:* ${lot.barrel || "Carvalho Nobre"}
⏳ *Apogeu de Guarda:* ${lot.apogee || "Pronto para consumo"}

📊 *Condições Climáticas Monitoradas:*
🌡️ *Temperatura Atual:* \`${liveT}°C\` (Faixa Ideal: ${tMin}–${tMax}°C)
💧 *Umidade Atual:* \`${liveH}%\` (Faixa Ideal: ${hMin}–${hMax}%)
☀️ *Luminosidade:* \`${liveL}%\` (Limite Seguro: ≤${lMax}%)
🏆 *Índice de Preservação:* *${ev.score}%* (${ev.verdict || "IDEAL"})
📟 *Hardware Wokwi:* ${ledTxt}
━━━━━━━━━━━━━━━━━━━━━
📲 _Operador selecionou este exemplar no Dashboard SCADA_`;

    return await dispatchToTelegram(message, `🍷 ${lot.winery} selecionado! Ficha enviada ao Telegram.`);
  }

  function formatGeneralAlertMessage(data) {
    const terroir = data.terroir || "Adega Central";
    const country = data.country || "Brasil";
    const temp = Number(data.temp !== undefined ? data.temp : 15.8).toFixed(1);
    const hum = Math.round(data.hum !== undefined ? data.hum : 68);
    const lum = Math.round(data.lum !== undefined ? data.lum : 9);
    const score = Math.round(data.score !== undefined ? data.score : 100);
    const stateKey = data.stateKey || "normal";
    const style = (data.style || data.wine_style || "Tinto").toUpperCase();

    const isCrit = stateKey === "critico" || score < 75;
    const isPad = stateKey === "padrao" || (score >= 75 && score < 95);

    const header = isCrit
      ? "🚨 *ALERTA CRÍTICO — VINHERIA AGNELLO*"
      : (isPad ? "⚠️ *STATUS DE ATENÇÃO (PADRÃO) — VINHERIA AGNELLO*" : "🟢 *STATUS IDEAL — VINHERIA AGNELLO*");

    const ledStatus = isCrit
      ? "🔴 LED Vermelho (D18) ACESO + Buzzer (D4) Apitando"
      : (isPad ? "🟡 LED Amarelo (D2) ACESO" : "🟢 LED Verde (D5) ACESO");

    return `${header}
━━━━━━━━━━━━━━━━━━━━━
📍 *Cava / Terroir:* ${terroir} (${country})
🍷 *Estilo de Vinho:* ${style} · Saúde Enológica: *${score}%*

🌡️ *Temperatura:* \`${temp}°C\`
💧 *Umidade Relativa:* \`${hum}%\`
☀️ *Luminosidade:* \`${lum}%\`
📟 *Hardware ESP32:* ${ledStatus}

📝 *Diagnóstico:* ${data.details || (isCrit ? "Parâmetros fora da faixa aceitável!" : "Condições climáticas estabilizadas.")}
⏰ *Registro:* \`${new Date().toLocaleString("pt-BR")}\`
━━━━━━━━━━━━━━━━━━━━━
📲 _Notificação do Sistema SCADA Vinheria Agnello_`;
  }

  async function sendTelegramAlert(data = {}) {
    const terroir = data.terroir || "Adega Central";
    const now = Date.now();

    // Anti-flood de 6 segundos por terroir para alertas gerais (a menos que seja clique manual forçado)
    if (!data.force && lastSentMap[terroir] && (now - lastSentMap[terroir] < 6000)) {
      return { ok: true, throttled: true };
    }
    lastSentMap[terroir] = now;

    const messageText = formatGeneralAlertMessage(data);
    return await dispatchToTelegram(messageText);
  }

  function showTelegramToast(success, text) {
    let tBox = document.getElementById("telegram-live-toast");
    if (!tBox) {
      tBox = document.createElement("div");
      tBox.id = "telegram-live-toast";
      tBox.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:99999;padding:14px 20px;border-radius:12px;font-size:0.88rem;font-weight:600;box-shadow:0 12px 30px rgba(0,0,0,0.6);transition:all 0.3s ease;display:flex;align-items:center;gap:12px;max-width:440px;line-height:1.4;";
      document.body.appendChild(tBox);
    }
    tBox.style.background = success ? "#0c4a6e" : "#881337";
    tBox.style.color = "#ffffff";
    tBox.style.border = success ? "2px solid #38bdf8" : "2px solid #fb7185";
    tBox.innerHTML = `<span>${success ? "📲" : "⚠️"}</span><span>${text}</span>`;
    tBox.style.opacity = "1";
    tBox.style.transform = "translateY(0)";

    clearTimeout(tBox._timer);
    tBox._timer = setTimeout(() => {
      tBox.style.opacity = "0";
      tBox.style.transform = "translateY(20px)";
    }, 5500);
  }

  root.TelegramNotifier = {
    sendTelegramAlert,
    sendWineSelectionNotification,
    dispatchToTelegram,
    showTelegramToast,
    setCredentials,
    getStoredToken,
    getStoredChatId
  };

  // Clique com botão direito no botão Telegram para ver ou alterar credenciais
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btn-telegram-alert");
    if (btn) {
      btn.title = "Clique para enviar alerta ao Telegram | Botão direito para gerenciar Token/Chat ID";
      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const curTok = getStoredToken();
        const curChat = getStoredChatId();
        const newTok = prompt("⚙️ CONFIGURAR TOKEN DO BOT TELEGRAM:\n(Pressione OK para manter o bot oficial)", curTok);
        if (newTok !== null && newTok.trim()) localStorage.setItem("vinheria_telegram_token", newTok.trim());
        const newChat = prompt("⚙️ CONFIGURAR CHAT ID DO GRUPO:\n(Padrão oficial: -5001665013)", curChat);
        if (newChat !== null && newChat.trim()) localStorage.setItem("vinheria_telegram_chat_id", newChat.trim());
        showTelegramToast(true, "Configurações do Telegram salvas no navegador!");
      });
    }
  });
})(typeof window !== "undefined" ? window : globalThis);


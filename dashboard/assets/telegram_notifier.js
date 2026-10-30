/**
 * Módulo Cliente de Notificações Telegram — Vinheria Agnello (Grupo Admin Vinheira)
 * Envia avisos em tempo real via Telegram Bot API oficial diretamente do navegador
 * para o grupo "Admin Vinheira" (Chat ID: -5001665013 ou configurável).
 */
(function (root) {
  const DEFAULT_BOT_TOKEN = "8777267552:AAHG5UuhhjSk5Vionulj1wWuq1OWbyDzaww";
  const DEFAULT_CHAT_ID = "-5001665013";
  let lastSentMap = {};

  function getStoredToken() {
    return localStorage.getItem("vinheria_telegram_token") || DEFAULT_BOT_TOKEN;
  }

  function getStoredChatId() {
    return localStorage.getItem("vinheria_telegram_chat_id") || DEFAULT_CHAT_ID;
  }

  function setCredentials(token, chatId) {
    if (token) localStorage.setItem("vinheria_telegram_token", token.trim());
    if (chatId) localStorage.setItem("vinheria_telegram_chat_id", chatId.trim());
  }

  function formatTelegramMessage(data) {
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
📲 _Notificação automática da Cava Subterrânea_`;
  }

  async function sendTelegramAlert(data = {}) {
    let token = getStoredToken();
    let chatId = getStoredChatId();

    // Se ainda não houver token configurado, solicita ao usuário
    if (!token) {
      const input = prompt(
        "📲 CONFIGURAÇÃO DO BOT DO TELEGRAM\n\n" +
        "Para enviar alertas reais para o grupo Admin Vinheira, cole aqui o Token do seu Bot gerado pelo @BotFather:\n" +
        "(Exemplo: 7123456789:AAFn8xYz_AbcDeFgHiJkLmNoPqRsTuVwXyZ)\n\n" +
        "Caso ainda não tenha criado, abra o Telegram, digite /newbot no @BotFather e adicione o bot no grupo 'Admin Vinheira'.",
        ""
      );
      if (input && input.trim().length > 15) {
        token = input.trim();
        setCredentials(token, chatId);
        showTelegramToast(true, "Token do Telegram salvo com sucesso!");
      } else {
        showTelegramToast(false, "Token não configurado. Mensagem não enviada.");
        return { ok: false, error: "Sem token" };
      }
    }

    const terroir = data.terroir || "Adega Central";
    const stateKey = data.stateKey || "normal";
    const now = Date.now();

    // Anti-flood de 10 segundos por terroir (a menos que seja forçado por clique manual)
    if (!data.force && lastSentMap[terroir] && (now - lastSentMap[terroir] < 10000)) {
      return { ok: true, throttled: true };
    }
    lastSentMap[terroir] = now;

    const messageText = formatTelegramMessage(data);

    // 1. Tenta envio direto para a API oficial do Telegram (funciona na Nuvem, GitHub Pages e Local)
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: "Markdown"
        })
      });

      const resJson = await response.json().catch(() => ({}));

      if (response.ok && resJson.ok) {
        showTelegramToast(true, "✅ Mensagem enviada para o grupo Admin Vinheira no Telegram!");
        return { ok: true };
      } else {
        const desc = resJson.description || "Erro desconhecido";
        // Ajuda específica se o erro for chat_not_found ou bot não é membro
        if (desc.includes("chat not found")) {
          showTelegramToast(false, `❌ Telegram: Grupo não encontrado (${chatId}). Adicione o bot ao grupo e envie /start no grupo!`);
        } else if (desc.includes("Unauthorized")) {
          localStorage.removeItem("vinheria_telegram_token");
          showTelegramToast(false, "❌ Token do Bot inválido ou expirado. Clique novamente para inserir o token correto.");
        } else {
          showTelegramToast(false, `❌ Erro Telegram: ${desc}`);
        }
        return { ok: false, error: desc };
      }
    } catch (netErr) {
      // 2. Se houver falha de rede/CORS, tenta via proxy backend local
      try {
        const localRes = await fetch("/api/v1/telegram/alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            terroir: data.terroir,
            country: data.country,
            temp: data.temp,
            hum: data.hum,
            lum: data.lum,
            state_key: stateKey,
            score: data.score
          })
        });
        if (localRes.ok) {
          showTelegramToast(true, "✅ Alerta despachado pelo servidor local para o Telegram!");
          return { ok: true };
        }
      } catch (_) {}

      showTelegramToast(false, `Erro de rede ao contatar o Telegram: ${netErr.message}`);
      return { ok: false, error: netErr.message };
    }
  }

  function showTelegramToast(success, text) {
    let tBox = document.getElementById("telegram-live-toast");
    if (!tBox) {
      tBox = document.createElement("div");
      tBox.id = "telegram-live-toast";
      tBox.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:99999;padding:14px 20px;border-radius:12px;font-size:0.88rem;font-weight:600;box-shadow:0 12px 30px rgba(0,0,0,0.6);transition:all 0.3s ease;display:flex;align-items:center;gap:12px;max-width:420px;line-height:1.4;";
      document.body.appendChild(tBox);
    }
    tBox.style.background = success ? "#0369a1" : "#be123c";
    tBox.style.color = "#ffffff";
    tBox.style.border = success ? "2px solid #38bdf8" : "2px solid #fb7185";
    tBox.innerHTML = `<span>${success ? "📲" : "⚠️"}</span><span>${text}</span>`;
    tBox.style.opacity = "1";
    tBox.style.transform = "translateY(0)";

    setTimeout(() => {
      tBox.style.opacity = "0";
      tBox.style.transform = "translateY(20px)";
    }, 6000);
  }

  root.TelegramNotifier = {
    sendTelegramAlert,
    showTelegramToast,
    setCredentials,
    getStoredToken,
    getStoredChatId
  };

  // Permite clicar com botão direito para reconfigurar token e chat_id a qualquer momento
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btn-telegram-alert");
    if (btn) {
      btn.title = "Clique para notificar no Telegram | Clique com botão direito para configurar Bot Token";
      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const curTok = getStoredToken();
        const curChat = getStoredChatId();
        const newTok = prompt("⚙️ CONFIGURAR TOKEN DO BOT TELEGRAM:\n(Cole o token gerado pelo @BotFather)", curTok);
        if (newTok !== null && newTok.trim()) localStorage.setItem("vinheria_telegram_token", newTok.trim());
        const newChat = prompt("⚙️ CONFIGURAR CHAT ID DO GRUPO:\n(Ex: -5001665013 ou -100xxxxxxxxxx)", curChat);
        if (newChat !== null && newChat.trim()) localStorage.setItem("vinheria_telegram_chat_id", newChat.trim());
        showTelegramToast(true, "Configurações do Telegram salvas no navegador!");
      });
    }
  });
})(typeof window !== "undefined" ? window : globalThis);

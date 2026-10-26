// SCADA MQTT Transport — Ponte WebSocket Direta de Ultra-Baixa Latência (<20ms) Browser <-> Wokwi ESP32
(function () {
  let pahoClient = null;
  let isConnecting = false;
  let useSslMode = window.location.protocol === "https:";
  let onTelemetryCallback = null;
  let lastState = null;

  try {
    const saved = localStorage.getItem("vinheria_scada_state");
    if (saved) lastState = JSON.parse(saved);
  } catch (_) {}

  function sendPacket(topic, payload) {
    if (!pahoClient || !pahoClient.isConnected()) return false;
    try {
      const m = new Paho.MQTT.Message(payload);
      m.destinationName = topic;
      m.qos = 0;
      m.retained = false;
      pahoClient.send(m);
      return true;
    } catch (_) {
      return false;
    }
  }

  function flushState(st) {
    if (!st) return false;
    const t = typeof st.t === "number" ? st.t : 15.8;
    const h = typeof st.h === "number" ? st.h : 68.0;
    const l = typeof st.l === "number" ? st.l : 9.0;
    const cmd = st.cmd || "normal";
    const score = typeof st.score === "number" ? Math.round(st.score) : 100;
    const verdict = (st.verdict || "OK").toString().slice(0, 3).toUpperCase();
    const tag = (st.tag || "TINTO").toString().trim().toUpperCase().slice(0, 5);

    // Envia pacote atômico unificado compreendido nativamente pelo sketch.ino (cmd == "state")
    const okState = sendPacket(
      "/TEF/vine001/cmd",
      `vine001@state|${t.toFixed(1)}|${h.toFixed(1)}|${l.toFixed(1)}|${cmd}|${score}|${verdict}|${tag}`
    );
    return okState;
  }

  function initMqtt(onTelemetry) {
    if (onTelemetry) onTelemetryCallback = onTelemetry;
    if (pahoClient && pahoClient.isConnected()) return;
    if (isConnecting) return;
    if (typeof Paho === "undefined" || !Paho.MQTT) {
      setTimeout(() => initMqtt(onTelemetryCallback), 100);
      return;
    }
    isConnecting = true;
    const port = useSslMode ? 8884 : 8000;
    try {
      const clientId = "agnello_" + Math.random().toString(16).slice(2, 10);
      pahoClient = new Paho.MQTT.Client("broker.hivemq.com", port, "/mqtt", clientId);
      pahoClient.onConnectionLost = () => {
        isConnecting = false;
        pahoClient = null;
        setTimeout(() => initMqtt(onTelemetryCallback), 800);
      };
      pahoClient.onMessageArrived = (m) => {
        const topic = m.destinationName || "";
        const raw = m.payloadString || "";
        if (topic.endsWith("/cmdexe")) {
          const bge = document.getElementById("mqtt-cmd-badge");
          if (bge && lastState) {
            const stLbl = (lastState.stateKey || lastState.cmd || "IDEAL").toUpperCase();
            const tgLbl = (lastState.tag || "TINTO").toUpperCase();
            bge.innerHTML = `<span class="status-dot"></span>WOKWI SINCRONIZADO: ${stLbl} (${tgLbl})`;
          }
          return;
        }
        const p = raw.split("|");
        const data = {};
        for (let i = 0; i < p.length - 1; i += 2) {
          if (p[i] === "t") data.t = parseFloat(p[i + 1]);
          if (p[i] === "h") data.h = parseFloat(p[i + 1]);
          if (p[i] === "l") data.l = parseFloat(p[i + 1]);
          if (p[i] === "r") data.r = parseFloat(p[i + 1]);
        }
        if (onTelemetryCallback && data.r !== 1 && (data.t !== undefined || data.h !== undefined || data.l !== undefined)) {
          onTelemetryCallback(data);
        }
      };

      // Nota importante: Paho MQTT 1.0.1 NÃO aceita 'reconnect: true' em connectOptions (lança AMQJS0013E)
      pahoClient.connect({
        useSSL: useSslMode,
        timeout: 4,
        keepAliveInterval: 15,
        cleanSession: true,
        onSuccess: () => {
          isConnecting = false;
          try {
            pahoClient.subscribe("/TEF/vine001/attrs");
            pahoClient.subscribe("/TEF/vine001/cmdexe");
            if (lastState) flushState(lastState);
          } catch (_) {}
        },
        onFailure: () => {
          isConnecting = false;
          pahoClient = null;
          // Se estiver em HTTP/file:// e uma porta falhar, alterna entre 8884 (WSS) e 8000 (WS)
          if (window.location.protocol !== "https:") {
            useSslMode = !useSslMode;
          }
          setTimeout(() => initMqtt(onTelemetryCallback), 1000);
        }
      });
    } catch (_) {
      isConnecting = false;
      pahoClient = null;
    }
  }

  function publishScadaState(state) {
    lastState = { ...state, ts: Date.now() };
    try {
      localStorage.setItem("vinheria_scada_state", JSON.stringify(lastState));
    } catch (_) {}
    if (!flushState(lastState)) {
      initMqtt(onTelemetryCallback);
    }
  }

  // Sincroniza estado entre abas abertas (ex.: index.html <-> dashboard.html)
  window.addEventListener("storage", (e) => {
    if (e.key === "vinheria_scada_state" && e.newValue) {
      try {
        lastState = JSON.parse(e.newValue);
      } catch (_) {}
    }
  });

  // Keepalive a cada 2.5s apenas na aba visível para nunca haver conflito entre abas
  setInterval(() => {
    if (document.hidden) return;
    if (lastState && pahoClient && pahoClient.isConnected()) {
      flushState(lastState);
    }
  }, 2500);

  initMqtt();

  window.ScadaMQTT = {
    init: initMqtt,
    publish: sendPacket,
    publishState: publishScadaState,
    isConnected: () => !!(pahoClient && pahoClient.isConnected())
  };
})();

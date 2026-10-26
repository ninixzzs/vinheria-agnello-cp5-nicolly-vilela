/**
 * Catálogo Canônico de Lotes da Cava (12), Estilos de Vinho (8), Terroirs Globais (12)
 * e Cliente Bidirecional em Tempo Real com o Supabase Cloud — Vinheria Agnello
 */
(function () {
  const SUPABASE_URL = "https://slqozouuqzxwmfswyroo.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNscW96b3V1cXp4d21mc3d5cm9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDkxOTMsImV4cCI6MjEwNzc4NTE5M30.spwyPsi31yzG6rvh2FsSHWM8Fkv2CPLHpUx9Us8aRo4";

  const CANONICAL_LOTS = [
    { code: "LOTE-FR-MARGAUX-01", winery: "Château Margaux", wine: "Premier Grand Cru Classé", style: "tinto", styleLabel: "🍷 Tinto", terroirId: "fr_margaux", country: "França", flag: "🇫🇷", region: "Médoc, Bordeaux", vintage: 2015, barrel: "Carvalho Francês Allier (24m)", soil: "Cascalho & Calcário", apogee: "2025–2045", baseT: 15.8, baseH: 68.0, baseL: 9.0, liveT: 15.8, liveH: 68.0, liveL: 9.0, temp: [14.0, 18.0], hum: [60.0, 75.0], lum: 25.0 },
    { code: "LOTE-FR-BLANC-02", winery: "Château Margaux", wine: "Pavillon Blanc Sauvignon", style: "branco", styleLabel: "🥂 Branco", terroirId: "it_antinori", country: "Itália / França", flag: "🇮🇹", region: "Bordeaux / Toscana", vintage: 2020, barrel: "Carvalho Francês Neutro (8m)", soil: "Argilo-Calcário Fino", apogee: "2024–2033", baseT: 10.0, baseH: 68.0, baseL: 7.0, liveT: 10.0, liveH: 68.0, liveL: 7.0, temp: [8.0, 12.0], hum: [60.0, 75.0], lum: 15.0 },
    { code: "LOTE-FR-ROSE-03", winery: "Domaine Ott", wine: "Château de Selle Rosé", style: "rose", styleLabel: "🌸 Rosé", terroirId: "cl_concha", country: "Chile / França", flag: "🇨🇱", region: "Provence / Maipo", vintage: 2022, barrel: "Inox & Carvalho Neutro (6m)", soil: "Calcário & Xisto", apogee: "2024–2029", baseT: 11.5, baseH: 67.0, baseL: 6.0, liveT: 11.5, liveH: 67.0, liveL: 6.0, temp: [10.0, 13.0], hum: [60.0, 75.0], lum: 12.0 },
    { code: "LOTE-RU-ABRAU-04", winery: "Abrau-Durso", wine: "Imperial Brut Vintage", style: "espumante", styleLabel: "🍾 Brut", terroirId: "ru_abrau", country: "Rússia", flag: "🇷🇺", region: "Mar Negro / Krasnodar", vintage: 2018, barrel: "Túneis Subterrâneos (36m)", soil: "Calcário Fóssil", apogee: "2023–2031", baseT: 7.5, baseH: 72.0, baseL: 5.0, liveT: 7.5, liveH: 72.0, liveL: 5.0, temp: [6.0, 9.0], hum: [65.0, 80.0], lum: 10.0 },
    { code: "LOTE-FR-DRC-05", winery: "Domaine Romanée-Conti", wine: "La Tâche Grand Cru Monopole", style: "pinot", styleLabel: "🍒 Pinot Noir", terroirId: "us_opus", country: "França / EUA", flag: "🍒", region: "Borgonha / Napa", vintage: 2018, barrel: "Carvalho Tronçais (18m)", soil: "Margas Calcárias", apogee: "2026–2048", baseT: 13.4, baseH: 70.0, baseL: 8.0, liveT: 13.4, liveH: 70.0, liveL: 8.0, temp: [12.0, 15.0], hum: [65.0, 75.0], lum: 15.0 },
    { code: "LOTE-PT-PORTO-06", winery: "Taylor's & Quinta Crasto", wine: "Vintage Port Reserva", style: "porto", styleLabel: "🏺 Porto", terroirId: "pt_crasto", country: "Portugal", flag: "🇵🇹", region: "Vale do Douro", vintage: 2016, barrel: "Tonel de Carvalho (24m)", soil: "Xisto Pré-Cambriano", apogee: "2026–2060", baseT: 16.4, baseH: 69.0, baseL: 10.0, liveT: 16.4, liveH: 69.0, liveL: 10.0, temp: [15.0, 18.0], hum: [65.0, 75.0], lum: 20.0 },
    { code: "LOTE-DE-PRUM-07", winery: "Château d'Yquem & Prüm", wine: "Sauternes Colheita Tardia", style: "sobremesa", styleLabel: "🍯 Colheita", terroirId: "de_prum", country: "Alemanha / França", flag: "🇩🇪", region: "Mosel / Sauternes", vintage: 2019, barrel: "Barricas Novas (30m)", soil: "Ardósia Azul & Argila", apogee: "2025–2055", baseT: 10.4, baseH: 72.0, baseL: 6.0, liveT: 10.4, liveH: 72.0, liveL: 6.0, temp: [9.0, 12.0], hum: [65.0, 78.0], lum: 12.0 },
    { code: "LOTE-IT-GRAVNER-08", winery: "Josko Gravner", wine: "Ribolla Gialla Ânfora", style: "laranja", styleLabel: "🍊 Laranja", terroirId: "es_vega", country: "Espanha / Itália", flag: "🇪🇸", region: "Ribera / Friuli", vintage: 2017, barrel: "Ânforas Georgianas Qvevri", soil: "Marga Eocênica", apogee: "2024–2038", baseT: 12.6, baseH: 66.0, baseL: 8.0, liveT: 12.6, liveH: 66.0, liveL: 8.0, temp: [11.0, 14.0], hum: [60.0, 72.0], lum: 15.0 },
    { code: "LOTE-ES-VEGA-09", winery: "Vega Sicilia", wine: "Único Gran Reserva", style: "tinto", styleLabel: "🍷 Tinto", terroirId: "za_kanonkop", country: "África do Sul / Espanha", flag: "🇿🇦", region: "Stellenbosch / Duero", vintage: 2014, barrel: "Carvalho Americano & Francês", soil: "Aluvial & Calcário", apogee: "2025–2046", baseT: 16.0, baseH: 68.0, baseL: 10.0, liveT: 16.0, liveH: 68.0, liveL: 10.0, temp: [14.0, 18.0], hum: [60.0, 75.0], lum: 25.0 },
    { code: "LOTE-NZ-CLOUDY-10", winery: "Cloudy Bay", wine: "Te Koko Sauvignon Blanc", style: "branco", styleLabel: "🥂 Branco", terroirId: "nz_cloudy", country: "Nova Zelândia", flag: "🇳🇿", region: "Marlborough", vintage: 2021, barrel: "Foudres Franceses", soil: "Cascalho Fluvial", apogee: "2024–2032", baseT: 10.2, baseH: 68.0, baseL: 8.0, liveT: 10.2, liveH: 68.0, liveL: 8.0, temp: [8.0, 12.0], hum: [60.0, 75.0], lum: 15.0 },
    { code: "LOTE-BR-MIOLO-11", winery: "Vinícola Miolo", wine: "Cuvée Giuseppe Rosé", style: "rose", styleLabel: "🌸 Rosé", terroirId: "br_miolo", country: "Brasil", flag: "🇧🇷", region: "Vale dos Vinhedos (RS)", vintage: 2022, barrel: "Inox Climatizado (6m)", soil: "Basáltico-Argiloso", apogee: "2024–2028", baseT: 11.4, baseH: 67.0, baseL: 7.0, liveT: 11.4, liveH: 67.0, liveL: 7.0, temp: [10.0, 13.0], hum: [60.0, 75.0], lum: 12.0 },
    { code: "LOTE-AR-CATENA-12", winery: "Catena Zapata", wine: "Nicolás Catena Brut Nature", style: "espumante", styleLabel: "🍾 Brut", terroirId: "ar_catena", country: "Argentina", flag: "🇦🇷", region: "Gualtallary, Mendoza", vintage: 2018, barrel: "Pupitres Andinos (24m)", soil: "Aluvial Andino", apogee: "2025–2036", baseT: 7.6, baseH: 72.0, baseL: 5.0, liveT: 7.6, liveH: 72.0, liveL: 5.0, temp: [6.0, 9.0], hum: [65.0, 80.0], lum: 10.0 }
  ];

  const PRESETS = {
    tinto: { key: "tinto", name: "Vinho Tinto", badge: "🍷 TINTO GRAND CRU", casta: "Cabernet Sauvignon · Merlot · Tempranillo", wine: "Château Margaux 2015", defaultLot: "LOTE-FR-MARGAUX-01", defaultTerroir: "fr_margaux", color: "#ef4444", tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25, defT: 15.8, defH: 68, defL: 9, desc: "Maturação de tintos encorpados (14–18°C | 60–75% UR | ≤25% Luz): polimerização de taninos e evolução nobre." },
    branco: { key: "branco", name: "Vinho Branco", badge: "🥂 BRANCO RESERVA", casta: "Chardonnay · Sauvignon Blanc", wine: "Pavillon Blanc Sauvignon 2020", defaultLot: "LOTE-FR-BLANC-02", defaultTerroir: "it_antinori", color: "#eab308", tMin: 8, tMax: 12, hMin: 60, hMax: 75, lMin: 0, lMax: 15, defT: 10.0, defH: 68, defL: 7, desc: "Preservação de brancos aromáticos (8–12°C | 60–75% UR | ≤15% Luz): frescor cítrico, acidez viva e proteção UV." },
    rose: { key: "rose", name: "Vinho Rosé", badge: "🌸 ROSÉ DE PROVENCE", casta: "Grenache · Cinsault · Syrah", wine: "Domaine Ott Rosé 2022", defaultLot: "LOTE-FR-ROSE-03", defaultTerroir: "cl_concha", color: "#ec4899", tMin: 10, tMax: 13, hMin: 60, hMax: 75, lMin: 0, lMax: 12, defT: 11.5, defH: 67, defL: 6, desc: "Conservação de rosés finos (10–13°C | 60–75% UR | ≤12% Luz): notas florais intactas e penumbra rigorosa." },
    espumante: { key: "espumante", name: "Espumante Brut", badge: "🍾 ESPUMANTE BRUT", casta: "Chardonnay · Pinot Noir (Champenoise)", wine: "Abrau-Durso Imperial Brut 2018", defaultLot: "LOTE-RU-ABRAU-04", defaultTerroir: "ru_abrau", color: "#38bdf8", tMin: 6, tMax: 9, hMin: 65, hMax: 80, lMin: 0, lMax: 10, defT: 7.5, defH: 72, defL: 5, desc: "Guarda de espumantes Brut (6–9°C | 65–80% UR | ≤10% Luz): pressão interna de CO₂, perlage fino e rolha elástica." },
    pinot: { key: "pinot", name: "Pinot Noir", badge: "🍒 PINOT NOIR BORGONHA", casta: "Pinot Noir · Gamay Cru", wine: "Domaine Romanée-Conti La Tâche 2018", defaultLot: "LOTE-FR-DRC-05", defaultTerroir: "us_opus", color: "#f43f5e", tMin: 12, tMax: 15, hMin: 65, hMax: 75, lMin: 0, lMax: 15, defT: 13.4, defH: 70, defL: 8, desc: "Guarda delicada de Pinot Noir (12–15°C | 65–75% UR | ≤15% Luz): proteção de aromas terciários de trufa e cereja." },
    porto: { key: "porto", name: "Vinho do Porto", badge: "🏺 PORTO VINTAGE", casta: "Touriga Nacional · Touriga Franca · Tinta Roriz", wine: "Taylor's Vintage Port 2016", defaultLot: "LOTE-PT-PORTO-06", defaultTerroir: "pt_crasto", color: "#991b1b", tMin: 15, tMax: 18, hMin: 65, hMax: 75, lMin: 0, lMax: 20, defT: 16.4, defH: 69, defL: 10, desc: "Longevidade secular de fortificados do Douro (15–18°C | 65–75% UR | ≤20% Luz): estabilidade alcoólica e taninos." },
    sobremesa: { key: "sobremesa", name: "Colheita Tardia", badge: "🍯 COLHEITA TARDIA", casta: "Sémillon · Sauvignon Blanc · Riesling Auslese", wine: "Château d'Yquem Sauternes 2019", defaultLot: "LOTE-DE-PRUM-07", defaultTerroir: "de_prum", color: "#f59e0b", tMin: 9, tMax: 12, hMin: 65, hMax: 78, lMin: 0, lMax: 12, defT: 10.4, defH: 72, defL: 6, desc: "Preservação de vinhos nobres de sobremesa (9–12°C | 65–78% UR | ≤12% Luz): equilíbrio entre doçura botritizada e acidez." },
    laranja: { key: "laranja", name: "Vinho Laranja", badge: "🍊 LARANJA DE ÂNFORA", casta: "Ribolla Gialla · Rkatsiteli (Qvevri)", wine: "Josko Gravner Ribolla Ânfora 2017", defaultLot: "LOTE-IT-GRAVNER-08", defaultTerroir: "es_vega", color: "#ea580c", tMin: 11, tMax: 14, hMin: 60, hMax: 72, lMin: 0, lMax: 15, defT: 12.6, defH: 66, defL: 8, desc: "Afinação em ânfora de terracota (11–14°C | 60–72% UR | ≤15% Luz): preservação fenólica e textura gastronômica." }
  };

  const TERROIRS = {
    fr_margaux: { id: "fr_margaux", name: "Château Margaux", reg: "Bordeaux", flag: "🇫🇷", country: "França", style: "tinto", lotCode: "LOTE-FR-MARGAUX-01", lat: 45.0444, lon: -0.6686, baseT: 15.8, baseH: 68, baseL: 9, t: 15.8, h: 68, l: 9 },
    it_antinori: { id: "it_antinori", name: "Marchesi Antinori", reg: "Toscana", flag: "🇮🇹", country: "Itália", style: "branco", lotCode: "LOTE-FR-BLANC-02", lat: 43.6158, lon: 11.2136, baseT: 10.2, baseH: 68, baseL: 7, t: 10.2, h: 68, l: 7 },
    cl_concha: { id: "cl_concha", name: "Concha y Toro", reg: "Vale do Maipo", flag: "🇨🇱", country: "Chile", style: "rose", lotCode: "LOTE-FR-ROSE-03", lat: -33.6433, lon: -70.5789, baseT: 11.5, baseH: 67, baseL: 6, t: 11.5, h: 67, l: 6 },
    ru_abrau: { id: "ru_abrau", name: "Abrau-Durso", reg: "Mar Negro", flag: "🇷🇺", country: "Rússia", style: "espumante", lotCode: "LOTE-RU-ABRAU-04", lat: 44.7000, lon: 37.6000, baseT: 7.5, baseH: 72, baseL: 5, t: 7.5, h: 72, l: 5 },
    pt_crasto: { id: "pt_crasto", name: "Quinta do Crasto", reg: "Vale do Douro", flag: "🇵🇹", country: "Portugal", style: "porto", lotCode: "LOTE-PT-PORTO-06", lat: 41.1681, lon: -7.6308, baseT: 16.4, baseH: 69, baseL: 10, t: 16.4, h: 69, l: 10 },
    us_opus: { id: "us_opus", name: "Opus One", reg: "Napa Valley", flag: "🇺🇸", country: "EUA", style: "pinot", lotCode: "LOTE-FR-DRC-05", lat: 38.4367, lon: -122.4017, baseT: 13.4, baseH: 70, baseL: 8, t: 13.4, h: 70, l: 8 },
    de_prum: { id: "de_prum", name: "Joh. Jos. Prüm", reg: "Vale do Mosel", flag: "🇩🇪", country: "Alemanha", style: "sobremesa", lotCode: "LOTE-DE-PRUM-07", lat: 49.9189, lon: 7.0394, baseT: 10.4, baseH: 72, baseL: 6, t: 10.4, h: 72, l: 6 },
    es_vega: { id: "es_vega", name: "Vega Sicilia", reg: "Ribera del Duero", flag: "🇪🇸", country: "Espanha", style: "laranja", lotCode: "LOTE-IT-GRAVNER-08", lat: 41.6322, lon: -4.2981, baseT: 12.6, baseH: 66, baseL: 8, t: 12.6, h: 66, l: 8 },
    nz_cloudy: { id: "nz_cloudy", name: "Cloudy Bay", reg: "Marlborough", flag: "🇳🇿", country: "Nova Zelândia", style: "branco", lotCode: "LOTE-NZ-CLOUDY-10", lat: -41.4914, lon: 173.9619, baseT: 10.2, baseH: 68, baseL: 8, t: 10.2, h: 68, l: 8 },
    za_kanonkop: { id: "za_kanonkop", name: "Kanonkop Estate", reg: "Stellenbosch", flag: "🇿🇦", country: "África do Sul", style: "tinto", lotCode: "LOTE-ES-VEGA-09", lat: -33.8569, lon: 18.8669, baseT: 16.0, baseH: 68, baseL: 10, t: 16.0, h: 68, l: 10 },
    br_miolo: { id: "br_miolo", name: "Vinícola Miolo", reg: "Serra Gaúcha", flag: "🇧🇷", country: "Brasil", style: "rose", lotCode: "LOTE-BR-MIOLO-11", lat: -29.1864, lon: -51.5567, baseT: 11.4, baseH: 67, baseL: 7, t: 11.4, h: 67, l: 7 },
    ar_catena: { id: "ar_catena", name: "Catena Zapata", reg: "Mendoza", flag: "🇦🇷", country: "Argentina", style: "espumante", lotCode: "LOTE-AR-CATENA-12", lat: -33.1667, lon: -68.9167, baseT: 7.6, baseH: 72, baseL: 5, t: 7.6, h: 72, l: 5 },
    wokwi_esp32: { id: "wokwi_esp32", name: "ESP32 Wokwi", reg: "HiveMQ :1883", flag: "📟", country: "Wokwi", style: "tinto", lotCode: "LOTE-FR-MARGAUX-01", lat: 0, lon: 0, baseT: 15.8, baseH: 68, baseL: 9, t: 15.8, h: 68, l: 9 }
  };

  // Cliente REST Bidirecional para o Supabase Cloud (PostgreSQL PostgREST)
  let lastSupaTelemetryTs = 0;
  let lastSupaBulkTs = 0;
  let supaConnected = false;

  function supaHeaders(prefer = "return=minimal") {
    return {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": prefer
    };
  }

  function updateSupabaseBadgeUI(ok, detail = "") {
    supaConnected = ok;
    const el = document.getElementById("supabase-sync-pill");
    if (el) {
      el.className = ok
        ? "status-pill status-pill-live text-decoration-none"
        : "status-pill text-decoration-none";
      el.innerHTML = `<span class="status-dot ${ok ? "status-dot-live" : ""}"></span><span>Supabase SQL: ${ok ? ("SYNC" + (detail ? " · " + detail : "")) : "CONECTANDO..."}</span>`;
    }
  }

  function syncTelemetryToSupabase({ t = 15.8, h = 68, l = 9, cmd = "normal", score = 100, source = "SCADA Web & Wokwi", force = false } = {}) {
    const now = Date.now();
    if (!force && now - lastSupaTelemetryTs < 5000) return;
    lastSupaTelemetryTs = now;
    fetch(`${SUPABASE_URL}/rest/v1/vine_telemetry`, {
      method: "POST",
      headers: supaHeaders("return=minimal"),
      body: JSON.stringify({
        device_id: "vine001",
        temperature: +Number(t).toFixed(2),
        humidity: +Number(h).toFixed(2),
        luminosity: +Number(l).toFixed(2),
        alert_mode: cmd || "normal",
        cellar_health_score: Math.round(score || 100),
        source: source
      })
    }).then(r => {
      if (r.ok) updateSupabaseBadgeUI(true, `${Number(t).toFixed(1)}°C`);
    }).catch(() => {});
  }

  function syncLotsAndAreasToSupabase(activeWineKey = "tinto", force = false) {
    const now = Date.now();
    if (!force && now - lastSupaBulkTs < 15000) return;
    lastSupaBulkTs = now;

    // 1. Upsert de todos os 8 presets de Trigger (estilos de vinho)
    const triggerRows = Object.values(PRESETS).map(pr => ({
      preset_key: pr.key,
      name: pr.name,
      description: pr.desc,
      temp_min: pr.tMin,
      temp_max: pr.tMax,
      hum_min: pr.hMin,
      hum_max: pr.hMax,
      lum_min: pr.lMin || 0,
      lum_max: pr.lMax,
      updated_at: new Date().toISOString()
    }));
    fetch(`${SUPABASE_URL}/rest/v1/vine_trigger_configs`, {
      method: "POST",
      headers: supaHeaders("resolution=merge-duplicates,return=minimal"),
      body: JSON.stringify(triggerRows)
    }).then(r => {
      if (r.ok) updateSupabaseBadgeUI(true, (PRESETS[activeWineKey]?.name || "Ativo"));
    }).catch(() => {});

    // 2. Upsert em lote das 12 Áreas / Terroirs Globais
    const terroirRows = Object.values(TERROIRS).filter(v => v.id !== "wokwi_esp32").map(v => {
      const rh = Math.max(1, Math.min(100, v.h || 68));
      const a = ((17.27 * v.t) / (237.7 + v.t)) + Math.log(rh / 100);
      const dew = +((237.7 * a) / (17.27 - a)).toFixed(2);
      return {
        vineyard_id: v.id,
        name: v.name,
        region: v.reg,
        country: v.country,
        latitude: v.lat,
        longitude: v.lon,
        temperature_c: +Number(v.t).toFixed(2),
        humidity_pct: +Number(v.h).toFixed(2),
        luminosity_pct: +Number(v.l).toFixed(2),
        solar_wm2: +(Number(v.l) * 10).toFixed(1),
        dew_point_c: dew,
        is_day: true,
        local_time: v.local_time || new Date().toLocaleTimeString().slice(0, 5),
        updated_at: new Date().toISOString()
      };
    });
    fetch(`${SUPABASE_URL}/rest/v1/real_vineyards_status`, {
      method: "POST",
      headers: supaHeaders("resolution=merge-duplicates,return=minimal"),
      body: JSON.stringify(terroirRows)
    }).catch(() => {});

    // 3. Upsert em lote dos 12 Lotes de Cava com avaliação em tempo real
    const lotRows = CANONICAL_LOTS.map(lot => {
      const ev = window.evaluateLotPreservation ? window.evaluateLotPreservation(lot, lot.liveT, lot.liveH, lot.liveL) : { score: 100, verdict: "IDEAL (95–100%)" };
      return {
        lot_code: lot.code,
        winery_name: lot.winery,
        wine_name: lot.wine,
        style: lot.style,
        country: lot.country,
        region: lot.region,
        vintage: lot.vintage,
        bottling_date: `${lot.vintage + 2}-06`,
        expiration_date: lot.apogee,
        barrel_type: lot.barrel,
        soil_type: lot.soil,
        target_temp_min: lot.temp[0],
        target_temp_max: lot.temp[1],
        target_hum_min: lot.hum[0],
        target_hum_max: lot.hum[1],
        target_lum_max: lot.lum,
        health_score: ev.score,
        verdict: ev.verdict,
        updated_at: new Date().toISOString()
      };
    });
    fetch(`${SUPABASE_URL}/rest/v1/cellar_lots`, {
      method: "POST",
      headers: supaHeaders("resolution=merge-duplicates,return=minimal"),
      body: JSON.stringify(lotRows)
    }).catch(() => {});
  }

  async function fetchLiveFromSupabase() {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/vine_devices?select=device_id,entity_name,wokwi_project_url&limit=1`, {
        headers: supaHeaders("return=representation")
      });
      if (r.ok) {
        updateSupabaseBadgeUI(true, "PostgreSQL 17");
        return await r.json();
      }
    } catch (_) {}
    return null;
  }

  window.CANONICAL_LOTS = CANONICAL_LOTS;
  window.PRESETS = PRESETS;
  window.TERROIRS = TERROIRS;
  window.SupabaseCloud = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    isConnected: () => supaConnected,
    syncTelemetry: syncTelemetryToSupabase,
    syncLotsAndAreas: syncLotsAndAreasToSupabase,
    fetchLive: fetchLiveFromSupabase
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => fetchLiveFromSupabase());
  } else {
    fetchLiveFromSupabase();
  }
})();

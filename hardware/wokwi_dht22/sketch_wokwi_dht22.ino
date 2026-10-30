// ============================================================================
// CP5 VINHERIA AGNELLO — ESP32 SOMMELIER IOT & SUPABASE CLOUD ENGINE
// Monitoramento Inteligente de Adegas e Cavas Subterraneas (FIAP - Check Point 5)
// Equipe: Ken Kobayashi, Nicolly Vilela (RM 573392), Brenda Condori (RM 571971),
//         Samuel Etcheverry (RM 573715), Diego Jimenez (RM 571015)
// ============================================================================

#include <WiFi.h>
#include <Wire.h>
#include <math.h>
#include "wine_presets.h"
#include "supabase_client.h"

// --- Credenciais Wi-Fi e Cloud ---
const char *WIFI_SSID = "Wokwi-GUEST";
const char *WIFI_PASS = "";
const char *SUPABASE_URL = "https://slqozouuqzxwmfswyroo.supabase.co";
const char *SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNscW96b3V1cXp4d21mc3d5cm9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDkxOTMsImV4cCI6MjEwNzc4NTE5M30.spwyPsi31yzG6rvh2FsSHWM8Fkv2CPLHpUx9Us8aRo4";
const char *DEVICE_ID = "vine001";
const char *MQTT_BROKER = "broker.hivemq.com";
const int   MQTT_PORT = 1883;

// --- Mapeamento de Pinos (Conforme diagram.json e bancada fisica) ---
enum Pins {
  PIN_LED_YELLOW = 2,   // LED Amarelo (Estado Padrao / Alerta)
  PIN_BUZZER     = 4,   // Buzzer piezoeletrico (Alarme Critico)
  PIN_LED_GREEN  = 5,   // LED Verde (Estado Normal / Ideal)
  PIN_DHT        = 15,  // Sensor DHT22 / DHT11 (Temperatura e Umidade)
  PIN_LED_RED    = 18,  // LED Vermelho (Estado Critico / Fora dos Limites)
  PIN_SDA        = 21,  // I2C SDA (Display LCD 16x2)
  PIN_SCL        = 22,  // I2C SCL (Display LCD 16x2)
  PIN_LDR        = 34   // Sensor LDR Luminosidade (ADC1 canal 6)
};

// --- Variaveis de Estado ---
WiFiClient espClient;
String curMode   = "normal";  // "normal", "padrao", "critico"
String curPreset = "TINTO";   // TINTO, BRANC, ROSE, BRUT, PINOT, PORTO, DOCE, LARAN
int    curHealth = 100;
bool   remoteSyncActive = false;

// Telemetria
float validTemp = 15.8f;
float validHum  = 68.0f;
float validLum  = 9.0f;
float hwTemp    = 15.8f;
float hwHum     = 68.0f;
float hwLum     = 9.0f;

// Controle de tempo (100% nao-bloqueante)
unsigned long lastDhtMs     = 0;
unsigned long lastLdrMs     = 0;
unsigned long lastPubMs     = 0;
unsigned long lastSupaMs    = 0;
unsigned long lastLcdMs     = 0;
unsigned long lastPingMs    = 0;
unsigned long lastRetryMs   = 0;
unsigned long lastBuzzerMs  = 0;

// Estado de atuadores
bool buzzerActive    = false;
bool buzzerBeepState = false;

// I2C LCD Auto-detect (0x27 ou 0x3F)
uint8_t lcdAddr  = 0x27;
bool    lcdFound = false;

// ============================================================================
// DRIVER I2C LCD 16x2 (Auto-detectavel e protegido contra travamentos)
// ============================================================================
void lcdExpWrite(uint8_t d) {
  if (!lcdFound) return;
  Wire.beginTransmission(lcdAddr);
  Wire.write(d | 0x08); // Backlight ON
  Wire.endTransmission();
}

void lcdWrite4(uint8_t v) {
  if (!lcdFound) return;
  lcdExpWrite(v);
  lcdExpWrite(v | 0x04); // EN = 1
  delayMicroseconds(2);
  lcdExpWrite(v & ~0x04); // EN = 0
  delayMicroseconds(40);
}

void lcdSend(uint8_t v, uint8_t m) {
  if (!lcdFound) return;
  lcdWrite4((v & 0xF0) | m);
  lcdWrite4(((v << 4) & 0xF0) | m);
}

void initLcdAuto() {
  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setTimeOut(25); // Timeout de 25ms para evitar qualquer hang
  Wire.setClock(100000); // 100 kHz padrao estavel
  delay(50);

  // Auto-scan no barramento I2C
  uint8_t testAddrs[2] = {0x27, 0x3F};
  for (int i = 0; i < 2; i++) {
    Wire.beginTransmission(testAddrs[i]);
    if (Wire.endTransmission() == 0) {
      lcdAddr = testAddrs[i];
      lcdFound = true;
      break;
    }
  }

  if (!lcdFound) {
    Serial.println(F("[I2C] Display LCD 16x2 nao detectado (0x27/0x3F). Modo seguro ativado."));
    return;
  }

  Serial.printf("[I2C] LCD 16x2 detectado com sucesso no endereco 0x%02X\n", lcdAddr);
  delay(20);
  lcdExpWrite(0x00);
  delay(15);
  lcdWrite4(0x30); delayMicroseconds(4500);
  lcdWrite4(0x30); delayMicroseconds(4500);
  lcdWrite4(0x30); delayMicroseconds(150);
  lcdWrite4(0x20); delayMicroseconds(150);
  lcdSend(0x28, 0); // 4-bit, 2 linhas, 5x8
  lcdSend(0x0C, 0); // Display ON, Cursor OFF
  lcdSend(0x06, 0); // Auto-increment
  lcdSend(0x01, 0); // Clear display
  delay(3);
}

void updateLcd() {
  if (!lcdFound) return;

  // Linha 1: T:15.5*C U:68% *
  lcdSend(0x80, 0);
  String tStr = "T:" + String(validTemp, 1) + (char)223 + "C U:" + String((int)validHum) + "%" + (remoteSyncActive ? "*" : " ");
  while (tStr.length() < 16) tStr += " ";
  for (int i = 0; i < 16; i++) lcdSend((uint8_t)tStr[i], 1);

  // Linha 2: L:9% TINT OK:100% ou PAD:85% ou CRT:25%
  lcdSend(0xC0, 0);
  String statTag = (curMode == "critico") ? "CRT:" : ((curMode == "padrao") ? "PAD:" : "OK:");
  String tag = curPreset.substring(0, 4);
  while (tag.length() < 4) tag += " ";
  String bStr = "L:" + String((int)validLum) + "% " + tag + " " + statTag + String(curHealth) + "%";
  while (bStr.length() < 16) bStr += " ";
  for (int i = 0; i < 16; i++) lcdSend((uint8_t)bStr[i], 1);
}

// ============================================================================
// ATUADORES: CONTROLE INSTANTANEO E SEGURO DOS LEDS E BUZZER
// ============================================================================
void updateActuators() {
  if (curMode == "normal") {
    // Modo Normal / Ideal: LED Verde ACESO, Amarelo e Vermelho APAGADOS, Buzzer SILENCIOSO
    digitalWrite(PIN_LED_GREEN, HIGH);
    digitalWrite(PIN_LED_YELLOW, LOW);
    digitalWrite(PIN_LED_RED, LOW);
    if (buzzerActive) {
      noTone(PIN_BUZZER);
      buzzerActive = false;
      buzzerBeepState = false;
    }
  } else if (curMode == "padrao") {
    // Modo Padrao / Alerta (1 desvio): LED Amarelo ACESO, Verde e Vermelho APAGADOS
    digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_LED_YELLOW, HIGH);
    digitalWrite(PIN_LED_RED, LOW);
    if (buzzerActive) {
      noTone(PIN_BUZZER);
      buzzerActive = false;
      buzzerBeepState = false;
    }
  } else {
    // Modo Critico (Fora dos limites): LED Vermelho ACESO, Verde e Amarelo APAGADOS
    digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_LED_YELLOW, LOW);
    digitalWrite(PIN_LED_RED, HIGH);

    // Alarme sonoro pulsante nao-bloqueante (250ms ligado / 250ms desligado)
    unsigned long now = millis();
    if (now - lastBuzzerMs >= 250) {
      lastBuzzerMs = now;
      buzzerBeepState = !buzzerBeepState;
      if (buzzerBeepState) {
        tone(PIN_BUZZER, 1200); // 1200 Hz nítido
        buzzerActive = true;
      } else {
        noTone(PIN_BUZZER);
      }
    }
  }
}

void selfTestLedsAndBuzzer() {
  // Teste visual rapido na inicializacao (Verde -> Amarelo -> Vermelho -> Buzzer)
  digitalWrite(PIN_LED_GREEN, HIGH);
  tone(PIN_BUZZER, 880, 80);
  delay(100);
  digitalWrite(PIN_LED_GREEN, LOW);

  digitalWrite(PIN_LED_YELLOW, HIGH);
  tone(PIN_BUZZER, 1040, 80);
  delay(100);
  digitalWrite(PIN_LED_YELLOW, LOW);

  digitalWrite(PIN_LED_RED, HIGH);
  tone(PIN_BUZZER, 1318, 80);
  delay(100);
  digitalWrite(PIN_LED_RED, LOW);
  noTone(PIN_BUZZER);

  // Retorna para o estado normal inicial
  digitalWrite(PIN_LED_GREEN, HIGH);
}

// ============================================================================
// LOGICA ENOLOGICA E TROCA DE PRESETS DE VINHO
// ============================================================================
void setWinePreset(String newPreset) {
  newPreset.trim();
  newPreset.toUpperCase();
  if (newPreset.length() == 0) return;

  // Normaliza o preset recebido
  if (newPreset.indexOf("BRANC") != -1) curPreset = "BRANC";
  else if (newPreset.indexOf("ROSE") != -1) curPreset = "ROSE";
  else if (newPreset.indexOf("BRUT") != -1 || newPreset.indexOf("ESPUM") != -1) curPreset = "BRUT";
  else if (newPreset.indexOf("PINOT") != -1) curPreset = "PINOT";
  else if (newPreset.indexOf("PORTO") != -1) curPreset = "PORTO";
  else if (newPreset.indexOf("DOCE") != -1 || newPreset.indexOf("SOBRE") != -1 || newPreset.indexOf("COLH") != -1) curPreset = "DOCE";
  else if (newPreset.indexOf("LARAN") != -1) curPreset = "LARAN";
  else curPreset = "TINTO";

  // Reavalia imediatamente com a temperatura e umidade atuais
  evaluateWineStatus(validTemp, validHum, validLum, curPreset, curMode, curHealth);
  updateActuators();
  updateLcd();

  Serial.printf("[PRESET] Vinho alterado para: %s | Modo: %s | Saude: %d%%\n",
                curPreset.c_str(), curMode.c_str(), curHealth);
}

// ============================================================================
// LEITURA ROBUSTA DE SENSORES (DHT11 / DHT22 + LDR)
// ============================================================================
bool readDhtSensor(float &tOut, float &hOut) {
  uint8_t d[5] = {0, 0, 0, 0, 0};

  pinMode(PIN_DHT, OUTPUT);
  digitalWrite(PIN_DHT, LOW);
  delay(18); // 18ms garante compatibilidade com DHT11 e DHT22
  digitalWrite(PIN_DHT, HIGH);
  delayMicroseconds(30);
  pinMode(PIN_DHT, INPUT_PULLUP);

  unsigned long t0 = micros();
  while (digitalRead(PIN_DHT) == HIGH) { if (micros() - t0 > 120) return false; }
  t0 = micros();
  while (digitalRead(PIN_DHT) == LOW)  { if (micros() - t0 > 120) return false; }
  t0 = micros();
  while (digitalRead(PIN_DHT) == HIGH) { if (micros() - t0 > 120) return false; }

  for (int i = 0; i < 40; i++) {
    t0 = micros();
    while (digitalRead(PIN_DHT) == LOW) { if (micros() - t0 > 120) return false; }
    unsigned long pulseStart = micros();
    while (digitalRead(PIN_DHT) == HIGH) { if (micros() - pulseStart > 130) return false; }
    if ((micros() - pulseStart) > 40) {
      d[i / 8] |= (1 << (7 - (i % 8)));
    }
  }

  // Verificacao de checksum
  if (((d[0] + d[1] + d[2] + d[3]) & 0xFF) != d[4] || (d[0] == 0 && d[2] == 0)) {
    return false;
  }

  float h = 0.0f, t = 0.0f;
  if (d[1] == 0 && d[3] == 0) {
    // Formato DHT11 (inteiro)
    h = (float)d[0];
    t = (float)d[2];
  } else {
    // Formato DHT22 (16 bits decimal)
    h = ((uint16_t)(d[0] << 8) | d[1]) * 0.1f;
    t = ((uint16_t)((d[2] & 0x7F) << 8) | d[3]) * 0.1f;
    if (d[2] & 0x80) t = -t;
  }

  if (isnan(t) || isnan(h) || t < -40.0f || t > 80.0f || h < 0.0f || h > 100.0f) {
    return false;
  }

  tOut = t;
  hOut = h;
  return true;
}

// ============================================================================
// COMUNICACAO MQTT (HiveMQ / FIWARE UltraLight 2.0)
// ============================================================================
void mqttPub(const char* top, const String &pl) {
  if (!espClient.connected()) return;
  uint16_t tl = strlen(top), plLen = pl.length();
  uint32_t rem = 2 + tl + plLen;
  espClient.write((uint8_t)0x30); // MQTT PUBLISH
  do {
    uint8_t enc = rem % 128; rem /= 128;
    if (rem > 0) enc |= 128;
    espClient.write(enc);
  } while (rem > 0);
  espClient.write((uint8_t)(tl >> 8));
  espClient.write((uint8_t)(tl & 0xFF));
  espClient.print(top);
  espClient.print(pl);
}

void checkMqtt() {
  if (WiFi.status() != WL_CONNECTED || espClient.connected()) return;
  unsigned long now = millis();
  if (now - lastRetryMs < 3000) return;
  lastRetryMs = now;

  if (!espClient.connect(MQTT_BROKER, MQTT_PORT)) return;

  // Envia CONNECT
  String cid = "esp32_v_" + String(random(10000, 99999));
  uint16_t cLen = cid.length();
  uint8_t hdr[12] = {0x10, (uint8_t)(12 + cLen), 0x00, 0x04, 'M', 'Q', 'T', 'T', 0x04, 0x02, 0x00, 0x1E};
  espClient.write(hdr, 12);
  espClient.write((uint8_t)(cLen >> 8));
  espClient.write((uint8_t)(cLen & 0xFF));
  espClient.print(cid);

  // Aguarda CONNACK
  unsigned long t0 = millis();
  while (espClient.available() < 4 && (millis() - t0) < 600) yield();
  for (int i = 0; i < 4 && espClient.available(); i++) espClient.read();

  // Envia SUBSCRIBE ao topico de comandos
  const char* cmdTop = "/TEF/vine001/cmd";
  uint8_t pkt[6] = {0x82, (uint8_t)(5 + strlen(cmdTop)), 0x00, 0x01, 0x00, (uint8_t)strlen(cmdTop)};
  espClient.write(pkt, 6);
  espClient.print(cmdTop);
  espClient.write((uint8_t)0x00);

  Serial.println(F("[MQTT] Conectado e inscrito em /TEF/vine001/cmd"));
}

void parseCommand(const String& raw) {
  String msg = raw;
  msg.trim();
  if (msg.length() == 0) return;

  // 1. Comando 'diag': vine001@diag|modo|saude|veredicto|PRESET
  if (msg.indexOf("diag|") != -1) {
    String s = msg.substring(msg.indexOf("diag|") + 5);
    int p1 = s.indexOf('|');
    if (p1 != -1) {
      String newMode = s.substring(0, p1);
      int p2 = s.indexOf('|', p1 + 1);
      int p3 = (p2 != -1) ? s.indexOf('|', p2 + 1) : -1;
      int newHealth = (p2 != -1) ? s.substring(p1 + 1, p2).toInt() : 100;
      if (p3 != -1) {
        String pStr = s.substring(p3 + 1);
        pStr.trim();
        pStr.toUpperCase();
        if (pStr.length() > 0) curPreset = pStr.substring(0, 5);
      }
      curMode = newMode;
      curHealth = newHealth;
      remoteSyncActive = true;
      updateActuators();
      updateLcd();
      mqttPub("/TEF/vine001/cmdexe", "diag|OK");
      Serial.printf("[CMD] Diag recebido -> Modo: %s, Saude: %d%%, Preset: %s\n",
                    curMode.c_str(), curHealth, curPreset.c_str());
    }
  }
  // 2. Comando 'preset': vine001@preset|BRANC ou preset|TINTO
  else if (msg.indexOf("preset|") != -1) {
    String pStr = msg.substring(msg.indexOf("preset|") + 7);
    setWinePreset(pStr);
    mqttPub("/TEF/vine001/cmdexe", "preset|OK");
  }
  // 3. Comando 'sync': vine001@sync|temp|hum|lum
  else if (msg.indexOf("sync|") != -1) {
    String s = msg.substring(msg.indexOf("sync|") + 5);
    int p1 = s.indexOf('|');
    int p2 = (p1 != -1) ? s.indexOf('|', p1 + 1) : -1;
    if (p1 != -1 && p2 != -1) {
      validTemp = s.substring(0, p1).toFloat();
      validHum  = s.substring(p1 + 1, p2).toFloat();
      validLum  = s.substring(p2 + 1).toFloat();
      remoteSyncActive = true;
      evaluateWineStatus(validTemp, validHum, validLum, curPreset, curMode, curHealth);
      updateActuators();
      updateLcd();
      mqttPub("/TEF/vine001/cmdexe", "sync|OK");
    }
  }
  // 4. Comandos diretos de preset via Serial (ex: "BRANCO", "TINTO", "ROSE")
  else if (msg.equalsIgnoreCase("TINTO") || msg.equalsIgnoreCase("BRANCO") || msg.equalsIgnoreCase("BRANC") ||
           msg.equalsIgnoreCase("ROSE")  || msg.equalsIgnoreCase("BRUT")   || msg.equalsIgnoreCase("PINOT")  ||
           msg.equalsIgnoreCase("PORTO") || msg.equalsIgnoreCase("DOCE")   || msg.equalsIgnoreCase("LARANJA")) {
    setWinePreset(msg);
  }
  // 5. Comandos de teste de cenario (ex: "NORMAL", "PADRAO", "CRITICO")
  else if (msg.equalsIgnoreCase("NORMAL")) {
    curMode = "normal"; curHealth = 100; updateActuators(); updateLcd();
  } else if (msg.equalsIgnoreCase("PADRAO")) {
    curMode = "padrao"; curHealth = 85; updateActuators(); updateLcd();
  } else if (msg.equalsIgnoreCase("CRITICO")) {
    curMode = "critico"; curHealth = 35; updateActuators(); updateLcd();
  }
}

void mqttLoop() {
  if (!espClient.connected()) return;

  // Ping a cada 8 segundos para manter conexao TCP ativa
  if (millis() - lastPingMs > 8000) {
    lastPingMs = millis();
    uint8_t p[2] = {0xC0, 0x00};
    espClient.write(p, 2);
  }

  while (espClient.available() >= 2) {
    uint8_t hdr = espClient.read();
    uint8_t enc = 0;
    uint32_t rem = 0, mult = 1;

    do {
      if (!espClient.available()) return;
      enc = espClient.read();
      rem += (enc & 127) * mult;
      mult *= 128;
    } while ((enc & 128) != 0);

    // Buffer de recepcao com protecao de timeout contra fragmentacao TCP
    uint8_t pkt[256];
    uint16_t idx = 0;
    unsigned long waitStart = millis();

    while (idx < rem && idx < 255) {
      if (espClient.available()) {
        pkt[idx++] = espClient.read();
      } else if (millis() - waitStart > 60) {
        break; // Timeout de 60ms
      } else {
        delayMicroseconds(200);
      }
    }
    pkt[idx] = 0;

    // Se for um pacote PUBLISH (0x30)
    if ((hdr & 0xF0) == 0x30 && idx > 2) {
      uint16_t tl = ((uint16_t)pkt[0] << 8) | pkt[1];
      if (idx >= (uint16_t)(2 + tl)) {
        String msg = String((char*)(pkt + 2 + tl));
        parseCommand(msg);
      }
    }
  }
}

// ============================================================================
// LOOP PRINCIPAL E LEITURA PERIODICA
// ============================================================================
void readAndPublishSensors() {
  unsigned long now = millis();

  // Leitura periodica do DHT (a cada 1.2s)
  if (now - lastDhtMs >= 1200) {
    lastDhtMs = now;
    float t = hwTemp, h = hwHum;
    if (readDhtSensor(t, h)) {
      bool changed = (fabs(t - hwTemp) >= 0.4f) || (fabs(h - hwHum) >= 2.0f);
      hwTemp = t;
      hwHum  = h;
      if (changed || !remoteSyncActive) {
        validTemp = hwTemp;
        validHum  = hwHum;
        evaluateWineStatus(validTemp, validHum, validLum, curPreset, curMode, curHealth);
        updateActuators();
        updateLcd();
      }
    }
  }

  // Leitura suave do LDR (a cada 150ms)
  if (now - lastLdrMs >= 150) {
    lastLdrMs = now;
    int rawLdr = analogRead(PIN_LDR);
    float rl = map(rawLdr, 0, 4095, 100, 0);
    if (rl >= 0.0f && rl <= 100.0f) {
      hwLum = (hwLum * 0.75f) + (rl * 0.25f);
      if (!remoteSyncActive) validLum = hwLum;
    }
  }

  // Publicacao de Telemetria MQTT (UltraLight 2.0) a cada 2.0 segundos
  if (now - lastPubMs >= 2000) {
    lastPubMs = now;
    String payload = "t|" + String(validTemp, 1) + "|h|" + String(validHum, 1) + "|l|" + String(validLum, 1);
    mqttPub("/TEF/vine001/attrs", payload);
  }

  // Atualizacao periodica do LCD a cada 1.5s
  if (now - lastLcdMs >= 1500) {
    lastLcdMs = now;
    updateLcd();
  }

  // Envio de telemetria ao Supabase PostgreSQL a cada 25 segundos
  if (now - lastSupaMs >= 25000) {
    lastSupaMs = now;
    if (WiFi.status() == WL_CONNECTED) {
      postTelemetryToSupabase(SUPABASE_URL, SUPABASE_KEY, DEVICE_ID,
                             validTemp, validHum, validLum, curMode, curHealth, curPreset);
    }
  }
}

// Leitura de comandos via Monitor Serial (Bancada USB)
void checkSerialCommands() {
  if (!Serial.available()) return;
  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line.length() > 0) {
    Serial.printf("[SERIAL] Comando digitado: %s\n", line.c_str());
    parseCommand(line);
  }
}

// ============================================================================
// SETUP & LOOP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println(F("\n========================================================"));
  Serial.println(F("  VINHERIA AGNELLO — CP5 FIRMWARE EMBARCADO ESP32"));
  Serial.println(F("========================================================"));

  // Configura pinos de saida e entrada
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LDR, INPUT);

  // Inicializa LCD I2C com auto-scan
  initLcdAuto();

  // Teste de inicializacao dos atuadores
  selfTestLedsAndBuzzer();
  updateLcd();

  // Inicializacao da conexao Wi-Fi (nao-bloqueante: espera no maximo 3.0s)
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print(F("[WIFI] Conectando a "));
  Serial.println(WIFI_SSID);

  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - t0) < 3000) {
    delay(100);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WIFI] Conectado! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println(F("\n[WIFI] Nao conectado (operando em modo offline / Wokwi local)."));
  }
}

void loop() {
  checkMqtt();
  mqttLoop();
  checkSerialCommands();
  updateActuators();
  readAndPublishSensors();
  delay(2); // Cede tempo para os processos do FreeRTOS / ESP32 Core
}

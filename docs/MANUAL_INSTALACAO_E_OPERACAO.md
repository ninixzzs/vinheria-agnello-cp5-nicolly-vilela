# 🛠️ Manual Completo de Instalação e Operação (Hardware & Software)

Este documento detalha o procedimento passo a passo para montagem física em laboratório (Hands-on), simulação no **Wokwi**, configuração do back-end **FIWARE** e operação do **Dashboard Dinâmico Web**.

---

## 1. Manual de Hardware (ESP32 + Sensores + Atuadores)

### 1.1 Lista de Componentes (BOM)
| Qtd | Componente | Especificação / Função |
| :-: | :--- | :--- |
| 1 | **ESP32 DevKit V1** | Microcontrolador Wi-Fi Dual-Core (30 ou 38 pinos) |
| 1 | **Sensor DHT-11** *(ou DHT-22)* | Medição de Temperatura (°C) e Umidade Relativa (%) no pino `GPIO 15` |
| 1 | **Sensor LDR (Fotoresistor)** | Medição de Luminosidade ambiente da adega no pino `GPIO 34` |
| 1 | **Display LCD 16x2 I2C** | Display alfanumérico (Auto-detecta endereços `0x27` e `0x3F` nos pinos SDA `GPIO 21` e SCL `GPIO 22`) |
| 1 | **LED Verde + Resistor 220 Ω** | Indicador visual de Estado Ideal / Normal (`GPIO 5`) |
| 1 | **LED Amarelo + Resistor 220 Ω** | Indicador visual de Atenção / Padrão (`GPIO 2`) |
| 1 | **LED Vermelho + Resistor 220 Ω** | Indicador visual de Estado Crítico / Anomalia Térmica (`GPIO 18`) |
| 1 | **Buzzer (Passivo ou Ativo)** | Emissão de alerta sonoro não-bloqueante no estado crítico (`GPIO 4`) |
| 1 | **Protoboard + Jumpers Fêmea-Fêmea / Macho-Fêmea** | Conexões físicas dos sensores e atuadores aos pinos do ESP32 |

---

### 1.2 Tabela Oficial de Pinagem (Pinout ESP32)

| Componente | Pino do Componente | Pino no ESP32 | Observação Técnica |
| :--- | :--- | :---: | :--- |
| **DHT-11 / DHT-22** | `VCC` (`+`) | `3V3` | Alimentação 3.3V |
| **DHT-11 / DHT-22** | `DATA` / `SDA` | **`GPIO 15`** (`D15`) | Sinal digital de Temperatura e Umidade (pulso de 18ms auto-compatível) |
| **DHT-11 / DHT-22** | `GND` (`-`) | `GND` | Terra comum |
| **Módulo LDR** | `VCC` | `3V3` | Alimentação 3.3V |
| **Módulo LDR** | `AO` (Saída Analógica) | **`GPIO 34`** (`D34`) | Canal `ADC1_CH6` (estável, sem interferência de Wi-Fi) |
| **Módulo LDR** | `GND` | `GND` | Terra comum |
| **Display LCD 16x2 I2C** | `VCC` | `VIN` ou `5V` (ou `3V3`) | Alimentação |
| **Display LCD 16x2 I2C** | `GND` | `GND` | Terra comum |
| **Display LCD 16x2 I2C** | `SDA` | **`GPIO 21`** (`D21`) | Dados I2C (auto-detecta `0x27` e `0x3F`) |
| **Display LCD 16x2 I2C** | `SCL` | **`GPIO 22`** (`D22`) | Clock I2C com timeout de segurança |
| **LED Verde** | Anodo (`+`) / Resistor | **`GPIO 5`** (`D5`) | Indica Estado Ideal (Normal) |
| **LED Verde** | Catodo (`-`) | `GND` | Terra comum |
| **LED Amarelo** | Anodo (`+`) / Resistor | **`GPIO 2`** (`D2`) | Indica Estado de Atenção / Padrão (1 desvio) |
| **LED Amarelo** | Catodo (`-`) | `GND` | Terra comum |
| **LED Vermelho** | Anodo (`+`) / Resistor | **`GPIO 18`** (`D18`) | Indica Estado Crítico (parâmetros fora da faixa) |
| **LED Vermelho** | Catodo (`-`) | `GND` | Terra comum |
| **Buzzer** | Pino Positivo (`+` / `S`) | **`GPIO 4`** (`D4`) | Alarme sonoro pulsante não-bloqueante no Crítico |
| **Buzzer** | Pino Negativo (`-`) | `GND` | Terra comum |

> [!IMPORTANT]
> **Por que usar o `GPIO 34` para o LDR?** No ESP32, os pinos do conversor `ADC2` entram em conflito quando o rádio Wi-Fi está ligado. O pino `GPIO 34` pertence ao `ADC1`, garantindo leituras analógicas estáveis de luminosidade durante a transmissão MQTT.

---

### 1.3 Como Executar a Simulação no Wokwi (DHT-22 + LDR + Buzzer)
1. Acesse o projeto oficial no Wokwi: **[https://wokwi.com/projects/478106752109243393](https://wokwi.com/projects/478106752109243393)**.
2. Na aba `sketch.ino`, está configurado o código [`sketch.ino`](../sketch.ino) (compilação nativa sem dependência de bibliotecas externas).
3. Na aba `diagram.json`, está configurado o circuito completo [`diagram.json`](../diagram.json).
4. Clique em **Start the Simulation** (ícone Play verde) para iniciar a transmissão em tempo real para o Dashboard.

---

### 1.4 Como Gravar no ESP32 Físico (Hands-on de Bancada)
1. Abra a **Arduino IDE 1.8.x ou 2.x** e selecione a placa **DOIT ESP32 DEVKIT V1** (ou **ESP32 Dev Module**).
2. **Sem necessidade de instalar bibliotecas extras**: o [`sketch.ino`](../sketch.ino) utiliza as bibliotecas nativas do próprio Core ESP32 (`WiFi.h`, `Wire.h`, `HTTPClient.h`), compilando de primeira sem erros de dependência.
3. Conecte o ESP32 ao computador pelo cabo micro-USB.
4. Em *Ferramentas -> Porta*, selecione a porta serial correta (geralmente `COM3`, `COM4` ou similar, nunca `COM1`).
5. Clique em **Carregar / Upload** (ícone de seta).
6. ⚠️ **Dica Crítica para Evitar o Erro `Write timeout`**: Quando o console da Arduino IDE exibir `Connecting........_____`, aperte e segure o botão **BOOT** (ou `IO0`) na placa do ESP32 por 2 segundos até começar a contagem de gravação em porcentagem (`Writing at 0x... (10 %)`). Em seguida, solte o botão.
7. Abra o **Serial Monitor** em `115200 baud`. Você verá o diagnóstico de inicialização, detecção do LCD e leituras dos sensores em tempo real. Você também pode digitar comandos diretamente no monitor serial (como `BRANCO`, `TINTO`, `ROSE`, `NORMAL`, `PADRAO`, `CRITICO`) para testar os LEDs e o Buzzer na bancada!

---

## 2. Manual de Software (FIWARE & Dashboard Web)

### 2.1 Pré-Requisitos e Instalação do Dashboard
1. Certifique-se de possuir **Python 3.10+** instalado.
2. No terminal, navegue até a pasta `dashboard/` e instale as dependências listadas no `requirements.txt`:
   ```bash
   cd dashboard
   pip install -r requirements.txt
   ```
3. Para validar os testes automatizados (TDD) da solução:
   ```bash
   pytest tests -v
   ```

### 2.2 Inicialização do Servidor Dashboard
Execute o arquivo principal:
```bash
python app.py
```
O servidor iniciará com *Hot-Reload* ativo no endereço:
👉 **`http://127.0.0.1:8050`**

---

### 2.3 Guia de Operação do Dashboard no Hands-on
1. **Conexão FIWARE**: No topo do painel, informe o **Host / IP do FIWARE** (ex.: `20.206.204.100` ou `localhost`), o **Entity ID** (`urn:ngsi-ld:Vine:001`) e a quantidade de amostras históricas (`lastN`).
2. **Cadastro de IoT Devices (Porta 4041)**:
   - No cartão **Cadastro e Gerenciamento de IoT Devices**, preencha o `Device ID` (`vine001`), `Entity Name` (`urn:ngsi-ld:Vine:001`), `Type` (`Vine`) e `API Key` (`TEF`).
   - Clique em **➕ Cadastrar Device + Subscrição STH-Comet**. O sistema provisionará automaticamente o Service Group, o dispositivo com os atributos `t`, `h`, `l` e o comando remoto `alert`, além de registrar a subscrição histórica na porta `8666` do STH-Comet.
3. **Seleção de Presets de Vinho e Ajuste de Triggers**:
   - Escolha um preset no seletor **Diferencial: Presets Inteligentes por Tipo de Vinho** (*Tinto*, *Branco*, *Espumante* ou *Cave de Envelhecimento*) ou ajuste manualmente os valores **Mín / Máx** de Temperatura, Umidade e Luminosidade.
4. **Verificação de Anomalias e Acionamento Remoto (LED Azul + Buzzer)**:
   - Sempre que qualquer leitura sair da faixa definida nos Triggers, o Front-end envia automaticamente um `PATCH` ao Orion Context Broker (`:1026`), que repassa o comando via MQTT (`/TEF/vine001/cmd`) ao ESP32:
     - **`alert|temp`** → LED Azul piscando + **Buzzer Tipo 1** (Bips agudos rápidos de `2000 Hz`).
     - **`alert|hum`** → LED Azul piscando + **Buzzer Tipo 2** (Pulsos graves de `850 Hz`).
     - **`alert|lum`** → LED Azul piscando + **Buzzer Tipo 3** (Sirene alternada `1200 Hz / 1700 Hz`).
     - **`alert|multi`** → LED Azul piscando rápido + **Buzzer Tipo 4** (Escala tripla `1000 / 1800 / 2500 Hz`).
     - **`alert|normal`** → Quando os parâmetros retornam à faixa ideal, o Front-end envia `alert|normal`, desligando o LED Azul e silenciando o Buzzer imediatamente.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { market, tf, mode } = req.body;

  const chileStocks = ['CHILE','BCI','BSANTANDER','CENCOSUD','CCU','VAPORES','CMPC','COPEC','ENELAM','ENELCHILE','FALABELLA','LTM','PARAUCO','RIPLEY','SQM-B'];
  const usStocks = ['#AAPL','#MSFT','#NVDA','#AMZN','#GOOGL','#META','#TSLA','#AMD','#NFLX','#JPM','#BAC','#GS','#V','#MA','#XOM','#CVX','#WMT','#DIS','#BABA','#PYPL','#CRM','#INTC','#ORCL','#UBER','#COIN','#ROKU','#SHOP','#SNAP'];

  let universoActivos = '';
  if (market === 'Acciones Chile') {
    universoActivos = `SOLO acciones chilenas disponibles en Capitaria (bolsa de Santiago, CFDs MT5): ${chileStocks.join(', ')}. Busca precio en vivo de las más líquidas (FALABELLA, COPEC, SQM-B, CMPC, CHILE) y elige la de mejor setup técnico.`;
  } else if (market === 'Acciones USA') {
    universoActivos = `SOLO acciones USA disponibles en Capitaria (CFDs MT5): ${usStocks.join(', ')}. Busca precio en vivo de las más líquidas y elige la de mejor setup técnico.`;
  } else if (market === 'Todos') {
    universoActivos = `Forex (EUR/USD, GBP/USD, USD/JPY, GBP/JPY, EUR/JPY), Índices (NAS100, SPX500, DAX, WS30), Commodities (XAUUSD, XAGUSD, BRENT, WTI), Crypto (BTCUSD, ETHUSD), Acciones USA líquidas (#AAPL, #NVDA, #TSLA, #META, #MSFT), Acciones Chile (FALABELLA, COPEC, SQM-B, CMPC).`;
  } else if (market === 'Forex') {
    universoActivos = `Forex: EUR/USD, GBP/USD, USD/JPY, GBP/JPY, EUR/JPY, USD/CHF, AUD/USD, NZD/USD, USD/CAD.`;
  } else if (market === 'Índices') {
    universoActivos = `Índices: NAS100, SPX500, DAX, WS30, CAC, FTSE.`;
  } else if (market === 'Commodities') {
    universoActivos = `Commodities: XAUUSD (oro), XAGUSD (plata), BRENT, WTI (petróleo).`;
  } else if (market === 'Crypto') {
    universoActivos = `Crypto: BTCUSD, ETHUSD, SOLUSD, ADAUSD, DOGEUSD.`;
  }

  const prompt = `Eres un trader técnico avanzado para Capitaria Chile (CFDs en MT5).

MISIÓN: Genera la mejor señal de trading disponible AHORA usando precio en vivo verificado.

Preferencias del usuario:
- Mercado: ${market || 'Todos'}
- Timeframe preferido: ${tf || 'Auto'}
- Modo: ${mode || 'Auto (mejor setup)'}

UNIVERSO DE ACTIVOS DISPONIBLES EN CAPITARIA:
${universoActivos}

INSTRUCCIONES ESTRICTAS:
1. Busca el precio en vivo del activo que elijas (usa web search).
2. Elige el mejor setup técnico disponible en este momento DENTRO del universo indicado arriba.
3. Aplica análisis multiframe: EMA 20/50/200, RSI(14), MACD, Bollinger, estructura HH/HL.
4. Para acciones Chile: usa modo Swing (H1/H4) por menor liquidez intradía. Riesgo 1%.
5. Para acciones USA: scalping o swing según volatilidad del momento.
6. Calcula SL técnico con buffer >= 0.2xATR. RR mínimo 1.8 (rechaza si no alcanza).
7. Evalúa LongScore vs ShortScore (0-100 cada uno). Solo señal si diferencia >= 8.
8. Verifica noticias de alto impacto próximas (evitar +-5 min de evento).

RESPONDE ÚNICAMENTE CON ESTE JSON (sin texto extra, sin markdown, sin backticks):
{
  "activo": "XAU/USD",
  "clase": "Commodity",
  "direccion": "Buy",
  "orden_tipo": "Buy Limit",
  "entrada": 2318.50,
  "sl": 2308.20,
  "tp": 2341.80,
  "rr": 2.26,
  "modo": "Scalping",
  "tf_entrada": "M15",
  "precio_actual": 2321.10,
  "precio_fuente": "TradingView",
  "hora_clt": "10:42 CLT",
  "conf_pct": 78,
  "riesgo_cuenta": 2.0,
  "scores": [
    {"label": "Contexto HTF alineado", "val": 18, "max": 20},
    {"label": "RR viable", "val": 18, "max": 20},
    {"label": "Lógica de entrada", "val": 13, "max": 15},
    {"label": "SL técnico", "val": 12, "max": 15},
    {"label": "Volatilidad / spread", "val": 8, "max": 10},
    {"label": "Noticias / sesión", "val": 7, "max": 10},
    {"label": "Confluencias", "val": 4, "max": 5},
    {"label": "Riesgo acorde al modo", "val": 4, "max": 5}
  ],
  "score_total": 84,
  "veredicto": "Ajustes menores",
  "confluencias": [
    "Precio en pullback a EMA50 H1 tras impulso alcista",
    "RSI(14) en H4 rebotando desde zona 45 — momentum positivo",
    "Soporte S/R HTF en 2316–2320, coincide con zona de entrada",
    "MACD H1 con cruce alcista en curso",
    "Sesión Londres activa — liquidez óptima"
  ],
  "prox_noticia": "USD CPI mañana 09:30 CLT — alto impacto — fuera de ventana"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'tools-2024-04-04'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API error' });
    }

    const textBlocks = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const match = textBlocks.match(/\{[\s\S]*\}/);
    if (!match) {
      return res.status(500).json({ error: 'No se pudo parsear la señal generada' });
    }

    const signal = JSON.parse(match[0]);
    return res.status(200).json(signal);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

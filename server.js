const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const ALPACA_KEY = process.env.ALPACA_API_KEY;
const ALPACA_SECRET = process.env.ALPACA_SECRET_KEY;
const BASE_URL = 'https://paper-api.alpaca.markets';
const DATA_URL = 'https://data.alpaca.markets';

app.get('/', (req, res) => {
  res.send('Backend de Trading en Vivo está corriendo.');
});

app.get('/price/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const response = await axios.get(`${DATA_URL}/v2/stocks/${symbol}/quotes/latest`, {
      headers: {
        'APCA-API-KEY-ID': ALPACA_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET,
      },
    });
    res.json({ price: response.data.quote.ap });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener precio' });
  }
});

app.post('/buy', async (req, res) => {
  const { symbol, qty, takeProfitPercent } = req.body;
  try {
    const priceRes = await axios.get(`${DATA_URL}/v2/stocks/${symbol}/quotes/latest`, {
      headers: {
        'APCA-API-KEY-ID': ALPACA_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET,
      },
    });
    const buyPrice = priceRes.data.quote.ap;
    const takeProfitPrice = (buyPrice * (1 + takeProfitPercent / 100)).toFixed(2);

    await axios.post(`${BASE_URL}/v2/orders`, {
      symbol,
      qty,
      side: 'buy',
      type: 'market',
      time_in_force: 'gtc',
    }, {
      headers: {
        'APCA-API-KEY-ID': ALPACA_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET,
      },
    });

    await axios.post(`${BASE_URL}/v2/orders`, {
      symbol,
      qty,
      side: 'sell',
      type: 'limit',
      limit_price: takeProfitPrice,
      time_in_force: 'gtc',
    }, {
      headers: {
        'APCA-API-KEY-ID': ALPACA_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET,
      },
    });

    res.json({ message: `Compra ejecutada, Take Profit en $${takeProfitPrice}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al comprar o colocar Take Profit' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);
});

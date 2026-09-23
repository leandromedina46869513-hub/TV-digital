import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { MercadoPagoConfig, Preference } from 'mercadopago';
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.json());
// Servir la carpeta pública
app.use(express.static(path.join(__dirname, 'public')));
// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
const PORT = process.env.PORT || 3000;
const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const BASE_URL = process.env.BASE_URL;
const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || 'leandromedina46869513@gmail.com';
const plans = {
  comun: { name: 'Común', devices: 1, monthly: 7000 },
  pareja: { name: 'Combo Pareja', devices: 2, monthly: 10000 },
  familiar: { name: 'Combo Familiar', devices: 4, monthly: 15000 }
};
const discounts = {
  1: 0,
  3: 0.10,
  6: 0.20,
  12: 0.35
};
app.post('/api/create-preference', async (req, res) => {
  try {
    if (!ACCESS_TOKEN || !BASE_URL) {
      return res.status(500).json({
        error: 'Servidor no configurado'
      });
    }
    const { plan, months, email } = req.body;
    const p = plans[plan];
    const m = Number(months);
    if (
      !p ||
      discounts[m] === undefined ||
      !/^\S+@\S+\.\S+$/.test(email || '')
    ) {
      return res.status(400).json({
        error: 'Datos inválidos'
      });
    }
    const total = Math.round(
      p.monthly * m * (1 - discounts[m])
    );
    const client = new MercadoPagoConfig({
      accessToken: ACCESS_TOKEN
    });
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [
          {
            title: `TV Digital - ${p.name} - ${m} mes${m > 1 ? 'es' : ''}`,
            quantity: 1,
            unit_price: total,
            currency_id: 'ARS'
          }
        ],
        payer: {
          email
        },
        external_reference: JSON.stringify({
          plan,
          months: m,
          email,
          total
        }),
        back_urls: {
          success: `${BASE_URL}/pago.html?estado=aprobado`,
          pending: `${BASE_URL}/pago.html?estado=pendiente`,
          failure: `${BASE_URL}/pago.html?estado=rechazado`
        },
        auto_return: 'approved',
        notification_url: `${BASE_URL}/api/webhook`
      }
    });
    res.json({
      url: result.init_point
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: 'No se pudo crear el pago'
    });
  }
});
app.post('/api/webhook', async (req, res) => {
  console.log(
    'Webhook Mercado Pago:',
    JSON.stringify(req.body)
  );
  res.sendStatus(200);
});
app.get('/health', (req, res) => {
  res.json({
    ok: true
  });
});
app.listen(PORT, () => {
  console.log(
    `TV Digital server listening on ${PORT}`
  );
});

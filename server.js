import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { Resend } from 'resend';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const BASE_URL = process.env.BASE_URL;

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const resend = RESEND_API_KEY
  ? new Resend(RESEND_API_KEY)
  : null;

const plans = {
  comun: {
    name: 'Común',
    devices: 1,
    monthly: 7000
  },

  pareja: {
    name: 'Combo Pareja',
    devices: 2,
    monthly: 10000
  },

  familiar: {
    name: 'Combo Familiar',
    devices: 4,
    monthly: 15000
  }
};

const discounts = {
  1: 0,
  3: 0.10,
  6: 0.20,
  12: 0.35
};


/* =========================
   CREAR PREFERENCIA
========================= */

app.post('/api/create-preference', async (req, res) => {
  try {

    if (!ACCESS_TOKEN || !BASE_URL) {
      return res.status(500).json({
        error: 'Servidor no configurado'
      });
    }

    const { plan, months, email } = req.body;

    const selectedPlan = plans[plan];
    const selectedMonths = Number(months);

    if (
      !selectedPlan ||
      discounts[selectedMonths] === undefined ||
      !/^\S+@\S+\.\S+$/.test(email || '')
    ) {
      return res.status(400).json({
        error: 'Datos inválidos'
      });
    }

    const total = Math.round(
      selectedPlan.monthly *
      selectedMonths *
      (1 - discounts[selectedMonths])
    );

    const client = new MercadoPagoConfig({
      accessToken: ACCESS_TOKEN
    });

    const preference = new Preference(client);

    /*
      Guardamos los datos de la compra
      para recuperarlos cuando Mercado Pago
      nos avise que el pago fue realizado.
    */

    const orderData = {
      plan: plan,
      months: selectedMonths,
      email: email,
      total: total
    };

    const result = await preference.create({
      body: {

        items: [
          {
            id: plan,
            title: `TV Digital - ${selectedPlan.name}`,
            description: `${selectedPlan.devices} dispositivo(s) - ${selectedMonths} mes(es)`,
            quantity: 1,
            currency_id: 'ARS',
            unit_price: total
          }
        ],

        payer: {
          email: email
        },

        external_reference: JSON.stringify(orderData),

        back_urls: {
          success: `${BASE_URL}/pago.html?estado=aprobado`,
          pending: `${BASE_URL}/pago.html?estado=pendiente`,
          failure: `${BASE_URL}/pago.html?estado=rechazado`
        },

        auto_return: 'approved',

        notification_url: `${BASE_URL}/api/webhook`,

        statement_descriptor: 'TV DIGITAL'
      }
    });

    if (!result || !result.init_point) {

      console.error(
        'Mercado Pago no devolvió init_point:',
        result
      );

      return res.status(500).json({
        error: 'Mercado Pago no devolvió un link de pago'
      });
    }

    console.log(
      'Preferencia creada correctamente'
    );

    res.json({
      url: result.init_point
    });

  } catch (error) {

    console.error(
      'Error creando preferencia de Mercado Pago:',
      error
    );

    res.status(500).json({
      error: 'No se pudo crear el pago'
    });
  }
});


/* =========================
   WEBHOOK MERCADO PAGO
========================= */

app.post('/api/webhook', async (req, res) => {

  console.log(
    'Webhook Mercado Pago:',
    JSON.stringify(req.body)
  );

  /*
    Respondemos inmediatamente a Mercado Pago.
  */

  res.sendStatus(200);

  try {

    const paymentId =
      req.body?.data?.id ||
      req.body?.id;

    const type =
      req.body?.type;

    if (!paymentId) {

      console.log(
        'Webhook sin ID de pago.'
      );

      return;
    }

    /*
      Solo procesamos notificaciones
      relacionadas con pagos.
    */

    if (
      type &&
      type !== 'payment'
    ) {

      console.log(
        'Webhook ignorado. Tipo:',
        type
      );

      return;
    }

    if (!ACCESS_TOKEN) {

      console.error(
        'Falta MP_ACCESS_TOKEN'
      );

      return;
    }

    if (!RESEND_API_KEY || !resend) {

      console.error(
        'Falta RESEND_API_KEY'
      );

      return;
    }

    if (!ADMIN_EMAIL) {

      console.error(
        'Falta ADMIN_EMAIL'
      );

      return;
    }


    /* =========================
       CONSULTAR PAGO
    ========================= */

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        method: 'GET',

        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`
        }
      }
    );

    if (!response.ok) {

      console.error(
        'No se pudo consultar el pago:',
        response.status
      );

      return;
    }

    const payment = await response.json();

    console.log(
      'Estado del pago:',
      payment.status
    );


    /*
      SOLO continuamos si Mercado Pago
      confirma que está aprobado.
    */

    if (payment.status !== 'approved') {

      console.log(
        'Pago todavía no aprobado:',
        payment.status
      );

      return;
    }


    /* =========================
       RECUPERAR DATOS DEL CLIENTE
    ========================= */

    let order = {};

    try {

      order = JSON.parse(
        payment.external_reference || '{}'
      );

    } catch (error) {

      console.log(
        'No se pudo interpretar external_reference'
      );
    }

    const plan = plans[order.plan];

    const planName = plan
      ? plan.name
      : 'Plan no identificado';

    const devices = plan
      ? plan.devices
      : '-';

    const months =
      order.months || '-';

    const total =
      order.total ||
      payment.transaction_amount ||
      '-';

    const customerEmail =
      order.email ||
      payment.payer?.email ||
      'No disponible';


    /* =========================
       CORREO PARA EL ADMINISTRADOR
    ========================= */

    const adminEmailResult =
      await resend.emails.send({

        from: 'TV Digital <onboarding@resend.dev>',

        to: [ADMIN_EMAIL],

        subject: 'Nuevo pago recibido - TV Digital',

        html: `

          <h2>Nuevo pago recibido</h2>

          <p>
            Se recibió un nuevo pago aprobado.
          </p>

          <hr>

          <p>
            <strong>Cliente:</strong>
            ${customerEmail}
          </p>

          <p>
            <strong>Plan:</strong>
            ${planName}
          </p>

          <p>
            <strong>Dispositivos:</strong>
            ${devices}
          </p>

          <p>
            <strong>Duración:</strong>
            ${months} mes(es)
          </p>

          <p>
            <strong>Total:</strong>
            $${total} ARS
          </p>

          <p>
            <strong>ID de pago:</strong>
            ${payment.id}
          </p>

          <p>
            <strong>Estado:</strong>
            APROBADO
          </p>

          <hr>

          <p>
            Este correo fue generado automáticamente
            por TV Digital.
          </p>

        `
      });


    if (adminEmailResult.error) {

      console.error(
        'Error enviando correo al administrador:',
        adminEmailResult.error
      );

    } else {

      console.log(
        'Correo enviado correctamente al administrador.'
      );
    }


    /* =========================
       CORREO PARA EL CLIENTE
    ========================= */

    const customerEmailResult =
      await resend.emails.send({

        from: 'TV Digital <onboarding@resend.dev>',

        to: [customerEmail],

        subject: '¡Pago recibido! - TV Digital',

        html: `

          <h2>¡Gracias por tu compra!</h2>

          <p>
            Recibimos correctamente tu pago
            de TV Digital.
          </p>

          <p>
            Tu suscripción fue aprobada.
          </p>

          <hr>

          <p>
            <strong>Plan:</strong>
            ${planName}
          </p>

          <p>
            <strong>Dispositivos:</strong>
            ${devices}
          </p>

          <p>
            <strong>Duración:</strong>
            ${months} mes(es)
          </p>

          <p>
            <strong>Total:</strong>
            $${total} ARS
          </p>

          <hr>

          <p>
            En breve te enviaremos tu
            <strong>cuenta y contraseña de acceso</strong>
            para que puedas ingresar al servicio.
          </p>

          <p>
            Gracias por elegir TV Digital.
          </p>

        `
      });


    if (customerEmailResult.error) {

      console.error(
        'Error enviando correo al cliente:',
        customerEmailResult.error
      );

    } else {

      console.log(
        'Correo enviado correctamente al cliente.'
      );
    }


  } catch (error) {

    console.error(
      'Error procesando webhook:',
      error
    );
  }
});


/* =========================
   HEALTH CHECK
========================= */

app.get('/health', (req, res) => {

  res.json({
    ok: true
  });

});


/* =========================
   INICIAR SERVIDOR
========================= */

app.listen(PORT, () => {

  console.log(
    `TV Digital server listening on ${PORT}`
  );

});

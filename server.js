import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { Resend } from 'resend';
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ===============================
// ARCHIVOS DE LA PÁGINA
// ===============================
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(
    path.join(__dirname, 'public', 'index.html')
  );
});
// ===============================
// PUERTO
// ===============================
const PORT = process.env.PORT || 3000;
// ===============================
// ⚙️ CONFIGURACIÓN
// EDITAR PRECIOS, DESCUENTOS Y CÓDIGO AQUÍ
// ===============================
const CONFIG = {
  precios: {
    comun: 1,
    pareja: 10000,
    familiar: 15000
  },
  descuentos: {
    1: 0,
    3: 0.10,
    6: 0.20,
    12: 0.35
  },
  downloader: '6590043'
};
// ===============================
// VARIABLES DE RENDER
// ===============================
const ACCESS_TOKEN =
  process.env.MP_ACCESS_TOKEN;
const BASE_URL =
  process.env.BASE_URL;
const RESEND_API_KEY =
  process.env.RESEND_API_KEY;
const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL;
// ===============================
// RESEND
// ===============================
const resend =
  RESEND_API_KEY
    ? new Resend(RESEND_API_KEY)
    : null;
// ===============================
// PLANES
// ===============================
const plans = {
  comun: {
    name: 'Común',
    devices: 1,
    monthly: CONFIG.precios.comun
  },
  pareja: {
    name: 'Combo Pareja',
    devices: 2,
    monthly: CONFIG.precios.pareja
  },
  familiar: {
    name: 'Combo Familiar',
    devices: 4,
    monthly: CONFIG.precios.familiar
  }
};
const discounts =
  CONFIG.descuentos;
// ===============================
// CONFIGURACIÓN PÚBLICA
// ===============================
app.get('/api/config', (req, res) => {
  res.json({
    precios: CONFIG.precios,
    descuentos: CONFIG.descuentos,
    downloader: CONFIG.downloader
  });
});
// ===============================
// CREAR PREFERENCIA DE MERCADO PAGO
// ===============================
app.post(
  '/api/create-preference',
  async (req, res) => {
    try {
      console.log(
        'Solicitud para crear preferencia:',
        req.body
      );
      if (!ACCESS_TOKEN || !BASE_URL) {
        console.error(
          'Falta MP_ACCESS_TOKEN o BASE_URL'
        );
        return res.status(500).json({
          error:
            'Servidor no configurado'
        });
      }
      const {
        plan,
        months,
        email
      } = req.body;
      const selectedPlan =
        plans[plan];
      const selectedMonths =
        Number(months);
      if (
        !selectedPlan ||
        discounts[selectedMonths] === undefined ||
        !/^\S+@\S+\.\S+$/.test(
          email || ''
        )
      ) {
        console.error(
          'Datos inválidos:',
          req.body
        );
        return res.status(400).json({
          error:
            'Datos inválidos'
        });
      }
      const total =
        Math.round(
          selectedPlan.monthly *
          selectedMonths *
          (
            1 -
            discounts[selectedMonths]
          )
        );
      console.log(
        'Total calculado:',
        total
      );
      const client =
        new MercadoPagoConfig({
          accessToken:
            ACCESS_TOKEN
        });
      const preference =
        new Preference(client);
      const orderData = {
        plan:
          plan,
        months:
          selectedMonths,
        email:
          email,
        total:
          total
      };
      const result =
        await preference.create({
          body: {
            items: [
              {
                id:
                  plan,
                title:
                  `TV Digital - ${selectedPlan.name}`,
                description:
                  `${selectedPlan.devices} dispositivo(s) - ${selectedMonths} mes(es)`,
                quantity:
                  1,
                currency_id:
                  'ARS',
                unit_price:
                  total
              }
            ],
            payer: {
              email:
                email
            },
            external_reference:
              JSON.stringify(orderData),
            back_urls: {
              success:
                `${BASE_URL}/pago.html?estado=aprobado`,
              pending:
                `${BASE_URL}/pago.html?estado=pendiente`,
              failure:
                `${BASE_URL}/pago.html?estado=rechazado`
            },
            auto_return:
              'approved',
            // IMPORTANTE:
            // Mercado Pago puede usar esta URL
            // para enviar el webhook del pago.
            notification_url:
              `${BASE_URL}/api/webhook`,
            statement_descriptor:
              'TV DIGITAL'
          }
        });
      if (
        !result ||
        !result.init_point
      ) {
        console.error(
          'Mercado Pago no devolvió init_point:',
          result
        );
        return res.status(500).json({
          error:
            'Mercado Pago no devolvió un link de pago'
        });
      }
      console.log(
        'Preferencia creada correctamente'
      );
      console.log(
        'Notification URL:',
        `${BASE_URL}/api/webhook`
      );
      return res.json({
        url:
          result.init_point,
        init_point:
          result.init_point
      });
    } catch (error) {
      console.error(
        'Error creando preferencia de Mercado Pago:',
        error
      );
      return res.status(500).json({
        error:
          'No se pudo crear el pago'
      });
    }
  }
);
// ======================================================
// WEBHOOK DE MERCADO PAGO
// ======================================================
app.post(
  '/api/webhook',
  async (req, res) => {
    console.log(
      '========================================'
    );
    console.log(
      'WEBHOOK MERCADO PAGO RECIBIDO'
    );
    console.log(
      'Body:',
      JSON.stringify(req.body)
    );
    console.log(
      'Query:',
      JSON.stringify(req.query)
    );
    console.log(
      '========================================'
    );
    // Respondemos inmediatamente.
    // Mercado Pago espera un 200 o 201.
    res.sendStatus(200);
    try {
      // --------------------------------------
      // OBTENER TIPO DE EVENTO
      // --------------------------------------
      const type =
        req.body?.type ||
        req.query?.type;
      console.log(
        'Tipo de evento:',
        type
      );
      // --------------------------------------
      // OBTENER ID DEL PAGO
      // --------------------------------------
      let paymentId =
        req.body?.data?.id ||
        req.body?.id ||
        req.query?.['data.id'] ||
        req.query?.id;
      console.log(
        'ID recibido:',
        paymentId
      );
      // --------------------------------------
      // SI NO HAY ID, TERMINAMOS
      // --------------------------------------
      if (!paymentId) {
        console.log(
          'Webhook recibido sin ID de pago.'
        );
        return;
      }
      // --------------------------------------
      // SOLO PROCESAMOS PAYMENT
      // --------------------------------------
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
      // --------------------------------------
      // COMPROBAR CREDENCIALES
      // --------------------------------------
      if (!ACCESS_TOKEN) {
        console.error(
          'Falta MP_ACCESS_TOKEN en Render.'
        );
        return;
      }
      if (!RESEND_API_KEY || !resend) {
        console.error(
          'Falta RESEND_API_KEY en Render.'
        );
        return;
      }
      if (!ADMIN_EMAIL) {
        console.error(
          'Falta ADMIN_EMAIL en Render.'
        );
        return;
      }
      // --------------------------------------
      // CONSULTAR PAGO REAL
      // --------------------------------------
      console.log(
        'Consultando pago:',
        paymentId
      );
      const response =
        await fetch(
          `https://api.mercadopago.com/v1/payments/${paymentId}`,
          {
            method:
              'GET',
            headers: {
              Authorization:
                `Bearer ${ACCESS_TOKEN}`,
              'Content-Type':
                'application/json'
            }
          }
        );
      console.log(
        'Respuesta de Mercado Pago:',
        response.status
      );
      if (!response.ok) {
        const errorText =
          await response.text();
        console.error(
          'No se pudo consultar el pago:',
          response.status,
          errorText
        );
        return;
      }
      const payment =
        await response.json();
      console.log(
        'Pago recibido:',
        JSON.stringify(payment)
      );
      console.log(
        'Estado del pago:',
        payment.status
      );
      // --------------------------------------
      // SOLO PAGOS APROBADOS
      // --------------------------------------
      if (
        payment.status !== 'approved'
      ) {
        console.log(
          'Pago todavía no aprobado:',
          payment.status
        );
        return;
      }
      console.log(
        'PAGO APROBADO. PROCESANDO CORREOS...'
      );
      // --------------------------------------
      // RECUPERAR INFORMACIÓN DEL PEDIDO
      // --------------------------------------
      let order = {};
      try {
        order =
          JSON.parse(
            payment.external_reference ||
            '{}'
          );
      } catch (error) {
        console.error(
          'No se pudo interpretar external_reference:',
          error
        );
      }
      // --------------------------------------
      // PLAN
      // --------------------------------------
      const plan =
        plans[order.plan];
      const planName =
        plan
          ? plan.name
          : 'Plan no identificado';
      const devices =
        plan
          ? plan.devices
          : '-';
      const months =
        order.months ||
        '-';
      const total =
        order.total ||
        payment.transaction_amount ||
        '-';
      const customerEmail =
        order.email ||
        payment.payer?.email ||
        'No disponible';
      console.log(
        'Cliente:',
        customerEmail
      );
      console.log(
        'Plan:',
        planName
      );
      console.log(
        'Duración:',
        months
      );
      console.log(
        'Total:',
        total
      );
      // ==================================================
      // CORREO AL ADMINISTRADOR
      // ==================================================
      console.log(
        'Enviando correo al administrador...'
      );
      const adminEmailResult =
        await resend.emails.send({
          from:
            'TV Digital <onboarding@resend.dev>',
          to:
            [ADMIN_EMAIL],
          subject:
            'Nuevo pago recibido - TV Digital',
          html: `
            <h2>
              Nuevo pago recibido
            </h2>
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
      if (
        adminEmailResult?.error
      ) {
        console.error(
          'ERROR enviando correo al administrador:',
          adminEmailResult.error
        );
      } else {
        console.log(
          'CORREO ENVIADO CORRECTAMENTE AL ADMINISTRADOR.'
        );
      }
      // ==================================================
      // CORREO AL CLIENTE
      // ==================================================
      if (
        customerEmail &&
        customerEmail !== 'No disponible'
      ) {
        console.log(
          'Enviando correo al cliente:',
          customerEmail
        );
        const customerEmailResult =
          await resend.emails.send({
            from:
              'TV Digital <onboarding@resend.dev>',
            to:
              [customerEmail],
            subject:
              '¡Pago recibido! - TV Digital',
            html: `
              <h2>
                ¡Gracias por tu compra!
              </h2>
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
                <strong>
                  cuenta y contraseña de acceso
                </strong>
                para que puedas ingresar al servicio.
              </p>
              <p>
                Gracias por elegir TV Digital.
              </p>
            `
          });
        if (
          customerEmailResult?.error
        ) {
          console.error(
            'ERROR enviando correo al cliente:',
            customerEmailResult.error
          );
        } else {
          console.log(
            'CORREO ENVIADO CORRECTAMENTE AL CLIENTE.'
          );
        }
      } else {
        console.error(
          'No se pudo determinar el Gmail del cliente.'
        );
      }
      console.log(
        '========================================'
      );
      console.log(
        'WEBHOOK PROCESADO COMPLETAMENTE'
      );
      console.log(
        '========================================'
      );
    } catch (error) {
      console.error(
        'ERROR PROCESANDO WEBHOOK:',
        error
      );
    }
  }
);
// ======================================================
// HEALTH CHECK
// ======================================================
app.get(
  '/health',
  (req, res) => {
    res.json({
      ok: true,
      servicio:
        'TV Digital'
    });
  }
);
// ======================================================
// INICIAR SERVIDOR
// ======================================================
app.listen(
  PORT,
  () => {
    console.log(
      `TV Digital server listening on ${PORT}`
    );
  }
);

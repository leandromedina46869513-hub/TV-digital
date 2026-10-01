import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import admin from 'firebase-admin';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(
    path.join(__dirname, 'public', 'index.html')
  );
});

/* =========================================================
   CONFIGURACIÓN TV DIGITAL
========================================================= */

const CONFIG = {
  precios: {
    comun: 7000,
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

/* =========================================================
   VARIABLES DE ENTORNO
========================================================= */

const PORT = process.env.PORT || 3000;

const ACCESS_TOKEN =
  process.env.MP_ACCESS_TOKEN;

const BASE_URL =
  process.env.BASE_URL;

const SENDLIB_API_KEY =
  process.env.SENDLIB_API_KEY;

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL;

const FROM_EMAIL =
  'digitaltv092@gmail.com';

const FIREBASE_DATABASE_URL =
  process.env.FIREBASE_DATABASE_URL;

const FIREBASE_SERVICE_ACCOUNT =
  process.env.FIREBASE_SERVICE_ACCOUNT;

/* =========================================================
   FIREBASE
========================================================= */

let db = null;

try {

  if (
    FIREBASE_DATABASE_URL &&
    FIREBASE_SERVICE_ACCOUNT
  ) {

    const serviceAccount =
      JSON.parse(
        FIREBASE_SERVICE_ACCOUNT
      );

    if (!admin.apps.length) {

      admin.initializeApp({

        credential:
          admin.credential.cert(
            serviceAccount
          ),

        databaseURL:
          FIREBASE_DATABASE_URL

      });

    }

    db = admin.database();

    console.log(
      'Firebase conectado correctamente'
    );

  } else {

    console.warn(
      'Firebase no está configurado todavía.'
    );

  }

} catch (error) {

  console.error(
    'Error al conectar Firebase:',
    error.message
  );

}

/* =========================================================
   PLANES
========================================================= */

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

const processedPayments =
  new Set();

/* =========================================================
   CONFIGURACIÓN PARA FRONTEND
========================================================= */

app.get(
  '/api/config',
  (req, res) => {

    res.json({

      precios:
        CONFIG.precios,

      descuentos:
        CONFIG.descuentos,

      downloader:
        CONFIG.downloader

    });

  }
);

/* =========================================================
   CREAR PREFERENCIA MERCADO PAGO
========================================================= */

app.post(
  '/api/create-preference',
  async (req, res) => {

    try {

      console.log(
        'Solicitud de creación de preferencia:',
        req.body
      );

      if (!ACCESS_TOKEN) {

        return res.status(500).json({

          error:
            'Mercado Pago no está configurado.'

        });

      }

      if (!BASE_URL) {

        return res.status(500).json({

          error:
            'BASE_URL no está configurado.'

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

      if (!selectedPlan) {

        return res.status(400).json({

          error:
            'Plan inválido.'

        });

      }

      if (
        !Object.prototype.hasOwnProperty.call(
          discounts,
          selectedMonths
        )
      ) {

        return res.status(400).json({

          error:
            'Cantidad de meses inválida.'

        });

      }

      if (
        !email ||
        !/^\S+@\S+\.\S+$/.test(email)
      ) {

        return res.status(400).json({

          error:
            'Email inválido.'

        });

      }

      const descuento =
        discounts[selectedMonths];

      const total =
        Math.round(
          selectedPlan.monthly *
          selectedMonths *
          (1 - descuento)
        );

      console.log(
        'Plan:',
        selectedPlan.name
      );

      console.log(
        'Meses:',
        selectedMonths
      );

      console.log(
        'Email:',
        email
      );

      console.log(
        'Total:',
        total
      );

      const client =
        new MercadoPagoConfig({

          accessToken:
            ACCESS_TOKEN

        });

      const preference =
        new Preference(client);

      const externalReference =
        JSON.stringify({

          plan,

          months:
            selectedMonths,

          email,

          total

        });

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

                quantity: 1,

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
              externalReference,

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

            notification_url:
              `${BASE_URL}/api/webhook`,

            statement_descriptor:
              'TV DIGITAL'

          }

        });

      console.log(
        'Preferencia creada correctamente'
      );

      console.log(
        'ID preferencia:',
        result.id
      );

      console.log(
        'init_point:',
        result.init_point
      );

      if (!result.init_point) {

        console.error(
          'Mercado Pago no devolvió init_point'
        );

        return res.status(500).json({

          error:
            'Mercado Pago no devolvió el enlace de pago.'

        });

      }

      return res.json({

        url:
          result.init_point,

        init_point:
          result.init_point

      });

    } catch (error) {

      console.error(
        'Error creando preferencia:',
        error
      );

      return res.status(500).json({

        error:
          error.message ||
          'No se pudo crear el pago.'

      });

    }

  }
);

/* =========================================================
   SENDLIB
========================================================= */

async function enviarCorreo({
  destinatario,
  asunto,
  html
}) {

  if (!SENDLIB_API_KEY) {

    throw new Error(
      'Sendlib no está configurado.'
    );

  }

  const respuesta =
    await fetch(
      'https://sendlib.samueltuoyo.com/api/send',
      {

        method: 'POST',

        headers: {

          'Authorization':
            `Bearer ${SENDLIB_API_KEY}`,

          'Content-Type':
            'application/json'

        },

        body:
          JSON.stringify({

            from:
              `"TV Digital" <${FROM_EMAIL}>`,

            to:
              destinatario,

            subject:
              asunto,

            html:
              html

          })

      }
    );

  const texto =
    await respuesta.text();

  console.log(
    'Respuesta Sendlib:',
    respuesta.status,
    texto
  );

  if (!respuesta.ok) {

    throw new Error(
      `Sendlib error ${respuesta.status}: ${texto}`
    );

  }

  return texto;

}

/* =========================================================
   WEBHOOK MERCADO PAGO
========================================================= */

app.post(
  '/api/webhook',
  async (req, res) => {

    console.log(
      '================ WEBHOOK ================'
    );

    console.log(
      'Body:',
      req.body
    );

    console.log(
      'Query:',
      req.query
    );

    /*
      Mercado Pago necesita recibir rápidamente
      una respuesta 200.
    */

    res.sendStatus(200);

    try {

      const tipo =
        req.body?.type ||
        req.query?.type;

      if (
        tipo &&
        tipo !== 'payment'
      ) {

        console.log(
          'Notificación ignorada. Tipo:',
          tipo
        );

        return;

      }

      const paymentId =
        req.body?.data?.id ||
        req.body?.id ||
        req.query?.['data.id'];

      if (!paymentId) {

        console.log(
          'Webhook sin ID de pago.'
        );

        return;

      }

      if (
        processedPayments.has(
          String(paymentId)
        )
      ) {

        console.log(
          'Pago ya procesado:',
          paymentId
        );

        return;

      }

      if (!ACCESS_TOKEN) {

        console.error(
          'MP_ACCESS_TOKEN no configurado.'
        );

        return;

      }

      if (!SENDLIB_API_KEY) {

        console.error(
          'SENDLIB_API_KEY no configurada.'
        );

        return;

      }

      if (!ADMIN_EMAIL) {

        console.error(
          'ADMIN_EMAIL no configurado.'
        );

        return;

      }

      console.log(
        'Consultando pago:',
        paymentId
      );

      const respuestaPago =
        await fetch(
          `https://api.mercadopago.com/v1/payments/${paymentId}`,
          {

            headers: {

              Authorization:
                `Bearer ${ACCESS_TOKEN}`

            }

          }
        );

      if (!respuestaPago.ok) {

        console.error(
          'Error consultando Mercado Pago:',
          respuestaPago.status
        );

        return;

      }

      const payment =
        await respuestaPago.json();

      console.log(
        'Estado del pago:',
        payment.status
      );

      if (
        payment.status !==
        'approved'
      ) {

        console.log(
          'El pago todavía no está aprobado.'
        );

        return;

      }

      processedPayments.add(
        String(paymentId)
      );

      let datosReferencia = {};

      try {

        datosReferencia =
          JSON.parse(
            payment.external_reference ||
            '{}'
          );

      } catch (error) {

        console.error(
          'No se pudo leer external_reference.'
        );

      }

      const plan =
        datosReferencia.plan ||
        'comun';

      const months =
        Number(
          datosReferencia.months ||
          1
        );

      const customerEmail =
        datosReferencia.email ||
        payment.payer?.email ||
        '';

      const total =
        datosReferencia.total ||
        payment.transaction_amount ||
        0;

      const selectedPlan =
        plans[plan];

      const planName =
        selectedPlan?.name ||
        plan;

      const devices =
        selectedPlan?.devices ||
        1;

      console.log(
        'Pago aprobado.'
      );

      console.log(
        'Cliente:',
        customerEmail
      );

      console.log(
        'Plan:',
        planName
      );

      console.log(
        'Dispositivos:',
        devices
      );

      console.log(
        'Meses:',
        months
      );

      console.log(
        'Total:',
        total
      );

      /* =====================================================
         GUARDAR COMPRA EN FIREBASE
      ===================================================== */

      if (db) {

        try {

          await db
            .ref('compras')
            .push({

              paymentId:
                String(paymentId),

              email:
                customerEmail,

              plan:
                planName,

              planId:
                plan,

              dispositivos:
                devices,

              meses:
                months,

              total:
                total,

              estado:
                'approved',

              fecha:
                new Date().toISOString()

            });

          console.log(
            'Compra guardada en Firebase.'
          );

        } catch (firebaseError) {

          console.error(
            'Error guardando compra en Firebase:',
            firebaseError.message
          );

        }

      }

      /* =====================================================
         EMAIL AL ADMINISTRADOR
      ===================================================== */

      const htmlAdmin = `

        <h2>📺 Nueva compra de TV Digital</h2>

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
          $${Number(total).toLocaleString('es-AR')} ARS
        </p>

        <p>
          <strong>ID de pago:</strong>
          ${paymentId}
        </p>

        <p>
          <strong>Estado:</strong>
          Pago aprobado correctamente.
        </p>

      `;

      await enviarCorreo({

        destinatario:
          ADMIN_EMAIL,

        asunto:
          '📺 Nueva compra aprobada - TV Digital',

        html:
          htmlAdmin

      });

      console.log(
        'Email enviado al administrador.'
      );

      /* =====================================================
         EMAIL AL CLIENTE
      ===================================================== */

      if (customerEmail) {

        const htmlCliente = `

          <h2>📺 TV Digital</h2>

          <p>
            ¡Gracias por tu compra!
          </p>

          <p>
            Tu pago fue aprobado correctamente.
          </p>

          <p>
            <strong>Plan:</strong>
            ${planName}
          </p>

          <p>
            <strong>Duración:</strong>
            ${months} mes(es)
          </p>

          <p>
            En breve te enviaremos tu cuenta
            y contraseña de acceso.
          </p>

          <p>
            Gracias por elegir TV Digital.
          </p>

        `;

        await enviarCorreo({

          destinatario:
            customerEmail,

          asunto:
            '📺 Compra aprobada - TV Digital',

          html:
            htmlCliente

        });

        console.log(
          'Email enviado al cliente.'
        );

      }

      console.log(
        'Webhook procesado correctamente.'
      );

    } catch (error) {

      console.error(
        'Error procesando webhook:',
        error
      );

    }

  }
);

/* =========================================================
   OBTENER COMENTARIOS
========================================================= */

app.get(
  '/api/reviews',
  async (req, res) => {

    try {

      if (!db) {

        return res.status(503).json({

          error:
            'Firebase no está configurado.'

        });

      }

      const snapshot =
        await db
          .ref('comentarios')
          .once('value');

      const datos =
        snapshot.val() || {};

      const comentarios =
        Object.entries(datos)
          .map(
            ([id, comentario]) => ({

              id,

              nombre:
                comentario.nombre ||
                '',

              calificacion:
                Number(
                  comentario.calificacion ||
                  0
                ),

              comentario:
                comentario.comentario ||
                '',

              fecha:
                comentario.fecha ||
                ''

            })
          )
          .sort(
            (a, b) =>
              new Date(b.fecha) -
              new Date(a.fecha)
          );

      return res.json(
        comentarios
      );

    } catch (error) {

      console.error(
        'Error obteniendo comentarios:',
        error
      );

      return res.status(500).json({

        error:
          'No se pudieron cargar los comentarios.'

      });

    }

  }
);

/* =========================================================
   PUBLICAR COMENTARIO
========================================================= */

app.post(
  '/api/reviews',
  async (req, res) => {

    try {

      if (!db) {

        return res.status(503).json({

          error:
            'Firebase no está configurado.'

        });

      }

      let {
        nombre,
        calificacion,
        comentario
      } = req.body;

      nombre =
        String(nombre || '')
          .trim();

      comentario =
        String(comentario || '')
          .trim();

      calificacion =
        Number(calificacion);

      if (!nombre) {

        return res.status(400).json({

          error:
            'Ingresá tu nombre.'

        });

      }

      if (
        !Number.isInteger(
          calificacion
        ) ||
        calificacion < 1 ||
        calificacion > 5
      ) {

        return res.status(400).json({

          error:
            'La calificación debe ser de 1 a 5.'

        });

      }

      if (!comentario) {

        return res.status(400).json({

          error:
            'Escribí un comentario.'

        });

      }

      if (nombre.length > 60) {

        return res.status(400).json({

          error:
            'El nombre es demasiado largo.'

        });

      }

      if (comentario.length > 500) {

        return res.status(400).json({

          error:
            'El comentario es demasiado largo.'

        });

      }

      const nuevoComentario = {

        nombre,

        calificacion,

        comentario,

        fecha:
          new Date().toISOString()

      };

      const referencia =
        await db
          .ref('comentarios')
          .push(
            nuevoComentario
          );

      console.log(
        'Comentario guardado:',
        referencia.key
      );

      return res.status(201).json({

        id:
          referencia.key,

        ...nuevoComentario

      });

    } catch (error) {

      console.error(
        'Error guardando comentario:',
        error
      );

      return res.status(500).json({

        error:
          'No se pudo guardar el comentario.'

      });

    }

  }
);

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
  '/health',
  (req, res) => {

    res.json({

      ok: true,

      firebase:
        !!db,

      mercadopago:
        !!ACCESS_TOKEN,

      sendlib:
        !!SENDLIB_API_KEY

    });

  }
);

/* =========================================================
   INICIAR SERVIDOR
========================================================= */

app.listen(
  PORT,
  () => {

    console.log(
      `TV Digital server listening on ${PORT}`
    );

  }
);

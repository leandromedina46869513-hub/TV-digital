<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TV Digital</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #f4f6f8;
      color: #222;
    }

    header {
      background: #111827;
      color: white;
      text-align: center;
      padding: 25px 15px;
    }

    header h1 {
      margin: 0 0 8px;
      font-size: 30px;
    }

    header p {
      margin: 0;
      color: #d1d5db;
    }

    .container {
      max-width: 1000px;
      margin: auto;
      padding: 20px;
    }

    .steps {
      background: white;
      border-radius: 15px;
      padding: 20px;
      margin-bottom: 25px;
      box-shadow: 0 3px 12px rgba(0,0,0,.08);
    }

    .steps h2 {
      margin-top: 0;
    }

    .steps ol {
      padding-left: 22px;
      line-height: 1.8;
    }

    .code {
      display: inline-block;
      background: #111827;
      color: white;
      padding: 8px 14px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 18px;
    }

    .plans {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .card {
      background: white;
      border-radius: 15px;
      padding: 20px;
      box-shadow: 0 3px 12px rgba(0,0,0,.08);
    }

    .card h3 {
      margin-top: 0;
      font-size: 23px;
    }

    .price {
      font-size: 28px;
      font-weight: bold;
      margin: 10px 0;
    }

    .card ul {
      padding-left: 20px;
      line-height: 1.7;
    }

    select,
    input {
      width: 100%;
      padding: 12px;
      margin-top: 8px;
      margin-bottom: 12px;
      border: 1px solid #ccc;
      border-radius: 8px;
      font-size: 16px;
    }

    .total {
      font-weight: bold;
      margin: 10px 0;
      font-size: 18px;
    }

    button {
      width: 100%;
      padding: 13px;
      border: none;
      border-radius: 8px;
      background: #16a34a;
      color: white;
      font-size: 17px;
      font-weight: bold;
      cursor: pointer;
    }

    button:hover {
      background: #15803d;
    }

    .note {
      margin-top: 25px;
      text-align: center;
      background: white;
      padding: 18px;
      border-radius: 12px;
    }

    footer {
      text-align: center;
      padding: 25px;
      color: #666;
    }
  </style>
</head>

<body>

<header>
  <h1>📺 TV Digital</h1>
  <p>Canales, series, deportes y películas</p>
</header>

<div class="container">

  <div class="steps">
    <h2>¿Cómo instalar?</h2>

    <ol>
      <li>
        Descargá <b>Downloader</b> desde Google Play.
        <br>
        <a
          href="https://play.google.com/store/apps/details?id=com.esaba.downloader"
          target="_blank">
          Descargar Downloader
        </a>
      </li>

      <li>
        Abrí Downloader e ingresá este código:
        <br><br>
        <span class="code" id="downloaderCode">Cargando...</span>
      </li>

      <li>
        Instalá la aplicación.
      </li>

      <li>
        Elegí uno de nuestros planes y realizá el pago.
      </li>
    </ol>
  </div>

  <div class="plans">

    <div class="card">
      <h3>Común</h3>

      <p>1 dispositivo</p>

      <div class="price" id="price1">Cargando...</div>

      <ul>
        <li>Canales</li>
        <li>Series</li>
        <li>Deportes</li>
        <li>Películas</li>
      </ul>

      <label>Duración</label>

      <select id="m1" onchange="calc(1)">
        <option value="1">1 mes</option>
        <option value="3">3 meses</option>
        <option value="6">6 meses</option>
        <option value="12">12 meses</option>
      </select>

      <div class="total" id="t1">Total: $0</div>

      <input
        type="email"
        id="e1"
        placeholder="Tu Gmail">

      <button onclick="buy('comun',1)">
        Comprar
      </button>
    </div>


    <div class="card">
      <h3>Combo Pareja</h3>

      <p>2 dispositivos</p>

      <div class="price" id="price2">Cargando...</div>

      <ul>
        <li>Canales</li>
        <li>Series</li>
        <li>Deportes</li>
        <li>Películas</li>
      </ul>

      <label>Duración</label>

      <select id="m2" onchange="calc(2)">
        <option value="1">1 mes</option>
        <option value="3">3 meses</option>
        <option value="6">6 meses</option>
        <option value="12">12 meses</option>
      </select>

      <div class="total" id="t2">Total: $0</div>

      <input
        type="email"
        id="e2"
        placeholder="Tu Gmail">

      <button onclick="buy('pareja',2)">
        Comprar
      </button>
    </div>


    <div class="card">
      <h3>Combo Familiar</h3>

      <p>4 dispositivos</p>

      <div class="price" id="price3">Cargando...</div>

      <ul>
        <li>Canales</li>
        <li>Series</li>
        <li>Deportes</li>
        <li>Películas</li>
      </ul>

      <label>Duración</label>

      <select id="m3" onchange="calc(3)">
        <option value="1">1 mes</option>
        <option value="3">3 meses</option>
        <option value="6">6 meses</option>
        <option value="12">12 meses</option>
      </select>

      <div class="total" id="t3">Total: $0</div>

      <input
        type="email"
        id="e3"
        placeholder="Tu Gmail">

      <button onclick="buy('familiar',3)">
        Comprar
      </button>
    </div>

  </div>

  <div class="note">
    <b>📩 Después del pago</b>

    <p>
      Una vez confirmado el pago, recibirás un Gmail
      con la información de tu suscripción.
      Luego te enviaremos tu cuenta y contraseña.
    </p>
  </div>

</div>

<footer>
  TV Digital
</footer>


<script>

let config = null;


function money(n) {
  return '$' + Math.round(n).toLocaleString('es-AR');
}


async function loadConfig() {

  try {

    const response = await fetch('/api/config');

    if (!response.ok) {
      throw new Error('No se pudo cargar la configuración');
    }

    config = await response.json();

    document.getElementById('downloaderCode').textContent =
      config.downloader;

    document.getElementById('price1').textContent =
      money(config.precios.comun) + ' / mes';

    document.getElementById('price2').textContent =
      money(config.precios.pareja) + ' / mes';

    document.getElementById('price3').textContent =
      money(config.precios.familiar) + ' / mes';

    updateOptions('m1');
    updateOptions('m2');
    updateOptions('m3');

    calc(1);
    calc(2);
    calc(3);

  } catch (error) {

    console.error(error);

    document.getElementById('downloaderCode').textContent =
      'Error';

  }

}


function updateOptions(id) {

  const select = document.getElementById(id);

  const months = [1, 3, 6, 12];

  months.forEach(month => {

    const option = select.querySelector(
      `option[value="${month}"]`
    );

    if (!option) return;

    const discount =
      config.descuentos[month] || 0;

    if (month === 1 || discount === 0) {

      option.textContent =
        `${month} mes${month > 1 ? 'es' : ''}`;

    } else {

      option.textContent =
        `${month} meses - ${discount * 100}% descuento`;

    }

  });

}


function calc(i) {

  if (!config) return;

  const m =
    Number(document.getElementById('m' + i).value);

  let price;

  if (i === 1) {
    price = config.precios.comun;
  }

  if (i === 2) {
    price = config.precios.pareja;
  }

  if (i === 3) {
    price = config.precios.familiar;
  }

  const discount =
    config.descuentos[m] || 0;

  const total =
    price * m * (1 - discount);

  document.getElementById('t' + i).textContent =
    'Total: ' + money(total);

}


async function buy(plan, i) {

  const email =
    document.getElementById('e' + i).value.trim();

  const months =
    Number(document.getElementById('m' + i).value);

  if (!email) {

    alert('Ingresá tu Gmail.');

    return;

  }

  if (!email.includes('@')) {

    alert('Ingresá un Gmail válido.');

    return;

  }

  try {

    const response = await fetch(
      '/api/create-preference',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          plan,
          months,
          email
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {

      alert(
        data.error ||
        'No se pudo crear el pago.'
      );

      return;

    }

    /*
      IMPORTANTE:
      server.js devuelve el enlace
      como "url".
    */

    if (data.url) {

      window.location.href =
        data.url;

    } else {

      console.error(
        'Respuesta del servidor:',
        data
      );

      alert(
        'Mercado Pago no devolvió el enlace de pago.'
      );

    }

  } catch (error) {

    console.error(error);

    alert(
      'Ocurrió un error. Intentá nuevamente.'
    );

  }

}


loadConfig();

</script>

</body>
</html>;

let device;
let server;
let service;
let characteristics = {};

const SERVICE_UUID = '12345678-1234-1234-1234-1234567890ab';
const CHARACTERISTIC_UUIDS = {
  ssid: 'abcd0001-0000-0000-0000-000000000001',
  password: 'abcd0002-0000-0000-0000-000000000002',
  spreadFactor: 'abcd0003-0000-0000-0000-000000000003',
  sampleRate: 'abcd0004-0000-0000-0000-000000000004',
  data: 'abcd0005-0000-0000-0000-000000000005',
  ota: 'abcd0006-0000-0000-0000-000000000006'
};

document.getElementById('connectBtn').addEventListener('click', connectToDevice);
document.getElementById('sendConfigBtn').addEventListener('click', sendConfigurations);

const dropArea = document.getElementById('drop-area');
['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.add('hover');
  }, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove('hover');
  }, false);
});

dropArea.addEventListener('drop', handleFileDrop, false);

async function connectToDevice() {
  try {
    device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }]
    });

    server = await device.gatt.connect();
    service = await server.getPrimaryService(SERVICE_UUID);

    for (const [key, uuid] of Object.entries(CHARACTERISTIC_UUIDS)) {
      characteristics[key] = await service.getCharacteristic(uuid);
    }

    await characteristics.data.startNotifications();
    characteristics.data.addEventListener('characteristicvaluechanged', handleSensorData);

    alert('Conectado ao dispositivo BLE!');
  } catch (error) {
    console.error('Erro ao conectar:', error);
  }
}

function handleSensorData(event) {
  const value = new TextDecoder().decode(event.target.value);
  document.getElementById('sensorData').textContent += value + '\n';
}

async function sendConfigurations() {
  try {
    const ssid = document.getElementById('ssid').value;
    const password = document.getElementById('password').value;
    const sf = document.getElementById('sf').value;
    const sampleRate = document.getElementById('sampleRate').value;

    await characteristics.ssid.writeValue(new TextEncoder().encode(ssid));
    await characteristics.password.writeValue(new TextEncoder().encode(password));
    await characteristics.spreadFactor.writeValue(new TextEncoder().encode(sf));
    await characteristics.sampleRate.writeValue(new TextEncoder().encode(sampleRate));

    alert('Configurações enviadas com sucesso!');
  } catch (error) {
    console.error('Erro ao enviar configurações:', error);
  }
}

function handleFileDrop(e) {
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    const reader = new FileReader();
    reader.onload = async function() {
      const arrayBuffer = reader.result;
      const chunkSize = 512;
      for (let i = 0; i < arrayBuffer.byteLength; i += chunkSize) {
        const chunk = arrayBuffer.slice(i, i + chunkSize);
        await characteristics.ota.writeValue(new Uint8Array(chunk));
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      alert('Arquivo OTA enviado com sucesso!');
    };
    reader.readAsArrayBuffer(file);
  }
}

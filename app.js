let video = document.getElementById("video");
let canvas = document.getElementById("canvas");
let statusDiv = document.getElementById("status");
let resultadosTable = document.querySelector("#resultados tbody");

function onOpenCvReady() {
  statusDiv.textContent = "✅ OpenCV carregado! Iniciando câmera...";

  navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      processFrame();
    };
  }).catch(err => {
    statusDiv.textContent = "❌ Erro ao acessar câmera: " + err;
  });

  document.getElementById("captureBtn").onclick = () => {
    let link = document.createElement("a");
    link.download = "folha_detectada.png";
    link.href = canvas.toDataURL("image/png");
    link.click();

    let resultado = statusDiv.textContent.replace(/✔️|⚠️/g, "").trim();
    let row = resultadosTable.insertRow();
    row.insertCell().textContent = new Date().toLocaleString();
    row.insertCell().textContent = resultado;
  };
}

function processFrame() {
  let ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  let src = cv.imread(canvas);
  let gray = new cv.Mat(), blurred = new cv.Mat(), thresh = new cv.Mat();

  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
  cv.threshold(blurred, thresh, 60, 255, cv.THRESH_BINARY);

  let contours = new cv.MatVector(), hierarchy = new cv.Mat();
  cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  let circle = null, squares = [];
  for (let i = 0; i < contours.size(); ++i) {
    let cnt = contours.get(i);
    let area = cv.contourArea(cnt);
    if (area < 100) continue;

    let approx = new cv.Mat();
    cv.approxPolyDP(cnt, approx, 0.04 * cv.arcLength(cnt, true), true);
    let rect = cv.boundingRect(cnt);
    let center = [rect.x + rect.width / 2, rect.y + rect.height / 2];

    if (approx.rows > 8 && center[0] < canvas.width / 2 && center[1] < canvas.height / 2) {
      circle = center;
    } else if (approx.rows === 4) {
      squares.push(center);
    }

    approx.delete(); cnt.delete();
  }

  if (circle && squares.length === 3) {
    statusDiv.textContent = "✔️ Orientação correta!";
  } else {
    statusDiv.textContent = "⚠️ Marcadores ausentes ou posição incorreta.";
  }

  src.delete(); gray.delete(); blurred.delete(); thresh.delete();
  contours.delete(); hierarchy.delete();

  requestAnimationFrame(processFrame);
}

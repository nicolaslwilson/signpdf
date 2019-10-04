const annotations = [];
const pdfUrl = 'https://nicolaslwilson.github.io/signpdf/data/contract.pdf';
const sigUrl = 'https://nicolaslwilson.github.io/signpdf/data/signature.png';

main();

async function main() {

  const pdf = await pdfjsLib.getDocument(pdfUrl);
  const page = await pdf.getPage(1);
  const scale = 1.5;
  const viewport = page.getViewport({ scale });
  const canvas = document.getElementById('pdf-canvas');
  const canvasContext = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const renderContext = {
    canvasContext,
    viewport,
  };

  page.render(renderContext);

  addEventListeners();

}

function addEventListeners() {
  document.getElementById('add-annotation-btn').addEventListener('click', addSignatureAnnotation)
  document.getElementById('download-pdf-btn').addEventListener('click', renderAnnotatedPdf)

}

function addSignatureAnnotation() {
  const { annotation } = createAnnotationElement();
  annotations.push(annotation);
}

async function renderAnnotatedPdf() {
  const pdfBuffer = await fetch(pdfUrl)
    .then(res => res.arrayBuffer());

  const imgBuffer = await fetch(sigUrl)
    .then(res => res.arrayBuffer());

  const doc = await PDFLib.PDFDocument.load(pdfBuffer);

  const sigImage = await doc.embedPng(imgBuffer);

  const [page] = await doc.getPages();

  const canvasContainer = document.getElementById('canvas-container');

  const pdfToCanvasWidthRatio = page.getWidth() / canvasContainer.scrollWidth;
  const pdfToCanvasHeightRatio = page.getHeight() / canvasContainer.scrollHeight;

  annotations.forEach(annotation => {
    let width = annotation.width * pdfToCanvasWidthRatio;
    let scaledRatio = width / annotation.width;
    let height = annotation.height * scaledRatio;

    if ((height) > (annotation.height * pdfToCanvasHeightRatio)) {
      height = annotation.height * pdfToCanvasHeightRatio;
      scaledRatio = height / annotation.height;
      width = annotation.width * scaledRatio;
    }

    page.drawImage(sigImage, {
      x: annotation.x * pdfToCanvasWidthRatio,
      y: page.getHeight() - annotation.y * pdfToCanvasHeightRatio - height,
      width,
      height,
    });
  });

  const pdfBytes = await doc.save();

  return saveByteArray('signed.pdf', pdfBytes);
}

async function createAnnotationElement() {
  const annotationId = randomString(32);

  const annotation = {
    width: 100,
    height: 100,
    x: 0,
    y: 0,
  };

  const annotationEl = document.createElement('div')
  annotationEl.textContent = 'Signature';
  annotationEl.setAttribute('id', annotationId);
  annotationEl.setAttribute('style', 'z-index: 9999999; text-align: center; position: absolute; width: 100px; height: 100px; border: 2px solid black');

  document.getElementById('canvas-container')
    .prepend(annotationEl);

  interact(`#${annotationId}`)
    .draggable({
      origin: 'parent',
      listeners: {
        move(event) {
          annotation.x += event.dx
          annotation.y += event.dy

          event.target.style.transform =
            `translate(${annotation.x}px, ${annotation.y}px)`
        },
      }
    })
    .resizable({
      edges: { left: true, right: true, bottom: true, top: true },
    })
    .on('resizemove', event => {
      let { x, y } = annotation;

      // translate when resizing from top or left edges
      x += event.deltaRect.left
      y += event.deltaRect.top

      Object.assign(annotation, { x, y });
      annotation.width = event.rect.width;
      annotation.height = event.rect.height;

      Object.assign(event.target.style, {
        width: `${event.rect.width}px`,
        height: `${event.rect.height}px`,
        transform: `translate(${x}px, ${y}px)`
      })
    });

  return { annotation, annotationEl };
}

function randomString(length) {
  const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  array = array.map(x => validChars.charCodeAt(x % validChars.length));
  return String.fromCharCode(...array);
}

function saveByteArray(reportName, byte) {
  var blob = new Blob([byte], { type: "application/pdf" });
  var link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  var fileName = reportName;
  link.download = fileName;
  link.click();
};


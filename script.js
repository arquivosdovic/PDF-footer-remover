import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;

const input = document.getElementById('pdfInput');
const button = document.getElementById('processBtn');
const status = document.getElementById('status');

button.addEventListener('click', async () => {
  if (!input.files.length) {
    alert('Selecione um PDF.');
    return;
  }

  status.textContent = 'Processando...';

  const file = input.files[0];
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const newPdf = await PDFDocument.create();

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    const viewport = page.getViewport({ scale: 1 });
    const pageHeight = viewport.height;

    // Detectar menor Y onde texto aparece (provável rodapé)
    let minY = pageHeight;

    textContent.items.forEach((item) => {
      const y = item.transform[5];
      if (y < minY) {
        minY = y;
      }
    });

    // margem de segurança
    const footerThreshold = minY + 10;

    // Importar página original
    const srcDoc = await PDFDocument.load(arrayBuffer);
    const [copiedPage] = await newPdf.copyPages(srcDoc, [i - 1]);

    const { width, height } = copiedPage.getSize();

    // Reduzir altura da página
    copiedPage.setSize(width, footerThreshold);

    newPdf.addPage(copiedPage);
  }

  const pdfBytes = await newPdf.save();

  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'sem_rodape.pdf';
  a.click();

  status.textContent = 'Pronto!';
});

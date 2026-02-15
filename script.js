import { PDFDocument } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker'

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker()

const input = document.getElementById('pdfInput')
const button = document.getElementById('processBtn')
const status = document.getElementById('status')

button.addEventListener('click', async () => {
  if (!input.files.length) {
    alert("Selecione um PDF.")
    return
  }

  try {
    status.textContent = "Processando..."

    const file = input.files[0]
    const originalBuffer = await file.arrayBuffer()

    // 🔥 Clona o buffer para evitar erro de "detached ArrayBuffer"
    const bufferForPdfJs = originalBuffer.slice(0)
    const bufferForPdfLib = originalBuffer.slice(0)

    // ===== PDF.JS (análise de texto) =====
    const loadingTask = pdfjsLib.getDocument({ data: bufferForPdfJs })
    const pdf = await loadingTask.promise

    // ===== PDF-LIB (edição) =====
    const srcDoc = await PDFDocument.load(bufferForPdfLib)
    const newPdf = await PDFDocument.create()

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()

      const viewport = page.getViewport({ scale: 1 })
      const pageHeight = viewport.height

      let minY = pageHeight

      textContent.items.forEach(item => {
        const y = item.transform[5]
        if (y < minY) {
          minY = y
        }
      })

      const footerHeight = minY + 10

      const [copiedPage] = await newPdf.copyPages(srcDoc, [i - 1])

      const { width, height } = copiedPage.getSize()

      // 🔥 Remove somente a parte inferior (rodapé)
      copiedPage.setCropBox(0, footerHeight, width, height - footerHeight)

      newPdf.addPage(copiedPage)
    }

    const pdfBytes = await newPdf.save()

    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = "sem_rodape.pdf"
    a.click()

    URL.revokeObjectURL(url)

    status.textContent = "Pronto!"
  } catch (error) {
    console.error(error)
    status.textCont

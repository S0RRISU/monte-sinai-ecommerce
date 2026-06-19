import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fullDate, money } from '@/lib/format';
import { getPdfLogoDataUrl } from '@/lib/pdf-logo';
import type { Order } from '@/lib/types';

type PdfWithAutoTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

const margin = 14;

export async function downloadOrderReceipt(order: Order) {
  const pdf = await buildReceiptPdf(order);
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `comprovante-${safeFileName(order.code)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
}

async function buildReceiptPdf(order: Order) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' }) as PdfWithAutoTable;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const logo = await getPdfLogoDataUrl();

  function drawHeader() {
    pdf.setFillColor(242, 247, 255);
    pdf.rect(0, 0, pageWidth, 32, 'F');

    if (logo) {
      pdf.addImage(logo, 'PNG', margin, 7, 31, 18);
    } else {
      pdf.setTextColor(0, 48, 118);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('MONTE SINAI', margin, 15);
      pdf.setFontSize(8);
      pdf.text('Agua, Gas e Limpeza', margin, 21);
    }

    pdf.setTextColor(8, 21, 43);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('COMPROVANTE DE PEDIDO', pageWidth - margin, 14, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(82, 96, 121);
    pdf.text(`#${sanitizeText(order.code)}`, pageWidth - margin, 21, { align: 'right' });
    pdf.setDrawColor(187, 204, 229);
    pdf.line(margin, 34, pageWidth - margin, 34);
  }

  drawHeader();

  let y = 45;
  pdf.setFillColor(250, 252, 255);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 28, 2.5, 2.5, 'F');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(82, 96, 121);
  pdf.text('Documento', margin + 5, y + 8);
  pdf.text('Gerado em', pageWidth - margin - 58, y + 8);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(8, 21, 43);
  pdf.text(`Comprovante #${sanitizeText(order.code)}`, margin + 5, y + 17);
  pdf.setFontSize(9);
  pdf.text(formatNow(), pageWidth - margin - 58, y + 17);
  pdf.setTextColor(0, 107, 94);
  pdf.setFontSize(12);
  pdf.text(`Total ${money(order.total)}`, pageWidth - margin - 58, y + 25);
  y += 40;

  y = drawSection(pdf, 'Cliente', y);
  y = drawInfoRow(pdf, y, 'Nome', order.customer.name || 'Cliente sem nome');
  y = drawInfoRow(pdf, y, 'Telefone', order.customer.phone || 'Nao informado');
  y = drawInfoRow(pdf, y, 'Email', order.customer.email || 'Nao informado');
  y = drawWrappedRow(pdf, y, 'Endereco', order.customer.address || 'Nao informado', pageWidth - margin * 2 - 42);

  y = drawSection(pdf, 'Pedido', y + 3);
  y = drawInfoRow(pdf, y, 'Data do pedido', fullDate(order.createdAt));
  y = drawInfoRow(pdf, y, 'Status do pedido', order.status);
  y = drawInfoRow(pdf, y, 'Pagamento', order.payment || 'Nao informado');
  y = drawInfoRow(pdf, y, 'Status pagamento', order.paymentStatus);

  y = drawSection(pdf, 'Itens', y + 3);
  autoTable(pdf, {
    startY: y,
    head: [['Produto', 'Qtd.', 'Unit.', 'Subtotal']],
    body: order.items.map((item) => {
      const itemTotal = item.total || item.price * item.quantity;
      return [
        item.variation ? `${sanitizeText(item.name)}\n${sanitizeText(item.variation)}` : sanitizeText(item.name),
        String(item.quantity),
        money(item.price),
        money(itemTotal)
      ];
    }),
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.4,
      lineColor: [202, 212, 227],
      textColor: [16, 21, 43],
      valign: 'top'
    },
    headStyles: {
      fillColor: [0, 48, 118],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [246, 249, 253]
    },
    columnStyles: {
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right', cellWidth: 28 },
      3: { halign: 'right', cellWidth: 32 }
    },
    margin: { left: margin, right: margin, top: 42 },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) drawHeader();
    }
  });

  y = (pdf.lastAutoTable?.finalY || y) + 10;
  if (y > pageHeight - 58) {
    pdf.addPage();
    drawHeader();
    y = 45;
  }

  const subtotal = order.subtotal || order.items.reduce((sum, item) => sum + (item.total || item.price * item.quantity), 0);
  y = drawTotalRow(pdf, y, pageWidth, 'Subtotal', money(subtotal));
  y = drawTotalRow(pdf, y, pageWidth, 'Entrega', money(order.delivery));
  y = drawTotalRow(pdf, y, pageWidth, 'Desconto', `-${money(order.discount)}`);
  pdf.setDrawColor(187, 204, 229);
  pdf.line(pageWidth - margin - 70, y, pageWidth - margin, y);
  y += 7;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(8, 21, 43);
  pdf.text('Total', pageWidth - margin - 70, y);
  pdf.setTextColor(0, 107, 94);
  pdf.text(money(order.total), pageWidth - margin, y, { align: 'right' });

  y += 15;
  if (y > pageHeight - 26) {
    pdf.addPage();
    drawHeader();
    y = 45;
  }
  pdf.setDrawColor(187, 204, 229);
  pdf.line(margin, y, pageWidth - margin, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(82, 96, 121);
  pdf.text('Este comprovante foi gerado pelo Painel Monte Sinai a partir dos dados registrados no pedido.', margin, y + 8);
  pdf.text('Nao substitui documento fiscal quando aplicavel.', margin, y + 14);

  const totalPages = pdf.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(82, 96, 121);
    pdf.text(`Pagina ${page} de ${totalPages}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
  }

  return pdf;
}

function drawSection(pdf: jsPDF, title: string, y: number) {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(8, 21, 43);
  pdf.text(title, margin, y);
  pdf.setDrawColor(187, 204, 229);
  pdf.line(margin, y + 4, pdf.internal.pageSize.getWidth() - margin, y + 4);
  return y + 12;
}

function drawInfoRow(pdf: jsPDF, y: number, label: string, value: string) {
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(82, 96, 121);
  pdf.text(label, margin, y);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(8, 21, 43);
  pdf.text(sanitizeText(value), margin + 42, y);
  return y + 7;
}

function drawWrappedRow(pdf: jsPDF, y: number, label: string, value: string, maxWidth: number) {
  const lines = pdf.splitTextToSize(sanitizeText(value), maxWidth) as string[];
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(82, 96, 121);
  pdf.text(label, margin, y);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(8, 21, 43);
  pdf.text(lines, margin + 42, y);
  return y + Math.max(lines.length, 1) * 5.2 + 2;
}

function drawTotalRow(pdf: jsPDF, y: number, pageWidth: number, label: string, value: string) {
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(82, 96, 121);
  pdf.text(label, pageWidth - margin - 70, y);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(8, 21, 43);
  pdf.text(value, pageWidth - margin, y, { align: 'right' });
  return y + 7;
}

function sanitizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '-');
}

function safeFileName(value: string) {
  return sanitizeText(value).replace(/[^a-zA-Z0-9_-]/g, '-');
}

function formatNow() {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date());
}

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { exportToExcelExcelJS } from './excelExport';

interface TableColumn {
    header: string;
    dataKey: string;
}

export interface ExportData {
    title: string;
    subtitle?: string;
    filename: string;
    headers: TableColumn[];
    rows: Record<string, unknown>[];
    summary?: (string | number)[][]; // 2D array for key-value summary blocks
}

/**
 * Configure un document PDF au format A4.
 */
function createPdfDocument(title: string, subtitle?: string): jsPDF {
    const doc = new jsPDF();

    // Titre
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(title, 14, 22);

    // Sous-titre ou Date
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    const dateStr = format(new Date(), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
    doc.text(`${subtitle ? subtitle + ' - ' : ''}Généré le ${dateStr}`, 14, 30);

    // Ligne de séparation
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(14, 35, 196, 35);

    return doc;
}

function addFooter(doc: jsPDF) {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(
            `Outils Comptables - Appmato | Page ${i} / ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
        );
    }
}

/**
 * Exporter des données au format PDF
 */
export function exportToPDF(data: ExportData) {
    const doc = createPdfDocument(data.title, data.subtitle);
    let startY = 45;

    // Add Summary if provided (Key/Value pairs)
    if (data.summary && data.summary.length > 0) {
        autoTable(doc, {
            startY,
            body: data.summary,
            theme: 'plain',
            styles: { fontSize: 11, cellPadding: 3 },
            columnStyles: {
                0: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 80 },
                1: { textColor: [15, 23, 42] }
            },
            margin: { left: 14 }
        });
        startY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY;
    }

    // Add Main Data Table
    if (data.headers.length > 0 && data.rows.length > 0) {
        autoTable(doc, {
            startY,
            head: [data.headers.map(h => h.header)],
            body: data.rows.map(row => data.headers.map(h => row[h.dataKey])),
            theme: 'striped',
            headStyles: {
                fillColor: [15, 23, 42], // slate-900 (primary)
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                fontSize: 9,
                cellPadding: 4,
                textColor: [51, 65, 85] // slate-700
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // slate-50
            },
            // Right align number columns implicitly by checking the first row
            didParseCell: function (dataParse) {
                if (dataParse.section === 'body') {
                    const val = dataParse.cell.raw;
                    // If the string contains € or is mostly numbers, align right
                    if (typeof val === 'string' && (val.includes('€') || /^[\d\s,.-]+(%)?$/.test(val))) {
                        dataParse.cell.styles.halign = 'right';
                    } else if (typeof val === 'number') {
                        dataParse.cell.styles.halign = 'right';
                    }
                }
            }
        });
    }

    addFooter(doc);
    doc.save(`${data.filename}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
}

/**
 * Exporter des données au format Excel natif (XLSX)
 */
export function exportToExcel(data: ExportData) {
    exportToExcelExcelJS(data);
}

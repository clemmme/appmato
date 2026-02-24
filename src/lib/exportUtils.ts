import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
    const wb = XLSX.utils.book_new();

    // 1. Prepare Summary Data if present
    const sheetData: (string | number)[][] = [];

    if (data.subtitle) {
        sheetData.push([data.subtitle]);
    }

    sheetData.push([`Généré le:`, format(new Date(), "dd/MM/yyyy HH:mm")]);
    sheetData.push([]); // Empty line

    if (data.summary && data.summary.length > 0) {
        sheetData.push(...data.summary);
        sheetData.push([]); // Empty line
    }

    // 2. Prepare Headers for Main Table
    if (data.headers.length > 0) {
        sheetData.push(data.headers.map(h => h.header));

        // 3. Prepare Data rows (Strip euro signs and format strings to raw numbers where possible)
        const numericRows = data.rows.map(row => {
            return data.headers.map(h => {
                const val = row[h.dataKey] as string | number;
                if (typeof val === 'string') {
                    // Try to clean "1 250,50 €" to Number(1250.50) for proper Excel typing
                    const cleaned = val.replace(/€|km|h\/sem/g, '').replace(/\s/g, '').replace(',', '.');
                    if (!isNaN(Number(cleaned)) && cleaned.trim() !== '') {
                        return Number(cleaned);
                    }
                }
                return val;
            });
        });

        sheetData.push(...numericRows);
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Adjust column widths automatically
    const cols = [{ wch: 30 }]; // First col slightly wider usually
    for (let i = 1; i < (data.headers.length || 5); i++) {
        cols.push({ wch: 15 });
    }
    ws['!cols'] = cols;

    XLSX.utils.book_append_sheet(wb, ws, "Simulation");

    XLSX.writeFile(wb, `${data.filename}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
}

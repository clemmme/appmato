// src/lib/excelExport.ts
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { ExportData } from './exportUtils';

/**
 * Export data to Excel using exceljs (replaces xlsx library).
 */
export async function exportToExcelExcelJS(data: ExportData) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Simulation');

    // Subtitle and generation date
    let rowIdx = 1;
    if (data.subtitle) {
        ws.getCell(`A${rowIdx}`).value = data.subtitle;
        rowIdx++;
    }
    ws.getCell(`A${rowIdx}`).value = `Généré le:`;
    ws.getCell(`B${rowIdx}`).value = format(new Date(), 'dd/MM/yyyy HH:mm');
    rowIdx++;
    rowIdx++; // empty line

    // Summary if present
    if (data.summary && data.summary.length > 0) {
        data.summary.forEach(s => {
            ws.addRow(s as (string | number)[]);
        });
        ws.addRow([]);
    }

    // Headers
    if (data.headers.length > 0) {
        ws.addRow(data.headers.map(h => h.header));
        // Data rows
        data.rows.forEach(row => {
            const values = data.headers.map(h => {
                const val = (row as Record<string, unknown>)[h.dataKey];
                if (typeof val === 'string') {
                    const cleaned = val.replace(/€|km|h\/sem/g, '').replace(/\s/g, '').replace(',', '.');
                    if (!isNaN(Number(cleaned)) && cleaned.trim() !== '') {
                        return Number(cleaned);
                    }
                }
                return val;
            });
            ws.addRow(values);
        });
    }

    // Adjust column widths
    ws.columns = data.headers.map((_, i) => ({ width: i === 0 ? 30 : 15 }));

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${data.filename}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
}

/**
 * Parse Excel file to JSON using exceljs
 */
export async function parseExcelFile(file: File): Promise<Record<string, unknown>[]> {
    const wb = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await wb.xlsx.load(buffer);

    const ws = wb.worksheets[0];
    const jsonData: Record<string, unknown>[] = [];

    const headers: string[] = [];
    const firstRow = ws.getRow(1);
    firstRow.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString() || `Column${colNumber}`;
    });

    ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header
        const rowData: Record<string, unknown> = {};
        row.eachCell((cell, colNumber) => {
            rowData[headers[colNumber]] = cell.value;
        });
        jsonData.push(rowData);
    });

    return jsonData;
}

/**
 * Generate and download import template
 */
export async function downloadImportTemplate(template: Record<string, unknown>[], filename: string) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Clients');

    if (template.length > 0) {
        ws.addRow(Object.keys(template[0]));
        template.forEach(item => {
            ws.addRow(Object.values(item));
        });
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
}

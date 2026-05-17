import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';
import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

const FORM_MAPPING = {
  tablet: ['tablet', 'tab', 'tabs', 'f.c. tab', 'fc tab', 'film-coated', 'chewable tab', 'orodispersible', 'dispersible tab', 'effervescent tab', 'caplet', 'f.c. tablet'],
  syrup: ['syrup', 'syr', 'siro', 'oral solution', 'liquid'],
  suspension: ['suspension', 'susp', 'dry suspension', 'oral suspension', 'pediatric suspension'],
  capsule: ['capsule', 'cap', 'caps', 'hard capsule', 'soft capsule', 'delayed release cap'],
  injection: ['injection', 'amp', 'ampoule', 'ampule', 'vial', 'inj', 'iv', 'im', 'sc', 'prefilled syringe', 'pf syringe', 'pf.syringe', 'pen', 'injectable'],
  drops: ['drops', 'drop', 'eye drop', 'ear drop', 'nasal drop', 'ophthalmic', 'otc drop', 'eye drops', 'ear drops'],
  cream: ['cream', 'cre', 'topical cream', 'dermal cream', 'lotion', 'gel', 'gel cream'],
  ointment: ['ointment', 'oint', 'oint.', 'ophthalmic ointment', 'nasal ointment', 'topical ointment'],
  suppository: ['suppository', 'supp', 'supp.', 'pediatric suppository', 'rectal suppository', 'vaginal suppository'],
  solution: ['solution', 'sol', 'oral solution', 'inhalation solution', 'dental solution', 'ear solution', 'enema'],
  inhaler: ['inhaler', 'inhal', 'inhalation', 'inhalator', 'nebulizer', 'nebule', 'respule', 'puff', 'mdi', 'dry powder inhaler', 'dpi'],
  sachet: ['sachet', 'sach', 'powder', 'oral powder', 'granules', 'dry powder', 'sprinkle'],
  other: [],
};

function normalizeForm(rawString) {
  if (!rawString || typeof rawString !== 'string') {
    return 'other';
  }

  const normalized = rawString.toLowerCase().trim();

  if (!normalized || normalized.length === 0) {
    return 'other';
  }

  for (const [form, keywords] of Object.entries(FORM_MAPPING)) {
    if (form === 'other') continue;

    for (const keyword of keywords) {
      if (normalized.includes(keyword) || normalized === keyword) {
        return form;
      }
    }

    const formKeyword = form.substring(0, Math.max(3, Math.floor(form.length * 0.5)));
    if (normalized.includes(formKeyword)) {
      return form;
    }
  }

  return 'other';
}

function generateRandomBarcode(prefix = 'RAND') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let barcode = prefix;
  for (let i = 0; i < 10; i++) {
    barcode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return barcode;
}

function cleanString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  return String(value).trim();
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value).replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function parseInteger(value) {
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value).replace(/[^\d-]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

function mapRowToDrug(row, rowIndex, options = {}) {
  const {
    excelIdFields: ['id', 'ID', 'Excel ID', 'excelId', 'excel_id', 'code', 'Code'],
    nameFields = ['اسم انجليزي', 'اسم عربي', 'اسم الدواء', 'name', 'Name'],
    arabicNameFields = ['اسم عربي', 'الاسم العربي', 'arabic name', 'arabicName'],
    barcodeFields = ['باركود دولي', 'barcode', 'Barcode', 'code'],
    genericNameFields = ['مادة فعالة', 'generic name', 'genericName', 'active ingredient', 'active_ingredient'],
    categoryFields = ['الفئة', 'category', 'Category', 'group', 'type'],
    dosageFormFields = ['شكل صيدلاني', 'dosage form', 'dosageForm', 'form', 'Form', 'unit', 'Unit'],
    strengthFields = ['القوة', 'strength', 'Strength', 'dose', 'Dosage', 'mg', 'amount'],
    sellPriceFields = ['سعر جديد', 'selling price', 'sell_price', 'sellPrice', 'price', 'Price', 'سعر البيع', 'سعر الجمهور'],
    costPriceFields = ['سعر قديم', 'cost price', 'cost_price', 'costPrice', 'purchase price', 'wholesale'],
    stockFields = ['كمية', 'الكمية', 'quantity', 'Quantity', 'stock', 'Stock', 'qty'],
    manufacturerFields = ['الشركة', 'company', 'manufacturer', 'Manufacturer', 'factory', 'make'],
    expiryFields = ['تاريخ الانتهاء', 'expiry', 'expiry date', 'expire date', 'exp'],
  } = options;

  const getFieldValue = (fields) => {
    for (const field of fields) {
      if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
        return row[field];
      }
    }
    return null;
  };

  const name = cleanString(getFieldValue(nameFields)) || `Unknown Drug ${rowIndex + 1}`;
  const arabicName = cleanString(getFieldValue(arabicNameFields));
  const excelId = parseInteger(getFieldValue(excelIdFields)) || null;
  let barcode = cleanString(getFieldValue(barcodeFields));

  if (!barcode || barcode === 'N/A' || barcode === 'n/a' || barcode.length < 3) {
    barcode = generateRandomBarcode(name.substring(0, 4).toUpperCase().replace(/\s/g, ''));
  }

  const genericName = cleanString(getFieldValue(genericNameFields));
  const category = cleanString(getFieldValue(categoryFields));
  const rawDosageForm = getFieldValue(dosageFormFields);
  const normalizedDosageForm = normalizeForm(rawDosageForm);
  const strength = cleanString(getFieldValue(strengthFields));
  const manufacturer = cleanString(getFieldValue(manufacturerFields)) || 'Unknown';

  const sellPrice = parseNumber(getFieldValue(sellPriceFields));
  const costPrice = parseNumber(getFieldValue(costPriceFields)) || sellPrice * 0.6;
  const stock = parseInteger(getFieldValue(stockFields));

  let expiryDate = null;
  const rawExpiry = getFieldValue(expiryFields);
  if (rawExpiry) {
    try {
      const cleanedExpiry = cleanString(rawExpiry);
      if (cleanedExpiry.match(/^\d{1,2}\/\d{2}\/?\d{0,4}$/)) {
        const parts = cleanedExpiry.split('/');
        const month = parseInt(parts[0], 10);
        const year = parts[1].length === 2 ? 2000 + parseInt(parts[1], 10) : parseInt(parts[1], 10);
        expiryDate = new Date(year, month - 1, 1);
      } else if (cleanedExpiry.match(/^\d{4}-\d{2}-\d{2}/)) {
        expiryDate = new Date(cleanedExpiry);
      }
    } catch (e) {
      console.warn(`Could not parse expiry date for row ${rowIndex + 1}: ${rawExpiry}`);
    }
  }

  return {
    name,
    arabicName,
    barcode,
    excelId,
    genericName,
    description: category,
    strength,
    dosageForm: normalizedDosageForm,
    manufacturer,
    sellPrice,
    costPrice,
    stock,
    expiryDate,
    originalRow: rowIndex + 2,
    originalDosageForm: rawDosageForm,
  };
}

function readCSVFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv') {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = [];
      let current = '';
      let inQuotes = false;

      for (const char of lines[i]) {
        if (char === '"' && !inQuotes) {
          inQuotes = true;
        } else if (char === '"' && inQuotes) {
          inQuotes = false;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }

    return data;
  } else if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  } else {
    throw new Error(`Unsupported file format: ${ext}. Please use .csv or .xlsx`);
  }
}

async function checkExistingDrug(prisma, name, barcode) {
  return await prisma.drug.findFirst({
    where: {
      OR: [
        { barcode: barcode },
        { name: name },
      ],
    },
  });
}

async function insertOrUpdateDrug(prisma, drugData, options = {}) {
  const { updateExisting = true } = options;

  const existing = await checkExistingDrug(prisma, drugData.name, drugData.barcode);

  if (existing) {
    if (!updateExisting) {
      return { action: 'skipped', id: existing.id, reason: 'already exists' };
    }

    const updated = await prisma.drug.update({
      where: { id: existing.id },
      data: {
        arabicName: drugData.arabicName || existing.arabicName,
        sellPrice: drugData.sellPrice || existing.sellPrice,
        costPrice: drugData.costPrice || existing.costPrice,
        stock: (existing.stock || 0) + (drugData.stock || 0),
      },
    });

    return { action: 'updated', id: updated.id };
  }

const created = await prisma.drug.create({
      data: {
        name: drugData.name,
        arabicName: drugData.arabicName || null,
        barcode: drugData.barcode,
        excelId: drugData.excelId || null,
        genericName: drugData.genericName || '',
        description: drugData.description || '',
        strength: drugData.strength || '',
        dosageForm: drugData.dosageForm,
        manufacturer: drugData.manufacturer,
        sellPrice: drugData.sellPrice || 0,
        costPrice: drugData.costPrice || 0,
        stock: drugData.stock || 0,
        status: 'ACTIVE',
      },
    });

  return { action: 'created', id: created.id };
}

async function bulkInsertDrugs(prisma, drugs, options = {}) {
  const { batchSize = 50, onProgress = null } = options;

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    formDistribution: {},
  };

  for (let i = 0; i < drugs.length; i++) {
    const drug = drugs[i];

    try {
      const result = await insertOrUpdateDrug(prisma, drug, options);

      if (result.action === 'created') results.created++;
      else if (result.action === 'updated') results.updated++;
      else if (result.action === 'skipped') results.skipped++;

      const form = drug.dosageForm;
      results.formDistribution[form] = (results.formDistribution[form] || 0) + 1;

      if (onProgress && typeof onProgress === 'function') {
        onProgress({
          current: i + 1,
          total: drugs.length,
          percentage: Math.round(((i + 1) / drugs.length) * 100),
          currentDrug: drug.name,
          lastResult: result,
        });
      }
    } catch (error) {
      results.errors.push({
        row: drug.originalRow,
        name: drug.name,
        error: error.message,
      });

      console.error(`Error processing row ${drug.originalRow} (${drug.name}): ${error.message}`);
    }

    if ((i + 1) % batchSize === 0) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  return results;
}

async function generateImportReport(results, outputPath = null) {
  const report = {
    summary: {
      total: results.created + results.updated + results.skipped + results.errors.length,
      created: results.created,
      updated: results.updated,
      skipped: results.skipped,
      errors: results.errors.length,
      successRate: `${(((results.created + results.updated) / (results.created + results.updated + results.skipped + results.errors.length)) * 100).toFixed(2)}%`,
    },
    formDistribution: results.formDistribution,
    errors: results.errors,
    generatedAt: new Date().toISOString(),
  };

  const reportString = `
================================================================================
                    DRUG IMPORT REPORT
================================================================================
Generated: ${report.generatedAt}

SUMMARY
--------------------------------------------------------------------------------
Total Records Processed: ${report.summary.total}
Successfully Created:    ${report.summary.created}
Updated:                 ${report.summary.updated}
Skipped:                  ${report.summary.skipped}
Errors:                   ${report.summary.errors}
Success Rate:             ${report.summary.successRate}

FORM DISTRIBUTION
--------------------------------------------------------------------------------
${Object.entries(report.formDistribution)
  .sort((a, b) => b[1] - a[1])
  .map(([form, count]) => `${form.padEnd(15)} ${count}`)
  .join('\n')}

ERRORS (First 20)
--------------------------------------------------------------------------------
${results.errors.slice(0, 20).map(e => `Row ${e.row}: ${e.name} - ${e.error}`).join('\n') || 'No errors'}

================================================================================
`;

  console.log(reportString);

  if (outputPath) {
    fs.writeFileSync(outputPath, reportString);
    console.log(`Report saved to: ${outputPath}`);
  }

  return report;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Drug Import Script
==================

Usage:
  node importDrugs.js <file_path> [options]

Arguments:
  file_path           Path to CSV or Excel file containing drug data

Options:
  --dry-run           Preview changes without actually inserting into database
  --batch-size=N      Number of records to process in each batch (default: 50)
  --no-update         Skip updating existing drugs, only create new ones
  --output-report     Generate a detailed report file
  --help              Show this help message

CSV/Excel Column Mappings (Auto-detected):
  - الاسم الانجليزي, اسم عربي, باركود دولي, مادة فعالة, الفئة
  - شكل صيدلاني, القوة, سعر جديد, سعر قديم, كمية, الشركة
  - Also supports: name, barcode, genericName, form, price, etc.

Examples:
  node importDrugs.js ./drugs.csv
  node importDrugs.js ./drugs.xlsx --dry-run
  node importDrugs.js ./drugs.csv --batch-size=100 --no-update
`);
    return;
  }

  if (args.includes('--help')) {
    console.log(`
Drug Import Script - Normalizes and imports Egyptian pharmacy data

Features:
  - Auto-detects CSV and Excel formats
  - Smart dosage form normalization
  - Upsert logic (creates or updates existing drugs)
  - Detailed reporting
  - Dry-run mode for testing

For more information, run without arguments.
`);
    return;
  }

  let filePath = null;
  let dryRun = args.includes('--dry-run');
  let batchSize = 50;
  let updateExisting = true;
  let generateReport = args.includes('--output-report');

  for (const arg of args) {
    if (arg.startsWith('--batch-size=')) {
      batchSize = parseInt(arg.split('=')[1], 10) || 50;
    } else if (!arg.startsWith('--') && fs.existsSync(arg)) {
      filePath = arg;
    }
  }

  if (!filePath) {
    console.error('Error: Please provide a valid file path.');
    console.error('Usage: node importDrugs.js <file_path> [options]');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('DRUG IMPORT SCRIPT');
  console.log('='.repeat(60));
  console.log(`File: ${filePath}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log(`Batch Size: ${batchSize}`);
  console.log(`Update Existing: ${updateExisting}`);
  console.log('='.repeat(60));

  try {
    console.log('\n[1/5] Reading file...');
    const rawData = readCSVFile(filePath);
    console.log(`Found ${rawData.length} rows`);

    console.log('\n[2/5] Mapping and normalizing data...');
    const mappedDrugs = rawData.map((row, index) => mapRowToDrug(row, index));
    console.log(`Mapped ${mappedDrugs.length} drugs`);

    const formCounts = {};
    mappedDrugs.forEach(d => {
      formCounts[d.dosageForm] = (formCounts[d.dosageForm] || 0) + 1;
    });
    console.log('\nDosage Form Distribution (after normalization):');
    Object.entries(formCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([form, count]) => {
        console.log(`  ${form.padEnd(15)} : ${count.toString().padStart(5)}`);
      });

    if (dryRun) {
      console.log('\n[DRY RUN] Sample of first 5 drugs to be imported:');
      mappedDrugs.slice(0, 5).forEach((drug, i) => {
        console.log(`  ${i + 1}. ${drug.name}`);
        console.log(`     Arabic: ${drug.arabicName || 'N/A'}`);
        console.log(`     Form: ${drug.originalDosageForm} -> ${drug.dosageForm}`);
        console.log(`     Price: ${drug.sellPrice}, Stock: ${drug.stock}`);
      });

      console.log(`\n[DRY RUN] Would import ${mappedDrugs.length} drugs.`);
      console.log('[DRY RUN] No database changes were made.');
      return;
    }

    console.log('\n[3/5] Connecting to database...');
    await prisma.$connect();
    console.log('Database connected');

    console.log('\n[4/5] Importing drugs...');
    const results = await bulkInsertDrugs(prisma, mappedDrugs, {
      batchSize,
      updateExisting,
      onProgress: ({ current, total, percentage, currentDrug }) => {
        if (current % 100 === 0 || current === total) {
          console.log(`Progress: ${current}/${total} (${percentage}%) - ${currentDrug}`);
        }
      },
    });

    console.log('\n[5/5] Generating report...');
    const report = await generateImportReport(
      results,
      generateReport ? filePath.replace(/\.(csv|xlsx|xls)$/i, '_import_report.txt') : null
    );

    console.log('\n' + '='.repeat(60));
    console.log('IMPORT COMPLETED');
    console.log('='.repeat(60));
    console.log(`Created: ${results.created}`);
    console.log(`Updated: ${results.updated}`);
    console.log(`Skipped: ${results.skipped}`);
    console.log(`Errors: ${results.errors.length}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\nError during import:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('Database connection closed.');
  }
}

main().catch(console.error);

export { normalizeForm, mapRowToDrug, readCSVFile, bulkInsertDrugs };
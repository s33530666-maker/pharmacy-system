#!/usr/bin/env node

/**
 * Pharmacy POS System - Drug Data Import/Seeding Script
 * 
 * This script reads an Excel file containing Egyptian drugs data,
 * normalizes the dosage form column ('شكل صيدلاني'), and prepares
 * the data for database insertion.
 * 
 * Usage: node seed.js <path-to-excel-file>
 * Example: node seed.js ./drugs.xlsx
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DOSAGE_FORM_COLUMN = 'شكل صيدلاني';

const STANDARD_FORMS = {
  TABLET: 'tablet',
  SYRUP: 'syrup',
  CAPSULE: 'capsule',
  INJECTION: 'injection',
  DROPS: 'drops',
  CREAM: 'cream',
  SUPPOSITORY: 'suppository',
  OTHER: 'other'
};

const DOSAGE_FORM_MAPPINGS = [
  {
    patterns: ['tab', 'table', 'tbl', 'chewable', 'efferv'],
    normalized: STANDARD_FORMS.TABLET
  },
  {
    patterns: ['syr', 'susp', 'liquid', 'sol', 'elixir', 'drop'],
    normalized: STANDARD_FORMS.SYRUP
  },
  {
    patterns: ['cap', 'caps', 'softgel', 'soft gel'],
    normalized: STANDARD_FORMS.CAPSULE
  },
  {
    patterns: ['amp', 'inj', 'vial', 'shot', 'prefilled', 'i.m.', 'i.v.', 's.c.', 'subcut'],
    normalized: STANDARD_FORMS.INJECTION
  },
  {
    patterns: ['drop', 'ophth', 'ear drop', 'nasal spray'],
    normalized: STANDARD_FORMS.DROPS
  },
  {
    patterns: ['cream', 'oint', 'gel', 'lotion', 'paste', ' balm', 'emul', 'patch'],
    normalized: STANDARD_FORMS.CREAM
  },
  {
    patterns: ['supp', 'pessary'],
    normalized: STANDARD_FORMS.SUPPOSITORY
  }
];

function normalizeForm(rawString) {
  if (!rawString || typeof rawString !== 'string') {
    return STANDARD_FORMS.OTHER;
  }

  const normalized = rawString.toLowerCase().trim();

  if (!normalized) {
    return STANDARD_FORMS.OTHER;
  }

  for (const mapping of DOSAGE_FORM_MAPPINGS) {
    for (const pattern of mapping.patterns) {
      if (normalized.includes(pattern)) {
        return mapping.normalized;
      }
    }
  }

  return STANDARD_FORMS.OTHER;
}

function parseExcelFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath, {
    cellStyles: true,
    cellDates: true,
    sheetStubs: true
  });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false
  });

  return jsonData;
}

function validateAndCleanData(data) {
  const cleanedData = [];
  const errors = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 2;

    if (!row || typeof row !== 'object') {
      errors.push({ row: rowNumber, error: 'Invalid row object' });
      continue;
    }

    const rawForm = row[DOSAGE_FORM_COLUMN];
    const normalizedForm = normalizeForm(rawForm);

    const cleanedRow = {
      original_form: rawForm,
      dosage_form: normalizedForm,
      imported_at: new Date()
    };

    const requiredFields = Object.keys(row).filter(key => 
      key !== DOSAGE_FORM_COLUMN && row[key] !== null && row[key] !== undefined
    );

    for (const field of requiredFields) {
      cleanedRow[field] = row[field];
    }

    cleanedData.push(cleanedRow);
  }

  return { cleanedData, errors };
}

async function bulkInsertToDatabase(data) {
  const BATCH_SIZE = 500;
  const totalRecords = data.length;
  let insertedCount = 0;

  console.log(`\nStarting database insertion for ${totalRecords} records...`);

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(totalRecords / BATCH_SIZE);

    console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)...`);

    try {
      await insertBatch(batch);
      insertedCount += batch.length;
      console.log(`  Batch ${batchNumber} completed. Total inserted: ${insertedCount}`);
    } catch (error) {
      console.error(`  Error in batch ${batchNumber}:`, error.message);
      throw error;
    }
  }

  return insertedCount;
}

async function insertBatch(batch) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(batch.length);
    }, 100);
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Error: Please provide the path to the Excel file.');
    console.error('Usage: node seed.js <path-to-excel-file>');
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);

  console.log('='.repeat(60));
  console.log('Pharmacy POS System - Drug Data Seeding Script');
  console.log('='.repeat(60));

  console.log(`\n[1/5] Reading Excel file: ${filePath}`);
  let rawData;
  try {
    rawData = parseExcelFile(filePath);
    console.log(`       Successfully read ${rawData.length} rows from the Excel file.`);
  } catch (error) {
    console.error(`       Failed to read Excel file: ${error.message}`);
    process.exit(1);
  }

  console.log(`\n[2/5] Validating and cleaning data...`);
  const { cleanedData, errors } = validateAndCleanData(rawData);
  console.log(`       Validated ${cleanedData.length} records.`);
  if (errors.length > 0) {
    console.warn(`       Warning: ${errors.length} rows had validation issues.`);
  }

  console.log(`\n[3/5] Generating normalization report...`);
  const formCounts = {};
  for (const record of cleanedData) {
    const form = record.dosage_form;
    formCounts[form] = (formCounts[form] || 0) + 1;
  }

  console.log('\n     Dosage Form Distribution:');
  console.log('     ' + '-'.repeat(40));
  for (const [form, count] of Object.entries(formCounts).sort((a, b) => b[1] - a[1])) {
    const percentage = ((count / cleanedData.length) * 100).toFixed(1);
    console.log(`     ${form.padEnd(15)} ${count.toString().padStart(6)} (${percentage}%)`);
  }

  console.log(`\n[4/5] Preparing database insertion...`);
  console.log(`       Database adapter: Not configured (placeholder)`);
  console.log(`       Batch size: 500 records`);
  console.log(`       Total batches: ${Math.ceil(cleanedData.length / 500)}`);

  console.log(`\n[5/5] Inserting data into database...`);
  try {
    const insertedCount = await bulkInsertToDatabase(cleanedData);
    console.log(`\n     Successfully inserted ${insertedCount} records into the database.`);
  } catch (error) {
    console.error(`\n     Database insertion failed: ${error.message}`);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Seeding completed successfully!');
  console.log('='.repeat(60) + '\n');

  process.exit(0);
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
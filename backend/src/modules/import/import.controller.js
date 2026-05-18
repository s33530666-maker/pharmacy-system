import prisma from '../../config/db.js';
import XLSX from 'xlsx';

const generateInternalBarcode = () => {
    // بيعمل رقم عشوائي من 8 أرقام
    const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
    return `999${randomDigits}`;
};


const generateRandomBarcode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let barcode = 'RAND';
  for (let i = 0; i < 10; i++) {
    barcode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return barcode;
};

const isEmptyRow = (row) => {
  if (!row || typeof row !== 'object') return true;
  const values = Object.values(row);
  return !values.some(v => v !== null && v !== undefined && String(v).trim() !== '');
};

const safeGetCellValue = (row, keys) => {
  try {
    for (const key of keys) {
      const val = row[key];
      if (val !== null && val !== undefined) {
        const strVal = String(val).trim();
        if (strVal !== '') return strVal;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
};

const safeGetNumericValue = (row, keys) => {
  try {
    for (const key of keys) {
      const val = row[key];
      if (val === null || val === undefined) continue;
      
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        return val;
      }
      
      if (typeof val === 'string') {
        const cleaned = val.replace(/[,\s$£€]/g, '').trim();
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed) && isFinite(parsed)) return parsed;
      }
      
      if (val instanceof Date || (typeof val === 'object' && val !== null && !Array.isArray(val))) {
        try {
          const num = Number(val);
          if (!isNaN(num) && isFinite(num)) return num;
        } catch (e) {}
      }
    }
    return 0;
  } catch (e) {
    return 0;
  }
};

const mapRowToDrug = (row, rowIndex) => {
  try {
    if (!row || typeof row !== 'object') {
      throw new Error('Invalid row data');
    }

    const name = safeGetCellValue(row, ['اسم انجليزي', 'name', 'Name', 'Name (English)', 'drug_name', 'Drug Name', 'اسم الصنف']) 
      || safeGetCellValue(row, ['اسم عربي', 'الاسم العربي', 'Arabic Name', 'arabic_name']) 
      || 'Unknown';
    
    const arabicName = safeGetCellValue(row, ['اسم عربي', 'الاسم العربي', 'Arabic Name', 'arabic_name']) || '';

    let barcode = safeGetCellValue(row, ['باركود دولي', 'باركود', 'barcode', 'Barcode', 'International Barcode', 'barcode_number']) || '';
    if (!barcode) {
      barcode = generateRandomBarcode();
    }

    const sell_price = safeGetNumericValue(row, ['سعر جديد', 'سعر الجمهور', 'sell_price', 'Sell Price', 'سعر البيع', 'Price', 'selling_price', 'unit_price']);
    const old_price = safeGetNumericValue(row, ['سعر قديم', 'Cost', 'cost', 'التكلفة', 'سعر الشراء']);
    const avg_cost = safeGetNumericValue(row, ['سعر التكلفة', 'cost_price', 'Cost Price', 'avg_cost', 'purchase_price']) || 0;
    const stock = Math.floor(safeGetNumericValue(row, ['كمية', 'الكمية', 'quantity', 'Quantity', 'stock', 'Stock', 'qty']) || 1);
    
    const active_ingredient = safeGetCellValue(row, ['مادة فعالة', 'active_ingredient', 'Active Ingredient', 'الاسم العلمي', 'generic_name', 'Generic Name']) || '';
    const category = safeGetCellValue(row, ['الفئة', 'category', 'Category', 'التصنيف', 'group', 'Group']) || '';
    const dosageForm = safeGetCellValue(row, ['شكل صيدلاني', 'dosageForm', 'dosage_form', 'Form', 'form', 'الشكل الصيدلاني']) || 'Tablet';
    const company = safeGetCellValue(row, ['الشركة', 'company', 'Company', 'الشركة المصنعة', 'manufacturer', 'Manufacturer']) || 'Unknown';

    const strength = safeGetCellValue(row, ['التركيز', 'strength', 'Strength', 'الجرعة', 'dose', 'Dose']) || 'Standard';

    const stripsPerBox = safeGetNumericValue(row, ['وحدات كبرى', 'large_units', 'Large Units', 'number_of_strips', 'strips_per_box', 'وحدات كبيرة', 'عدد الأشرطة']) || 1;

    const externalId = safeGetCellValue(row, ['id']) || '';
    const excelIdValue = safeGetNumericValue(row, ['id']);
    const excelId = excelIdValue ? Math.floor(excelIdValue) : null;

    return {
      name,
      arabicName,
      barcode,
      active_ingredient,
      category,
      dosageForm,
      company,
      strength,
      sell_price,
      old_price,
      avg_cost,
      stock,
      externalId,
      excelId,
      stripsPerBox,
      low_stock_limit: 5,
      requires_prescription: false,
    };
  } catch (error) {
    throw new Error(`Failed to map row ${rowIndex}: ${error.message}`);
  }
};

export const importDrugs = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please select an Excel file (.xlsx or .xls).' });
    }


    const fileName = req.file.originalname || '';
    const fileExt = fileName.toLowerCase().split('.').pop();
    if (!['xlsx', 'xls', 'csv'].includes(fileExt)) {
      return res.status(400).json({ error: 'Invalid file format. Please upload an Excel file (.xlsx, .xls) or CSV.' });
    }

    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { 
        type: 'buffer', 
        cellDates: true,
        cellNF: true,
        sheetStubs: true
      });
    } catch (parseError) {
      console.error('Excel parse error:', parseError.message);
      return res.status(400).json({ error: 'Cannot read the Excel file. The file may be corrupted or password-protected.' });
    }

    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({ error: 'Excel file contains no worksheets. Please ensure the file has at least one sheet.' });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet || Object.keys(worksheet).length === 0) {
      return res.status(400).json({ error: 'The first worksheet is empty.' });
    }

    let jsonData;
    try {
      jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        defval: null, 
        raw: false,
        blankrows: false
      });
    } catch (convertError) {
      console.error('Sheet conversion error:', convertError.message);
      return res.status(400).json({ error: 'Failed to read the worksheet data. Please check the file format.' });
    }

    if (!Array.isArray(jsonData)) {
      return res.status(400).json({ error: 'Invalid data format in worksheet. Expected a table structure.' });
    }

    jsonData = jsonData.filter((row, index) => {
      if (isEmptyRow(row)) return false;
      return true;
    });

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'File is empty or contains only empty rows.' });
    }

    const mappedData = [];
    const errors = [];
    const MAX_ERRORS = 50;

    for (let i = 0; i < jsonData.length; i++) {
      try {
        const mapped = mapRowToDrug(jsonData[i], i + 2);
        
        if (!mapped.name || mapped.name.trim() === '' || mapped.name === 'Unknown') {
          if (errors.length < MAX_ERRORS) {
            errors.push({ row: i + 2, error: 'Missing or invalid drug name' });
          }
          continue;
        }

        mappedData.push(mapped);
      } catch (error) {
        if (errors.length < MAX_ERRORS) {
          errors.push({ row: i + 2, error: error.message });
        }
      }
    }

    if (mappedData.length === 0) {
      return res.status(400).json({ 
        error: 'No valid drugs found in the file. Please check the column headers.',
        details: errors.slice(0, 10)
      });
    }

    let successCount = 0;
    const dbErrors = [];

    console.log('>>> IMPORT DEBUG: First mapped drug:', JSON.stringify(mappedData[0], null, 2));

    for (const drug of mappedData) {
      try {
        const drugGenericName = String(drug.active_ingredient || "").trim();
        const drugStrength = String(drug.strength || "Standard").trim();
        const drugDosageForm = String(drug.dosageForm || "Tablet").trim();
        const drugCompany = String(drug.company || "Unknown").trim();

        const sanitizedDrug = {
          name: String(drug.name || "Unknown Item").trim(),
          arabicName: String(drug.arabicName || "").trim(),
          barcode: String(drug.barcode || "").trim(),
          genericName: drugGenericName || "Generic",
          description: String(drug.category || "").trim(),
          strength: drugStrength || "Standard",
          dosageForm: drugDosageForm || "Tablet",
          manufacturer: drugCompany,
          sellPrice: isNaN(Number(drug.sell_price)) ? 0 : Number(drug.sell_price),
          alternatePrice: isNaN(Number(drug.old_price)) ? 0 : Number(drug.old_price),
          costPrice: isNaN(Number(drug.avg_cost)) ? 0 : Number(drug.avg_cost),
          externalId: drug.externalId || null,
          excelId: drug.excelId || null,
          stripsPerBox: drug.stripsPerBox || 1,
          status: 'ACTIVE',
        };

        console.log('>>> IMPORT DEBUG: Drug to save:', sanitizedDrug.name, '| genericName:', sanitizedDrug.genericName, '| strength:', sanitizedDrug.strength, '| dosageForm:', sanitizedDrug.dosageForm);

        const stockValue = isNaN(Number(drug.stock)) ? 0 : Math.floor(Number(drug.stock));
        
        let existingDrug = null;
        
        if (sanitizedDrug.barcode && sanitizedDrug.barcode !== '') {
          existingDrug = await prisma.drug.findFirst({
            where: {
              OR: [
                { barcode: sanitizedDrug.barcode },
                ...(sanitizedDrug.externalId ? [{ externalId: sanitizedDrug.externalId }] : []),
                { name: sanitizedDrug.name }
              ]
            }
          });
        } else {
          existingDrug = await prisma.drug.findFirst({
            where: {
              OR: [
                ...(sanitizedDrug.externalId ? [{ externalId: sanitizedDrug.externalId }] : []),
                { name: sanitizedDrug.name },
              ],
            }
          });
        }
        
        if (existingDrug) {
          const updateData = {
            arabicName: sanitizedDrug.arabicName,
            sellPrice: sanitizedDrug.sellPrice,
            alternatePrice: sanitizedDrug.alternatePrice,
            costPrice: sanitizedDrug.costPrice,
            externalId: sanitizedDrug.externalId || existingDrug.externalId,
            excelId: sanitizedDrug.excelId || existingDrug.excelId,
            stripsPerBox: sanitizedDrug.stripsPerBox,
            status: 'ACTIVE',
          };
          
          if (stockValue > 0) {
            updateData.stock = (existingDrug.stock || 0) + stockValue;
          }
          
          await prisma.drug.update({
            where: { id: existingDrug.id },
            data: updateData,
          });
        } else {
          const finalBarcode = sanitizedDrug.barcode || generateRandomBarcode();
          sanitizedDrug.barcode = finalBarcode;
          sanitizedDrug.stock = stockValue;
          
          await prisma.drug.create({
            data: sanitizedDrug
          });
        }
        
        successCount++;
      } catch (error) {
        console.error(`Failed to process ${drug.name}:`, error.message);
        dbErrors.push({ drug: drug.name, error: error.message });
        continue;
      }
    }

    const response = {
      message: `Successfully imported ${successCount} drugs.`,
      count: successCount,
      total: jsonData.length
    };

    if (errors.length > 0) {
      response.warnings = errors.slice(0, 20);
    }

    if (dbErrors.length > 0 && successCount === 0) {
      return res.status(500).json({ 
        error: 'Failed to save drugs to database. Please check the data.',
        details: dbErrors.slice(0, 10)
      });
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ 
      error: 'An unexpected error occurred during import. Please try again.',
      details: error.message
    });
  }
};

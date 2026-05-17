import path from 'path';
import fs from 'fs';

const backupDatabase = async (req, res) => {
  try {
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `pharmacy-backup-${timestamp}.db`;

    res.download(dbPath, backupFileName, (err) => {
      if (err) {
        console.error('Error downloading database:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download backup' });
        }
      }
    });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
};

const exportAsJson = async (req, res) => {
  try {
    const prisma = (await import('@prisma/client')).PrismaClient;
    const client = new prisma();

    const [drugs, batches, sales, customers, suppliers] = await Promise.all([
      client.drug.findMany(),
      client.batch.findMany(),
      client.sale.findMany({ include: { items: true } }),
      client.customer.findMany(),
      client.supplier.findMany(),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      drugs,
      batches,
      sales,
      customers,
      suppliers,
    };

    await client.$disconnect();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `pharmacy-export-${timestamp}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
};

export { backupDatabase, exportAsJson };
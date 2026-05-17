import prisma from '../../config/db.js';

export const getSystemSettings = async () => {
  let settings = await prisma.systemSettings.findFirst();
  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: {
        lowStockThreshold: 5
      }
    });
  }
  return settings;
};

export const updateSystemSettings = async (data) => {
  let settings = await prisma.systemSettings.findFirst();
  
  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: {
        lowStockThreshold: data.lowStockThreshold ?? 5
      }
    });
  } else {
    settings = await prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        lowStockThreshold: data.lowStockThreshold ?? settings.lowStockThreshold
      }
    });
  }
  
  return settings;
};

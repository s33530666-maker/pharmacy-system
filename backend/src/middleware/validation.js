import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  role: z.enum(['ADMIN', 'CASHIER', 'PHARMACIST', 'TECHNICIAN']).optional(),
  email: z.string().email('Invalid email format').optional().nullable(),
});

export const loginSchema = z.object({
  name: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const updateUserSchema = z.object({
  name: z.string().min(3).optional(),
  role: z.enum(['ADMIN', 'CASHIER', 'PHARMACIST', 'TECHNICIAN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  password: z.string().min(4).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const discountLimitSchema = z.object({
  maxDiscountLimit: z.number().min(0, 'Discount limit must be at least 0').max(100, 'Discount limit cannot exceed 100'),
});

export const permissionsSchema = z.object({
  permissions: z.array(z.string()).default([]),
});

export const createDrugSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  arabicName: z.string().optional(),
  barcode: z.string().optional(),
  bagNumber: z.string().optional(),
  externalId: z.string().optional(),
  genericName: z.string().min(1, 'Generic name is required'),
  description: z.string().optional(),
  strength: z.string().min(1, 'Strength is required'),
  dosageForm: z.string().min(1, 'Dosage form is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  stock: z.union([z.number(), z.string()]).optional(),
  sellPrice: z.union([z.number(), z.string()]).optional(),
  alternatePrice: z.union([z.number(), z.string()]).optional(),
  costPrice: z.union([z.number(), z.string()]).optional(),
});

export const updateDrugSchema = z.object({
  name: z.string().min(1).optional(),
  arabicName: z.string().optional(),
  barcode: z.string().optional(),
  bagNumber: z.string().optional(),
  externalId: z.string().optional(),
  genericName: z.string().min(1).optional(),
  description: z.string().optional(),
  strength: z.string().optional(),
  dosageForm: z.string().optional(),
  manufacturer: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  stock: z.union([z.number(), z.string()]).optional(),
  sellPrice: z.union([z.number(), z.string()]).optional(),
  alternatePrice: z.union([z.number(), z.string()]).optional(),
  costPrice: z.union([z.number(), z.string()]).optional(),
});

export const saleItemSchema = z.object({
  drugId: z.string().min(1, 'Drug ID is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  price: z.number().optional().nullable(),
});

export const createSaleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  customerId: z.string().optional().nullable(),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  paymentMethod: z.enum(['cash', 'credit', 'CASH', 'VISA', 'DEFERRED', 'WALLET', 'INSTAPAY', 'CREDIT']).optional().nullable(),
  paymentStatus: z.enum(['PAID', 'DEFERRED']).optional().default('PAID'),
  earnedPoints: z.coerce.number().int().min(0).optional().default(0),
  discount: z.coerce.number().default(0),
  cashPaid: z.coerce.number().default(0),
  changeReturn: z.coerce.number().default(0),
  grandTotal: z.coerce.number().default(0),
  subtotal: z.coerce.number().default(0),
  customer: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
  }).optional().nullable(),
  supplierId: z.string().nullable().optional(),
  batchNumber: z.string().optional().default(''),
});

export const returnItemSchema = z.object({
  saleItemId: z.string().min(1, 'Sale item ID is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
});

export const processReturnSchema = z.object({
  saleId: z.string().min(1, 'Sale ID is required'),
  items: z.array(returnItemSchema).min(1, 'At least one item is required'),
  reason: z.string().optional(),
  userId: z.string().optional(),
});

export const expenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().optional(),
  userId: z.string().optional(),
  date: z.string().optional(),
});

export const suspendSaleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  items: z.array(z.object({
    drugId: z.string().optional(),
    name: z.string().optional(),
    drugName: z.string().optional(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().optional(),
    box_price: z.number().optional(),
    totalPrice: z.number().optional(),
  })).min(1, 'At least one item is required'),
  totalAmount: z.number().min(0).optional(),
  note: z.string().optional(),
});

export const purchaseItemSchema = z.object({
  drugId: z.string().min(1, 'Drug ID is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  costPrice: z.number().nonnegative('Cost price must be non-negative'),
  sellingPrice: z.number().nonnegative('Selling price must be non-negative'),
  oldPrice: z.number().nonnegative('Old price must be non-negative').optional().nullable(),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  batchNumber: z.string().optional(),
  discount: z.number().min(0).optional(),
  finalCost: z.number().optional(),
});

export const createPurchaseSchema = z.object({
  supplierId: z.string().optional().nullable(),
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required'),
});

export const shiftSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  openingCash: z.number().min(0).optional(),
  shiftId: z.string().optional(),
  actualClosingCash: z.number().min(0).optional(),
});

export const damagedDrugSchema = z.object({
  drugId: z.string().min(1, 'Drug ID is required'),
  quantity: z.union([z.number(), z.string()]).transform(val => Number(val)).pipe(z.number().int().positive('Quantity must be a positive integer')),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
});

export const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        const errors = (result.error.issues || []).map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
        });
      }
      req.body = result.data;
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
      });
    }
  };
};

export const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
      });
    }
  };
};

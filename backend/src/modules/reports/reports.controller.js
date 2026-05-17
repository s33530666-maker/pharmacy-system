import {
  getDashboardSummary,
  getRecentTransactions,
  getDailyExpenses,
  getLowStockItems,
  getExpiringSoonItems,
  getWeeklySalesData,
  getTopSellingDrugs,
  getMonthlyRevenue,
  getMonthlyProfit,
  getExpiredDrugsCount,
  getCustomerDebts,
  getSupplierDebts,
  applyAuditStock,
} from './reports.service.js';

const dashboardController = async (req, res) => {
  try {
    const summary = await getDashboardSummary();
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard summary',
      error: error.message,
    });
  }
};

const recentTransactionsController = async (req, res) => {
  try {
    const transactions = await getRecentTransactions();
    res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error('Recent transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent transactions',
      error: error.message,
    });
  }
};

const dailyExpensesController = async (req, res) => {
  try {
    const expenses = await getDailyExpenses();
    res.status(200).json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    console.error('Daily expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily expenses',
      error: error.message,
    });
  }
};

const lowStockController = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 5;
    const items = await getLowStockItems(threshold);
    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error('Low stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock items',
      error: error.message,
    });
  }
};

const expiringSoonController = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const items = await getExpiringSoonItems(days);
    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error('Expiring soon error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expiring items',
      error: error.message,
    });
  }
};

const weeklySalesController = async (req, res) => {
  try {
    const data = await getWeeklySalesData();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Weekly sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly sales',
      error: error.message,
    });
  }
};

const topSellingController = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await getTopSellingDrugs(limit);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Top selling error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch top selling drugs', error: error.message });
  }
};

const monthlyRevenueController = async (req, res) => {
  try {
    const data = await getMonthlyRevenue();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Monthly revenue error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch monthly revenue', error: error.message });
  }
};

const monthlyProfitController = async (req, res) => {
  try {
    const data = await getMonthlyProfit();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Monthly profit error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch monthly profit', error: error.message });
  }
};

const expiredDrugsController = async (req, res) => {
  try {
    const count = await getExpiredDrugsCount();
    res.status(200).json({ success: true, data: { count } });
  } catch (error) {
    console.error('Expired drugs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch expired drugs count', error: error.message });
  }
};

const customerDebtsController = async (req, res) => {
  try {
    const data = await getCustomerDebts();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Customer debts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer debts', error: error.message });
  }
};

const supplierDebtsController = async (req, res) => {
  try {
    const data = await getSupplierDebts();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Supplier debts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch supplier debts', error: error.message });
  }
};

const applyAuditStockController = async (req, res) => {
  try {
    const { drugId, newStock } = req.body;
    if (!drugId || newStock === undefined || newStock === null) {
      return res.status(400).json({ success: false, message: 'drugId and newStock are required' });
    }
    const parsedStock = parseInt(newStock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ success: false, message: 'newStock must be a non-negative integer' });
    }
    const result = await applyAuditStock(drugId, parsedStock, req.user?.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Apply audit stock error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to apply audit stock' });
  }
};

export {
  dashboardController,
  recentTransactionsController,
  dailyExpensesController,
  lowStockController,
  expiringSoonController,
  weeklySalesController,
  topSellingController,
  monthlyRevenueController,
  monthlyProfitController,
  expiredDrugsController,
  customerDebtsController,
  supplierDebtsController,
  applyAuditStockController,
};

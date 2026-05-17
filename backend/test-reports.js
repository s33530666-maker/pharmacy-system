async function main() {
  const { getDashboardSummary, getLowStockItems, getExpiringSoonItems } = await import('./src/modules/reports/reports.service.js');
  console.log("Dashboard Summary:", await getDashboardSummary());
  const lowStock = await getLowStockItems(5);
  console.log("Low Stock:", lowStock.slice(0, 2));
  const expiring = await getExpiringSoonItems(90);
  console.log("Expiring:", expiring.slice(0, 2));
}

main().catch(console.error);

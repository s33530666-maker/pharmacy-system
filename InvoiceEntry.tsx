import { useState, useRef, useCallback } from "react";

interface InvoiceItem {
  id: string;
  barcode: string;
  name: string;
  qty: number;
  bonus: number;
  costPrice: number;
  discount: number;
  expiryDate: string;
  total: number;
}

interface Supplier {
  id: string;
  name: string;
}

const mockSuppliers: Supplier[] = [
  { id: "1", name: "Pharma Distributors Ltd" },
  { id: "2", name: "MediCare Wholesale" },
  { id: "3", name: "HealthFirst Supplies" },
];

const mockProducts = [
  { barcode: "8901234567890", name: "Paracetamol 500mg" },
  { barcode: "8901234567891", name: "Amoxicillin 250mg" },
  { barcode: "8901234567892", name: "Ibuprofen 400mg" },
  { barcode: "8901234567893", name: "Omeprazole 20mg" },
  { barcode: "8901234567894", name: "Metformin 500mg" },
];

export default function InvoiceEntry() {
  const [supplierId, setSupplierId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [invoiceNo, setInvoiceNo] = useState("");

  const [searchBarcode, setSearchBarcode] = useState("");
  const [qty, setQty] = useState("1");
  const [bonus, setBonus] = useState("0");
  const [costPrice, setCostPrice] = useState("");
  const [discount, setDiscount] = useState("0");
  const [expiryDate, setExpiryDate] = useState("");

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const searchRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const bonusRef = useRef<HTMLInputElement>(null);
  const costRef = useRef<HTMLInputElement>(null);
  const discountRef = useRef<HTMLInputElement>(null);
  const expiryRef = useRef<HTMLInputElement>(null);

  const suggestions = mockProducts.filter(
    (p) =>
      p.barcode.includes(searchBarcode) ||
      p.name.toLowerCase().includes(searchBarcode.toLowerCase())
  );

  const grossTotal = items.reduce((sum, item) => sum + item.total, 0);
  const totalDiscount = items.reduce(
    (sum, item) => sum + (item.costPrice * item.qty * item.discount) / 100,
    0
  );
  const netTotal = grossTotal - totalDiscount;

  const handleAddItem = useCallback(() => {
    if (!searchBarcode || !qty || !costPrice) return;

    const product = mockProducts.find(
      (p) => p.barcode === searchBarcode || p.name.toLowerCase().includes(searchBarcode.toLowerCase())
    );

    const qtyNum = parseFloat(qty) || 0;
    const bonusNum = parseFloat(bonus) || 0;
    const costNum = parseFloat(costPrice) || 0;
    const discNum = parseFloat(discount) || 0;

    const total = qtyNum * costNum * (1 - discNum / 100);

    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      barcode: product?.barcode || searchBarcode,
      name: product?.name || searchBarcode,
      qty: qtyNum,
      bonus: bonusNum,
      costPrice: costNum,
      discount: discNum,
      expiryDate: expiryDate,
      total,
    };

    setItems((prev) => [...prev, newItem]);

    setSearchBarcode("");
    setQty("1");
    setBonus("0");
    setCostPrice("");
    setDiscount("0");
    setExpiryDate("");
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);

    setTimeout(() => searchRef.current?.focus(), 0);
  }, [searchBarcode, qty, bonus, costPrice, discount, expiryDate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, nextRef: React.RefObject<HTMLInputElement | null>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        nextRef.current?.focus();
      }
    },
    []
  );

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        setSearchBarcode(suggestions[selectedSuggestionIndex].barcode);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
      qtyRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setShowSuggestions(true);
      setSelectedSuggestionIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 text-white px-4 py-2 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Purchases / Invoice Entry</h1>
        <div className="flex gap-3 text-sm">
          <span>Alt+N: New</span>
          <span>Alt+S: Save</span>
          <span>Alt+P: Print</span>
        </div>
      </div>

      {/* Invoice Info Section */}
      <div className="bg-white border-b px-4 py-2 grid grid-cols-4 gap-4">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Supplier</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select Supplier</option>
            {mockSuppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Invoice Date</label>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Invoice No</label>
          <input
            type="text"
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            placeholder="INV-001"
            className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-end">
          <button className="bg-gray-100 hover:bg-gray-200 border rounded px-3 py-1 text-sm">
            Load Invoice
          </button>
        </div>
      </div>

      {/* Item Entry Section */}
      <div className="bg-white border-b px-4 py-3">
        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-3 relative">
            <label className="text-xs text-gray-500 mb-1 block">Search / Barcode</label>
            <input
              ref={searchRef}
              type="text"
              value={searchBarcode}
              onChange={(e) => {
                setSearchBarcode(e.target.value);
                setShowSuggestions(true);
                setSelectedSuggestionIndex(-1);
              }}
              onKeyDown={handleSearchKeyDown}
              onFocus={(e) => {
                e.target.select();
                setShowSuggestions(true);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Type or scan barcode..."
              className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {showSuggestions && searchBarcode && (
              <div className="absolute z-50 bg-white border rounded-b shadow-lg max-h-40 overflow-y-auto w-full">
                {suggestions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
                ) : (
                  suggestions.map((p, i) => (
                    <div
                      key={p.barcode}
                      className={`px-3 py-2 text-sm cursor-pointer ${
                        i === selectedSuggestionIndex
                          ? "bg-blue-100"
                          : "hover:bg-gray-50"
                      }`}
                      onMouseDown={() => {
                        setSearchBarcode(p.barcode);
                        setShowSuggestions(false);
                        setSelectedSuggestionIndex(-1);
                      }}
                    >
                      <span className="font-mono text-xs text-gray-400 mr-2">
                        {p.barcode}
                      </span>
                      {p.name}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="col-span-1">
            <label className="text-xs text-gray-500 mb-1 block">Qty</label>
            <input
              ref={qtyRef}
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, bonusRef)}
              onFocus={(e) => e.target.select()}
              className="w-full border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-1">
            <label className="text-xs text-gray-500 mb-1 block">Bonus</label>
            <input
              ref={bonusRef}
              type="number"
              value={bonus}
              onChange={(e) => setBonus(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, costRef)}
              onFocus={(e) => e.target.select()}
              className="w-full border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Cost Price</label>
            <input
              ref={costRef}
              type="number"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, discountRef)}
              onFocus={(e) => e.target.select()}
              className="w-full border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-1">
            <label className="text-xs text-gray-500 mb-1 block">Disc %</label>
            <input
              ref={discountRef}
              type="number"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, expiryRef)}
              onFocus={(e) => e.target.select()}
              className="w-full border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Expiry Date</label>
            <input
              ref={expiryRef}
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddItem();
                }
              }}
              className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-2 flex gap-2">
            <button
              onClick={handleAddItem}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1 text-sm font-medium"
            >
              Add [Enter]
            </button>
            <button
              onClick={() => {
                setItems([]);
              }}
              className="bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 rounded px-3 py-1 text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="flex-1 overflow-y-auto bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b sticky top-0">
            <tr>
              <th className="px-2 py-1 text-left font-medium text-gray-600 w-8">#</th>
              <th className="px-2 py-1 text-left font-medium text-gray-600">Barcode</th>
              <th className="px-2 py-1 text-left font-medium text-gray-600">Item Name</th>
              <th className="px-2 py-1 text-right font-medium text-gray-600 w-16">Qty</th>
              <th className="px-2 py-1 text-right font-medium text-gray-600 w-16">Bonus</th>
              <th className="px-2 py-1 text-right font-medium text-gray-600 w-24">Cost</th>
              <th className="px-2 py-1 text-right font-medium text-gray-600 w-16">Disc%</th>
              <th className="px-2 py-1 text-right font-medium text-gray-600 w-24">Total</th>
              <th className="px-2 py-1 text-center font-medium text-gray-600 w-12">Del</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  Scan or type a barcode to add items
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr
                  key={item.id}
                  className={`border-b hover:bg-gray-50 ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="px-2 py-1 text-gray-500">{index + 1}</td>
                  <td className="px-2 py-1 font-mono text-xs">{item.barcode}</td>
                  <td className="px-2 py-1">{item.name}</td>
                  <td className="px-2 py-1 text-right">{item.qty}</td>
                  <td className="px-2 py-1 text-right text-green-600">{item.bonus}</td>
                  <td className="px-2 py-1 text-right">{item.costPrice.toFixed(2)}</td>
                  <td className="px-2 py-1 text-right">{item.discount}</td>
                  <td className="px-2 py-1 text-right font-medium">
                    {item.total.toFixed(2)}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-500 hover:text-red-700 font-bold text-lg"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Grand Totals Footer */}
      <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-gray-400">Items: </span>
            <span className="font-medium">{items.length}</span>
          </div>
          <div>
            <span className="text-gray-400">Total Qty: </span>
            <span className="font-medium">
              {items.reduce((sum, i) => sum + i.qty, 0)}
            </span>
          </div>
        </div>
        <div className="flex gap-8 text-sm">
          <div>
            <span className="text-gray-400">Gross Total: </span>
            <span className="font-medium">{grossTotal.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-400">Disc Amount: </span>
            <span className="font-medium text-yellow-400">
              {totalDiscount.toFixed(2)}
            </span>
          </div>
          <div className="text-lg">
            <span className="text-gray-400">Net Total: </span>
            <span className="font-bold text-green-400">{netTotal.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded text-sm font-medium">
            Save [Alt+S]
          </button>
          <button className="bg-gray-600 hover:bg-gray-700 px-4 py-1.5 rounded text-sm">
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

import { Bill } from '../src/types/models';

describe('Summary Tab Hierarchical Grouping and Edge Cases', () => {
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const MONTH_NAMES_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const formatBillCount = (count: number) => `${count} ${count === 1 ? 'bill' : 'bills'}`;

  const formatBillDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const mShort = MONTH_NAMES_SHORT[d.getMonth()] || '';
    return `${mShort} ${d.getDate()}`;
  };

  const groupBills = (bills: Bill[]) => {
    const yearMap = new Map<number, Map<number, Bill[]>>();

    for (const bill of bills) {
      if (!bill.createdAt) continue;
      const d = new Date(bill.createdAt);
      if (isNaN(d.getTime())) continue;
      const y = d.getFullYear();
      const m = d.getMonth();

      if (!yearMap.has(y)) {
        yearMap.set(y, new Map<number, Bill[]>());
      }
      const mObj = yearMap.get(y)!;
      if (!mObj.has(m)) {
        mObj.set(m, []);
      }
      mObj.get(m)!.push(bill);
    }

    const yearsResult = [];
    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => b - a);

    for (const y of sortedYears) {
      const mObj = yearMap.get(y)!;
      const sortedMonths = Array.from(mObj.keys()).sort((a, b) => b - a);
      const monthsResult = [];
      let yearTotal = 0;
      let yearCount = 0;

      for (const m of sortedMonths) {
        const monthBills = mObj.get(m)!.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const monthTotal = monthBills.reduce((acc, b) => acc + (Number(b.totalAmount) || 0), 0);
        const count = monthBills.length;
        yearTotal += monthTotal;
        yearCount += count;

        monthsResult.push({
          monthIndex: m,
          monthName: MONTH_NAMES[m],
          monthShort: MONTH_NAMES_SHORT[m],
          bills: monthBills,
          totalAmount: monthTotal,
          count,
        });
      }

      yearsResult.push({
        year: y,
        totalAmount: yearTotal,
        count: yearCount,
        months: monthsResult,
      });
    }

    return yearsResult;
  };

  it('correctly handles pluralization: 1 bill vs N bills', () => {
    expect(formatBillCount(0)).toBe('0 bills');
    expect(formatBillCount(1)).toBe('1 bill');
    expect(formatBillCount(2)).toBe('2 bills');
    expect(formatBillCount(10)).toBe('10 bills');
  });

  it('formats bill date according to mockup (e.g. Oct 6)', () => {
    expect(formatBillDate('2026-10-06T10:30:00.000Z')).toBe('Oct 6');
    expect(formatBillDate('2026-09-15T10:30:00.000Z')).toBe('Sep 15');
    expect(formatBillDate('invalid-date')).toBe('—');
  });

  it('groups bills across years and months with correct sums and counts', () => {
    const mockBills: Bill[] = [
      {
        id: 'b1',
        shopId: 'shop1',
        billNumber: '#0001',
        status: 'completed',
        subtotal: 50,
        discountAmount: 0,
        gstRate: 0,
        gstAmount: 0,
        totalAmount: 50,
        paidAmount: 50,
        pendingAmount: 0,
        paymentMode: 'Cash',
        items: [
          { itemName: 'Boost', isHalf: false, unitPrice: 25, quantity: 1, lineTotal: 25 },
          { itemName: 'Horlicks', isHalf: false, unitPrice: 25, quantity: 1, lineTotal: 25 },
        ],
        createdAt: '2026-10-06T10:00:00.000Z',
        completedAt: '2026-10-06T10:00:00.000Z',
        customerName: 'Panda 🐼 💕',
      },
      {
        id: 'b2',
        shopId: 'shop1',
        billNumber: '#0002',
        status: 'completed',
        subtotal: 50,
        discountAmount: 0,
        gstRate: 0,
        gstAmount: 0,
        totalAmount: 50,
        paidAmount: 50,
        pendingAmount: 0,
        paymentMode: 'GPay',
        items: [
          { itemName: 'Boost', isHalf: false, unitPrice: 25, quantity: 1, lineTotal: 25 },
          { itemName: 'Horlicks', isHalf: false, unitPrice: 25, quantity: 1, lineTotal: 25 },
        ],
        createdAt: '2026-10-06T11:00:00.000Z',
        completedAt: '2026-10-06T11:00:00.000Z',
        customerPhone: '+918438204612',
      },
      {
        id: 'b3',
        shopId: 'shop1',
        billNumber: '#0003',
        status: 'completed',
        subtotal: 120,
        discountAmount: 0,
        gstRate: 0,
        gstAmount: 0,
        totalAmount: 120,
        paidAmount: 120,
        pendingAmount: 0,
        paymentMode: 'Cash',
        items: [
          { itemName: 'Tea', isHalf: false, unitPrice: 12, quantity: 10, lineTotal: 120 },
        ],
        createdAt: '2026-09-20T08:00:00.000Z',
        completedAt: '2026-09-20T08:00:00.000Z',
      },
      {
        id: 'b4',
        shopId: 'shop1',
        billNumber: '#0004',
        status: 'completed',
        subtotal: 300,
        discountAmount: 0,
        gstRate: 0,
        gstAmount: 0,
        totalAmount: 300,
        paidAmount: 300,
        pendingAmount: 0,
        paymentMode: 'GPay',
        items: [
          { itemName: 'Coffee', isHalf: false, unitPrice: 20, quantity: 15, lineTotal: 300 },
        ],
        createdAt: '2025-12-15T09:00:00.000Z',
        completedAt: '2025-12-15T09:00:00.000Z',
      },
    ];

    const hierarchy = groupBills(mockBills);
    expect(hierarchy).toHaveLength(2);

    // Year 2026
    const y2026 = hierarchy.find(y => y.year === 2026)!;
    expect(y2026).toBeDefined();
    expect(y2026.count).toBe(3);
    expect(y2026.totalAmount).toBe(220); // 50 + 50 + 120
    expect(y2026.months).toHaveLength(2);

    // Month October 2026 (index 9)
    const oct = y2026.months.find(m => m.monthIndex === 9)!;
    expect(oct).toBeDefined();
    expect(oct.monthName).toBe('October');
    expect(oct.count).toBe(2);
    expect(oct.totalAmount).toBe(100);
    expect(oct.bills).toHaveLength(2);

    // Year 2025
    const y2025 = hierarchy.find(y => y.year === 2025)!;
    expect(y2025).toBeDefined();
    expect(y2025.count).toBe(1);
    expect(y2025.totalAmount).toBe(300);
  });

  it('handles empty bills safely without errors', () => {
    const hierarchy = groupBills([]);
    expect(hierarchy).toEqual([]);
  });
});

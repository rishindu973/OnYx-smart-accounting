
function testMonthNavigation() {
    let month = "2026-02"; // Starting state
    console.log(`Initial month: ${month}`);

    const handlePrevMonth = () => {
        const [y, m] = month.split("-").map(Number);
        const date = new Date(Date.UTC(y, m - 1 - 1, 1));
        month = date.toISOString().slice(0, 7);
        console.log(`Prev month: ${month}`);
    };

    const handleNextMonth = () => {
        const [y, m] = month.split("-").map(Number);
        const date = new Date(Date.UTC(y, m - 1 + 1, 1));
        month = date.toISOString().slice(0, 7);
        console.log(`Next month: ${month}`);
    };

    const formatMonthDisplay = (yyyy_mm: string) => {
        const [y, m] = yyyy_mm.split("-").map(Number);
        const date = new Date(Date.UTC(y, m - 1, 1));
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    };

    // Test flows
    console.log(`Formatted: ${formatMonthDisplay(month)}`); // February 2026

    handlePrevMonth(); // 2026-01
    console.log(`Formatted: ${formatMonthDisplay(month)}`);

    handlePrevMonth(); // 2025-12 (Year change check)
    console.log(`Formatted: ${formatMonthDisplay(month)}`);

    handleNextMonth(); // 2026-01
    handleNextMonth(); // 2026-02
    handleNextMonth(); // 2026-03
    console.log(`Formatted: ${formatMonthDisplay(month)}`);
}

testMonthNavigation();

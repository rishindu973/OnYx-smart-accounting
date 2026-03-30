
function dateOnlyUTC(yyyy_mm_dd: string) {
    return new Date(`${yyyy_mm_dd}T00:00:00.000Z`);
}

function testGovernanceDateLogic(month: string) {
    console.log(`Testing month: ${month}`);
    const [yearStr, monthStr] = month.split("-");
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);

    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
        console.error(`Invalid month format: ${month}`);
        return;
    }

    // Date.UTC(year, monthIndex) where monthIndex is 0-11
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));

    console.log(`Start: ${start.toISOString()}`);
    console.log(`End:   ${end.toISOString()}`);

    // Check if start is first day of the month
    if (start.getUTCFullYear() !== y || start.getUTCMonth() !== m - 1 || start.getUTCDate() !== 1) {
        console.error("Start date mismatch!");
    } else {
        console.log("Start date correct.");
    }

    // Check if end is first day of next month
    const expectedEndMonth = m === 12 ? 0 : m;
    const expectedEndYear = m === 12 ? y + 1 : y;
    if (end.getUTCFullYear() !== expectedEndYear || end.getUTCMonth() !== expectedEndMonth || end.getUTCDate() !== 1) {
        console.error("End date mismatch!");
    } else {
        console.log("End date correct.");
    }
    console.log("---");
}

testGovernanceDateLogic("2024-01");
testGovernanceDateLogic("2024-02"); // Leap year check (implicit in JS Date)
testGovernanceDateLogic("2024-12");
testGovernanceDateLogic("2025-01");

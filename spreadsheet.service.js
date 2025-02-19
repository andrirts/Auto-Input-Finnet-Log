const { auth } = require('googleapis/build/src/apis/abusiveexperiencereport');
const { authorize } = require('./helper');
const { google } = require('googleapis')
const sheets = google.sheets('v4');

async function updateCell(spreadsheetId, sheetName, cell, value) {
    const client = await authorize();

    await sheets.spreadsheets.values.update({
        auth: client,
        spreadsheetId,
        range: `${sheetName}!${cell}`, // e.g., 'Sheet1!B5'
        valueInputOption: "USER_ENTERED", // "RAW" or "USER_ENTERED"
        requestBody: {
            values: [[value]], // Single cell update
        },
    });

    // console.log(`Updated ${cell} with value: ${value}`);
}

async function getRowIndexColumn(spreadsheetId, sheetName, columnLetter, searchValue) {
    const client = await authorize();

    const range = `${sheetName}!${columnLetter}:${columnLetter}`; // Selects only one column
    const response = await sheets.spreadsheets.values.get({
        auth: client,
        spreadsheetId,
        range,
    });

    const rows = response.data.values;
    if (!rows) {
        // console.log("No data found.");
        return null;
    }

    // Find the row index (1-based index)
    const rowIndex = rows.findIndex(row => row[0] === searchValue);

    if (rowIndex !== -1) {
        // console.log(`Value found at row: ${rowIndex + 1}`);
        return rowIndex + 1; // Convert to 1-based row index (since Sheets API returns 0-based)
    } else {
        // console.log("Value not found.");
        return null;
    }
}

async function insertMultipleRows(spreadsheetId, sheetName, rowsData) {
    const client = await auth.getClient();

    const response = await sheets.spreadsheets.values.append({
        auth: client,
        spreadsheetId,
        range: `${sheetName}!A:A`, // Appends rows at the bottom of column A
        valueInputOption: "USER_ENTERED", // Allows formulas & automatic formatting
        insertDataOption: "INSERT_ROWS", // Ensures new rows are inserted
        requestBody: {
            values: rowsData, // Multiple rows in a 2D array
        },
    });

    // console.log("Rows inserted:", response.data.updates);
}

async function insertRow(spreadsheetId, sheetName, rowData) {
    const client = await authorize();

    const response = await sheets.spreadsheets.values.append({
        auth: client,
        spreadsheetId,
        range: `${sheetName}!A:AG`, // Appends data at the bottom of column A
        valueInputOption: "USER_ENTERED", // Allows formulas & formatting
        insertDataOption: "INSERT_ROWS", // Ensures new row is added
        requestBody: {
            values: [rowData], // 1D array for a single row
        },
    });

    // console.log("Row inserted:", response.data.updates);
}

async function getCellValue(spreadsheetId, sheetName, cell) {
    const client = await authorize();

    const response = await sheets.spreadsheets.values.get({
        auth: client,
        spreadsheetId,
        range: `${sheetName}!${cell}`, // Example: 'Sheet1!B5'
    });
    // console.log(`Value in ${cell}:`, response.data.values ? response.data.values[0][0] : "No data");
    return response.data.values ? response.data.values[0][0] : "No data";
}


module.exports = {
    updateCell,
    getRowIndexColumn,
    insertMultipleRows,
    insertRow,
    getCellValue
}
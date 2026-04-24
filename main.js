const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const XLSX = require('xlsx');

function createWindow() {
  const win = new BrowserWindow({
    width: 640,
    height: 560,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Excelファイルを選択',
    properties: ['openFile'],
    filters: [{ name: 'Excel', extensions: ['xlsx', 'xls', 'xlsm'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('reveal-in-finder', async (_evt, filePath) => {
  if (filePath) shell.showItemInFolder(filePath);
});

ipcMain.handle('split-file', async (_evt, { filePath, rowsPerFile }) => {
  if (!filePath) throw new Error('ファイルが選択されていません');
  const n = Number(rowsPerFile);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error('行数は1以上の整数で指定してください');
  }

  const workbook = XLSX.readFile(filePath, { cellStyles: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('シートが見つかりません');
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: true
  });

  if (rows.length < 2) throw new Error('ヘッダー行とデータ行が必要です（2行以上）');

  const header = rows[0];
  const dataRows = rows.slice(1);
  const totalFiles = Math.ceil(dataRows.length / n);

  const dir = path.dirname(filePath);
  const ext = path.extname(filePath) || '.xlsx';
  const base = path.basename(filePath, ext);
  const writeExt = ext.toLowerCase() === '.xls' ? '.xlsx' : ext;

  const outputs = [];
  for (let i = 0; i < totalFiles; i++) {
    const chunk = dataRows.slice(i * n, (i + 1) * n);
    const newSheet = XLSX.utils.aoa_to_sheet([header, ...chunk]);
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newSheet, sheetName);
    const seq = String(i + 1).padStart(4, '0');
    const outPath = path.join(dir, `${base}_${seq}${writeExt}`);
    XLSX.writeFile(newWorkbook, outPath);
    outputs.push(outPath);
  }

  return {
    totalFiles,
    totalRows: dataRows.length,
    rowsPerFile: n,
    outputs
  };
});

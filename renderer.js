const filePathEl = document.getElementById('filePath');
const selectBtn = document.getElementById('selectBtn');
const rowsEl = document.getElementById('rows');
const splitBtn = document.getElementById('splitBtn');
const statusEl = document.getElementById('status');

let currentFile = null;

function setStatus(content, kind) {
  statusEl.innerHTML = '';
  statusEl.className = 'status' + (kind ? ' ' + kind : '');
  if (typeof content === 'string') {
    statusEl.textContent = content;
  } else if (content instanceof Node) {
    statusEl.appendChild(content);
  }
}

function renderResult(result) {
  const wrap = document.createElement('div');
  const summary = document.createElement('p');
  summary.className = 'summary';
  summary.textContent =
    `完了しました。データ行 ${result.totalRows} 件を ` +
    `${result.rowsPerFile} 行ごとに ${result.totalFiles} ファイルへ分割しました。`;
  wrap.appendChild(summary);

  const list = document.createElement('ul');
  list.className = 'file-list';
  result.outputs.forEach((p) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'link';
    btn.textContent = p;
    btn.addEventListener('click', () => window.api.revealInFinder(p));
    li.appendChild(btn);
    list.appendChild(li);
  });
  wrap.appendChild(list);
  return wrap;
}

selectBtn.addEventListener('click', async () => {
  const p = await window.api.selectFile();
  if (p) {
    currentFile = p;
    filePathEl.value = p;
    splitBtn.disabled = false;
    setStatus('');
  }
});

splitBtn.addEventListener('click', async () => {
  if (!currentFile) return;
  const rowsPerFile = parseInt(rowsEl.value, 10);
  splitBtn.disabled = true;
  selectBtn.disabled = true;
  setStatus('分割処理中...');
  try {
    const result = await window.api.splitFile({
      filePath: currentFile,
      rowsPerFile
    });
    setStatus(renderResult(result), 'success');
  } catch (e) {
    setStatus('エラー: ' + (e && e.message ? e.message : String(e)), 'error');
  } finally {
    splitBtn.disabled = false;
    selectBtn.disabled = false;
  }
});

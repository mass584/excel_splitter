# Excel Splitter

1つのExcelファイルを、指定した行数ごとに分割するデスクトップアプリ（Electron製・macOS / Windows対応）。

- 1行目をヘッダーとして全出力ファイル共通にする
- 2行目以降を指定行数単位で分割する
- 出力先は元ファイルと同じフォルダ、ファイル名末尾に `_0001`, `_0002` ... の連番を付与

## ファイル構成

```
excel_splitter/
├── package.json     # 依存 / ビルド設定
├── main.js          # Electronメインプロセス（分割処理本体）
├── preload.js       # contextBridge経由のIPC公開
├── index.html       # UI
├── renderer.js      # UIロジック
└── styles.css       # スタイル
```

## セットアップ

```bash
npm install
```

## 開発モードで起動

```bash
npm start
```

Electronのウィンドウが開き、ファイル選択 → 行数入力 → 分割実行 ができます。

## macOSアプリとしてビルド

[electron-builder](https://www.electron.build/) を使い `.app` / `.dmg` を生成します。

### Apple Silicon (M1 / M2 / M3) 向け

```bash
npm run dist:mac-arm
```

### Intel Mac 向け

```bash
npm run dist:mac-x64
```

### 両アーキ同時（Universal相当・2ファイル生成）

```bash
npm run dist:mac
```

ビルド成果物は `dist/` に出力されます。

- `dist/Excel Splitter-1.0.0-arm64.dmg`（Apple Silicon用）
- `dist/Excel Splitter-1.0.0.dmg`（Intel用）
- `dist/mac-arm64/Excel Splitter.app`（展開済み .app）

### 署名なしで配布する場合

`package.json` の `build.mac.identity` は `null` に設定済みで、Developer ID署名をスキップします。
自分のMacでローカル使用する前提の構成です。

他人のMacへ渡す場合、初回起動時に Gatekeeper のブロックが出るので
「システム設定 → プライバシーとセキュリティ → "このまま開く"」で許可してください。

### 署名・公証（Notarization）したい場合

1. Apple Developer Program に参加しDeveloper ID Application証明書を取得
2. `package.json` の `build.mac.identity` を該当証明書名に変更
3. 環境変数にApple IDとアプリ専用パスワードを設定
   ```bash
   export APPLE_ID="your-apple-id@example.com"
   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
   export APPLE_TEAM_ID="XXXXXXXXXX"
   ```
4. `package.json` の `build.mac` に `"notarize": true` を追加してビルド

## Windowsアプリとしてビルド

`electron-builder` は macOS からクロスビルドで Windows インストーラを生成できます（アイコンバイナリ変換などに [Wine](https://www.winehq.org/) が必要になる場合あり）。確実に動かすなら Windows 上でビルドするのがおすすめです。

### 成果物の種類

`package.json` では以下の2ターゲットを設定済みです。

- **NSIS インストーラ**（`.exe`）: ダブルクリックでインストール → スタートメニュー・デスクトップにショートカット作成
- **Portable**（`.exe`）: インストール不要、実行ファイル単体で起動

### macOSからクロスビルドする場合

```bash
# NSIS + Portable を両方ビルド
npm run dist:win

# NSISインストーラのみ（x64）
npm run dist:win-x64

# ポータブル版のみ
npm run dist:win-portable
```

初回ビルド時に `electron-builder` が Wine / nsis ツールを自動ダウンロードします。
もし失敗する場合は Wine をインストールしてください。

```bash
brew install --cask --no-quarantine wine-stable
```

### Windows 上でビルドする場合（推奨）

Windows マシン（またはWindows VM）に Node.js をインストールし：

```powershell
cd excel_splitter
npm install
npm run dist:win
```

### 出力ファイル

ビルド成果物は `dist/` に出力されます。

- `dist/Excel Splitter-1.0.0-x64-setup.exe`（NSISインストーラ）
- `dist/Excel Splitter-1.0.0-x64-portable.exe`（ポータブル版）
- `dist/win-unpacked/Excel Splitter.exe`（展開済み実行ファイル）

### 署名について

`package.json` に Windows 署名用の `certificateFile` 等は設定していないため、署名なしバイナリが生成されます。
配布先のWindowsで SmartScreen の「WindowsによってPCが保護されました」警告が出るので、
「詳細情報」→「実行」で許可が必要です。

### コード署名したい場合

1. コード署名証明書（`.pfx`）を取得（DigiCert / Sectigo など）
2. `package.json` の `build.win` に追記：
   ```json
   "win": {
     "certificateFile": "path/to/cert.pfx",
     "certificatePassword": "...",
     "signAndEditExecutable": true
   }
   ```
   または環境変数で渡す：
   ```bash
   export CSC_LINK="path/to/cert.pfx"
   export CSC_KEY_PASSWORD="..."
   ```
3. 通常通り `npm run dist:win`

## GitHub Actions によるリリース自動化

`.github/workflows/release.yml` に、

1. `package.json` のバージョンを自動インクリメント
2. macOS (dmg / arm64 + x64) と Windows (NSIS + Portable / x64) のバイナリをビルド
3. GitHub Release を作成し成果物を添付

という一連のフローを定義しています。

### 初期設定

1. リポジトリをGitHubにpush
2. **Settings → Actions → General → Workflow permissions** を
   「**Read and write permissions**」に変更
   （タグpush / Release作成にwrite権限が必要）
3. これだけ。`GITHUB_TOKEN` は自動供給されるので追加のSecretsは不要

### リリース手順

1. GitHub の **Actions** タブ → **Release** ワークフローを開く
2. **Run workflow** ボタンをクリック
3. 入力項目：
   - **バージョン上げ方**: `patch` / `minor` / `major` を選択（npm version と同じ意味）
   - **プレリリースとして公開する**: beta版などのときだけチェック
4. 実行するとジョブが以下の順で走る：
   - `bump-version`（Ubuntu）: バージョン更新コミット + タグ push
   - `build`（macOS / Windows 並列）: 各OSでバイナリ生成
   - `release`（Ubuntu）: アーティファクトを集めて Release 作成

完了すると **Releases** ページから以下のファイルがダウンロード可能になります。

- `Excel Splitter-x.y.z-arm64.dmg`（Apple Silicon）
- `Excel Splitter-x.y.z.dmg`（Intel Mac）
- `Excel Splitter-x.y.z-x64-setup.exe`（Windowsインストーラ）
- `Excel Splitter-x.y.z-x64-portable.exe`（Windowsポータブル）

### 署名について

ワークフローでは `CSC_IDENTITY_AUTO_DISCOVERY=false` を設定し、証明書なしでビルドします。
署名を有効にする場合は GitHub のSecretsに証明書を登録し、workflowの `env` に以下を追加してください。

- **macOS**: `CSC_LINK`（Developer ID証明書の.p12をbase64エンコードしたもの）, `CSC_KEY_PASSWORD`, 公証用 `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID`
- **Windows**: `CSC_LINK`（.pfxをbase64エンコード）, `CSC_KEY_PASSWORD`

### 注意

- リリースワークフローは `main` ブランチに対してバージョンコミットをpushします。保護ルールで直push禁止にしている場合はbotアカウントに例外を付与してください。
- `package-lock.json` がリポジトリにある場合は `npm ci`、ない場合は `npm install` を自動で切替えます。初回ビルドを安定させたい場合はローカルで `npm install` 後、生成された `package-lock.json` をコミットしておくのを推奨します。

## 使い方

1. アプリを起動
2. 「選択」ボタンで分割したい `.xlsx` / `.xls` / `.xlsm` を指定
3. 1ファイルあたりのデータ行数（ヘッダー除く）を入力（初期値 1000）
4. 「分割実行」をクリック
5. 元ファイルと同じフォルダに `元ファイル名_0001.xlsx`, `_0002.xlsx` ... が生成される
6. 結果一覧のパスをクリックすると Finder / エクスプローラで該当ファイルが開きます

## 仕様メモ

- 入力ファイルの **先頭シート** のみを対象にする
- 入力が `.xls` の場合でも出力は `.xlsx` 形式にする（xlsx書き出しの互換性のため）
- 行数は整数値で 1 以上
- 分割はすべて同期処理（巨大ファイルの場合はウィンドウが数秒フリーズする可能性あり）

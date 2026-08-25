# 官網內容管理部署說明

這份版本只新增官網內容管理，不會更動點餐、號碼牌、預約、菜單或店員同步的既有程式。

## 1. 更新後台 repo

將此資料夾內容更新到 `Ephemere-cafe/lephemere-song-order`。新增的主要檔案為：

- `admin/site-content-admin.js`
- `admin/site-content-admin.css`
- `storage-rules-site-content-snippet.rules`

`admin/index.html` 只多了「網站內容」頁籤與上述 CSS／JavaScript 載入；原本的 `admin/admin.js` 沒有修改。

## 2. 部署 Realtime Database rules

`firebase-rules.json` 已加入公開唯讀、管理員可寫入的 `lephemere/siteContent` 節點。請在 Firebase Console 的 Realtime Database → Rules 合併／發佈這份規則。

## 3. 合併 Storage rules

請把 `storage-rules-site-content-snippet.rules` 裡的 `match /site-content/{allPaths=**}` 區塊，合併到現有 Storage rules 的 `match /b/{bucket}/o { ... }` 裡再發佈。不要用片段覆蓋整份 Storage rules，以免影響既有店員頭像上傳。

規則讓已登入的後台帳號建立圖片；實際是否顯示仍由 Realtime Database 的管理員寫入權限控制。覆蓋／刪除舊檔僅開放主要管理信箱或帶有 `siteContentManager: true` Custom Claim 的帳號。一般管理員刪除項目時，即使無法刪除 Storage 舊檔，官網資料仍會移除，介面會顯示提示。

## 4. 更新官網 repo

搭配交付資料夾 `ephemere-cafe.github.io-官網內容同步-20260824` 更新 `Ephemere-cafe/ephemere-cafe.github.io`。官網新增兩個檔案：

- `assets/site-content.js`
- `assets/site-content.css`

若 Firebase 尚未建立任何自訂內容，首頁仍使用 `about-staff-20260817.webp`，服務頁仍顯示原本兩張拍立得，不會出現空白。

## 使用方式

登入 `https://order.ephemereffxiv.com/admin/`，進入「網站內容」：

1. 首頁照片可分別選擇桌機版、手機版圖片。
2. 拖曳水平／垂直焦點，預覽中的深色區代表首頁文字會覆蓋的位置。
3. 按「儲存並同步首頁」後，官網重新整理即可看到更新。
4. 拍立得可新增、編輯、上下排序、隱藏或刪除。

建議先部署後台與規則，再部署官網。Firebase Storage 必須已啟用；此專案原本的店員頭像上傳已使用同一個 Storage bucket。

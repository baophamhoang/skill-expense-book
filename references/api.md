# API ghi sổ qua Apps Script

Web app gắn vào sổ Google Sheets (code ở `apps-script/`). Gọi bằng `scripts/ledger.sh <action> '<params json>'`, cần `EXPENSE_BOOK_URL` và `EXPENSE_BOOK_TOKEN` trong môi trường. Không in token ra hội thoại, file hay commit.

Mọi phản hồi có dạng `{"ok": true, "action", "result"}` hoặc `{"ok": false, "error": {"code", "message", "details"}}`. Ngày dùng `YYYY-MM-DD`, tháng dùng `YYYY-MM`, tiền gửi bằng số nguyên VND (`amount_vnd`); sổ lưu k VND và kết quả trả về theo k (`amount_k`).

| Action | Params | Ghi chú |
|---|---|---|
| `ping` | — | Kiểm tra token, header các tab, múi giờ. `status: schema_mismatch` thì dừng ghi. |
| `get_context` | — | Ngày hôm nay theo sổ, ví + số dư đầu, loại, danh mục, mã tài sản, lịch thẻ, các kỳ thẻ còn mở. Gọi đầu mỗi phiên trước khi chọn ví/danh mục. |
| `record_entry` | `request_id, date, description, amount_vnd, category, wallet, type`, tùy chọn `note` (lời gốc), `source`, `post_date`; Đầu tư/Rút đầu tư thêm `qty`, `asset` | Ghi chép. Chi tiêu, Thu nhập, Hoàn tiền, Đầu tư, Rút đầu tư. |
| `record_transfer` | `request_id, date, from, to, amount_vnd`, tùy chọn `note`, `period` | Chuyển tiền. Trả thẻ: `period` là mã kỳ và `to` phải là thẻ của kỳ đó. |
| `confirm_statement` | `period, amount_vnd`, tùy chọn `actual_due`, `overwrite` | Thẻ tín dụng F (và L). Đã có số khác thì cần `overwrite: true`. |
| `set_asset_price` | `asset, month, price_vnd, price_date`, tùy chọn `overwrite` | Đầu tư F:G, giá theo VND/đơn vị. |
| `find` | `id` | Tìm trong Ghi chép (cột I) và Chuyển tiền (cột H). |
| `update_entry` | `id, fields`, tùy chọn `expect` | `fields` dùng tên như record (`amount_vnd`, `wallet`…). Không đổi được `id`. |
| `undo` | `id, before, after` | Lấy nguyên `result.undo` của lần ghi/sửa. Hàng đã bị sửa khác đi thì báo `undo_conflict`, không ghi. |
| `monthly_summary` | `month` | Chỉ đọc: tổng theo loại, chi theo danh mục, tiết kiệm, đầu tư ròng, chuyển tiền, các kỳ thẻ đến hạn. |

## Hành vi bảo đảm

- Chỉ ghi các cột input trong map; không đụng cột công thức.
- `request_id` là khóa chống trùng. Gọi lại cùng mã và cùng nội dung trả `status: already_recorded`; cùng mã khác nội dung trả `id_conflict`. Timeout hoặc lỗi mạng: gọi lại đúng params cũ hoặc `find`, không sinh mã mới.
- Ví, loại, danh mục được kiểm tra theo dropdown live trên sổ; mã tài sản theo Cài đặt.
- Ghi trong khóa (`LockService`), đọc lại hàng sau khi ghi. `result.warnings` chứa nội dung cột Nhắc bạn / Kiểm tra bổ sung; có cảnh báo thì báo người dùng.
- Kết quả ghi/sửa có `result.undo` để hoàn tác và `record.row` để báo vị trí.

## Ví dụ

```bash
scripts/ledger.sh record_entry '{"request_id":"<uuid>","date":"2026-10-04","description":"Ăn trưa","amount_vnd":130000,"category":"Ăn uống","wallet":"Thẻ Tech","type":"Chi tiêu","note":"130k vô thẻ tech tín dụng"}'
scripts/ledger.sh record_transfer '{"request_id":"<uuid>","date":"2026-10-28","from":"VCB 1","to":"Thẻ VIB","amount_vnd":565000,"period":"VIB-2026-10"}'
scripts/ledger.sh monthly_summary '{"month":"2026-10"}'
```

## Lỗi thường gặp

| Code | Xử lý |
|---|---|
| `unauthorized`, `not_configured` | Token sai hoặc chưa chạy `setup()`; không thử token khác, báo người dùng. |
| `bad_value` | `details.allowed` liệt kê giá trị hợp lệ; hỏi người dùng nếu không chắc. |
| `schema_mismatch` | Sổ đổi cấu trúc; dừng, đối chiếu workbook-map.md trước khi sửa code. |
| `busy` | Đợi vài giây rồi gọi lại cùng params. |
| `table_full` | Cần mở rộng bảng/công thức trên sổ trước khi ghi tiếp. |

## Deploy

```bash
npm i -g @google/clasp && clasp login   # bật Apps Script API tại script.google.com/home/usersettings trước
clasp create-script --type sheets --title "expense-book-api" --parentId <SPREADSHEET_ID> --rootDir apps-script
git checkout apps-script/appsscript.json   # create-script có thể ghi đè manifest mặc định
clasp push
# Mở editor (clasp open-script), chạy setup() một lần để cấp quyền và lấy API_TOKEN trong log.
clasp create-deployment -d "v1"          # in ra DEPLOYMENT_ID; URL = https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
# Các lần sau: clasp push && clasp create-deployment -i <DEPLOYMENT_ID> -d "..." (giữ nguyên URL)
```

Thay đổi cấu trúc sổ (ví dụ `addLoanWallet()` trong `Migrations.js`) không đi qua API: `clasp push`, đặt tên một phiên bản trong Lịch sử phiên bản của Sheets để có bản lưu, rồi chạy hàm đó một lần trong editor và đọc log.

`.clasp.json` chứa scriptId của sổ riêng nên đã gitignore; máy khác chạy `clasp clone-script <scriptId> --rootDir apps-script`.

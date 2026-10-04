# Finance agent — không cần backend

Folder này chứa sổ sạch bắt đầu 04/10/2026 và skill hướng dẫn agent ghi đúng nghiệp vụ. Không cần npm, server, API key hay Telegram. SKILL.md mô tả các thao tác nghiệp vụ; đây không phải API hoặc MCP server đã đăng ký.

## Dùng lần đầu

1. Cho agent truy cập package rồi nói: “Setup sổ chi tiêu này cho tôi: [link Google Sheets]”. Không cần sửa config.json hoặc tìm ID. Nếu chưa có link, agent hỏi link hoặc hỗ trợ chuyển file XLSX bạn chọn khi công cụ cho phép.
2. Agent đọc sổ, nhận diện cấu trúc, kiểm tra khả năng truy cập và tự lưu cấu hình. Nếu không lưu được vào folder, agent trả file cấu hình để bạn lưu; không giả định upload vào chat đồng nghĩa lưu bền vững.
3. Agent đọc Cài đặt rồi hỏi gọn những dữ kiện còn thiếu: ngày bắt đầu, số dư ngay trước ngày đó, ngày chốt/thời hạn thanh toán, nợ cũ và tài sản đang giữ. Ví không dùng nhập 0; nợ thẻ nhập âm. Không tự reset số dư đã có.
4. Sau đó nói tự nhiên: “Hôm nay ăn trưa 65k bằng VCB 1”, “VCB 1 trả VIB 2 triệu cho kỳ VIB-2026-09”, hoặc “Tháng này ăn uống hết bao nhiêu?”.

Nếu nói thiếu ví hoặc có nhiều kỳ thẻ phù hợp, agent sẽ hỏi phần còn thiếu. Giao dịch rõ ràng được ghi và đọc lại để xác nhận. Không cần tạo file mới mỗi tháng.

## Dùng trên iPhone

Folder ở Mac không tự trở thành folder mà agent trên iPhone đọc/ghi được. Với XLSX, mỗi phiên phải cung cấp bản mới nhất và lưu lại file agent trả về; không tiếp tục dùng bản cũ. Upload file vào chat không đồng nghĩa sửa trực tiếp file trên Mac/Drive.

Với Google Sheets, agent cần có công cụ Google Sheets được kết nối và có quyền ghi trong phiên đó. Việc kết nối Drive chỉ để tìm/đọc file chưa đủ chứng minh khả năng ghi. Cung cấp hướng dẫn của package cùng với link sổ. MD không tự cài tool hay cấp quyền.

## Sao lưu và giới hạn

Trước khi sửa XLSX, agent tạo bản sao trong backups, sửa bản tạm rồi kiểm tra trước khi thay file chính. Chỉ một agent/người ghi sổ tại một thời điểm. Chống ghi trùng bằng mã nguồn hỗ trợ retry, không đảm bảo giao dịch đồng thời như database.

Sổ có vùng nhập hữu hạn: 1.000 giao dịch, 200 chuyển tiền, 36 tháng kỳ thẻ, 2 tài sản với 12 tháng định giá. Agent phải mở rộng công thức, bảng và validation có kiểm tra khi hết vùng; không ghi lấn. Hai tab 10-26 và 11-26 là trang xem tháng; nhật ký lưu liên tục.

## Ghi từ điện thoại / cloud (API Apps Script)

Folder `apps-script/` là web app gắn vào sổ Google Sheets, cho phép agent ghi sổ qua HTTPS mà không cần trình duyệt hay máy Mac đang bật. Deploy một lần theo [references/api.md](references/api.md#deploy), rồi đặt hai biến môi trường ở nơi agent chạy (máy local, cloud environment của Claude Code):

- `EXPENSE_BOOK_URL`: URL `/exec` của web app.
- `EXPENSE_BOOK_TOKEN`: token lấy từ log của `setup()`.

Không commit hai giá trị này. Cloud environment cần cho phép truy cập mạng tới `script.google.com` và `script.googleusercontent.com`. Test helper thuần: `node --test tests/*.test.mjs`.

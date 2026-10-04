@AGENTS.md
@SKILL.md

Khi chạy trong cloud session hoặc từ điện thoại, ghi sổ qua `scripts/ledger.sh` (xem references/api.md). Gọi `scripts/ledger.sh ping` rồi `get_context` trước giao dịch đầu tiên của phiên. Khi `ping` trả `ok`, nguồn chính là sổ gắn với API đó; không cần config.json và không chạy references/setup.md. Thiếu `EXPENSE_BOOK_URL`/`EXPENSE_BOOK_TOKEN` hoặc bị chặn mạng tới script.google.com thì báo người dùng, không chuyển sang cách ghi khác.

Ví: "Tech" là tài khoản ngân hàng Techcombank, "Thẻ Tech" là thẻ tín dụng Techcombank. Người dùng nói "tech" mà không rõ tín dụng hay ngân hàng thì hỏi lại.

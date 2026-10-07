@AGENTS.md
@SKILL.md

Khi chạy trong cloud session hoặc từ điện thoại, ghi sổ qua `scripts/ledger.sh` (xem references/api.md). Gọi `scripts/ledger.sh ping` rồi `get_context` trước giao dịch đầu tiên của phiên. Khi `ping` trả `ok`, nguồn chính là sổ gắn với API đó; không cần config.json và không chạy references/setup.md. Thiếu `EXPENSE_BOOK_URL`/`EXPENSE_BOOK_TOKEN` hoặc bị chặn mạng tới script.google.com thì báo người dùng, không chuyển sang cách ghi khác.

Ví: "Tech" là tài khoản ngân hàng Techcombank, "Thẻ Tech" là thẻ tín dụng Techcombank. Người dùng nói "tech" mà không rõ tín dụng hay ngân hàng thì hỏi lại.

"VCB" không nói số thì mặc định là "VCB 2" (tài khoản tiêu dùng hằng ngày, từ 06/10/2026). Trả góp, trả trước khoản vay Agribank mặc định từ "VCB 1".

Khoản vay Agribank (đứng tên mẹ, người dùng trả, khoảng 9,3%/năm, kỳ ngày 10): ví "Vay Agribank" mang số âm là dư nợ gốc. Trả gốc hằng kỳ hoặc trả trước ghi `record_transfer` từ ví ngân hàng sang "Vay Agribank"; lãi và phí phạt trả trước ghi Chi tiêu, danh mục "Lãi vay". Không ghi gốc là Chi tiêu. Nếu `get_context` chưa có ví này thì `addLoanWallet()` chưa chạy: báo người dùng, không ghi phần gốc.

Subscription (YouTube channel, Copilot, phần mềm trả theo tháng/năm) ghi Chi tiêu danh mục "Subscription" sau khi `addSubscriptionCategory()` đã chạy; nếu `get_context` chưa có danh mục này thì tạm ghi "Cá nhân" và báo người dùng.

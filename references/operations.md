# Các thao tác nghiệp vụ

Đây là hợp đồng hướng dẫn cho agent, không phải các function đã đăng ký. Agent dùng công cụ spreadsheet của phiên để thực hiện.

| Thao tác | Dữ liệu bắt buộc | Đích |
|---|---|---|
| record_expense / record_income / record_refund | ngày, amount_vnd nguyên dương, ví, danh mục, nội dung, request_id | Ghi chép |
| transfer_money | ngày, amount_vnd, ví nguồn khác ví đích, request_id | Chuyển tiền; F để trống nếu không trả thẻ |
| repay_card | ngày, amount_vnd, ngân hàng, thẻ, statement_id, request_id | Chuyển tiền; F chứa mã kỳ |
| record_investment | mua/bán, ngày, amount_vnd, ví, mã tài sản đã cài, số lượng dương, request_id | Ghi chép, gồm L:M |
| confirm_statement | mã kỳ có thật, amount_vnd không âm, hạn trả nếu có | Thẻ tín dụng F và tùy chọn L |
| set_asset_price | mã tài sản, tháng YYYY-MM, giá VND/đơn vị, ngày giá | Đầu tư F:G đúng hàng |
| update_transaction / undo_transaction | ID hoặc mã nguồn duy nhất, trường cần sửa hoặc trạng thái trước sửa | Đúng ô input; không sửa theo vị trí hàng cũ chưa kiểm tra |
| monthly_summary | tháng YYYY-MM | Chỉ đọc; thu, chi, hoàn, tiết kiệm, đầu tư, chuyển tiền và nợ tách biệt |

Ví dụ: “Ăn trưa 65k VCB 1 hôm nay” → record_expense, amount_vnd=65000, category=Ăn uống. Agent lấy ngày hiện tại theo múi giờ cấu hình và sinh request_id.

“VCB 1 trả VIB 2 triệu” → tìm các kỳ VIB còn nợ. Nếu chỉ một kỳ phù hợp có thể chọn và nêu rõ kỳ trong xác nhận; nhiều kỳ thì hỏi. Nếu người dùng trả gộp nhiều kỳ, phân bổ theo chỉ định của người dùng, mỗi hàng một mã kỳ và mã nguồn con khác nhau. Không tự cho rằng tháng thanh toán là tháng chi tiêu.

Kết quả thao tác cần chứa ID/mã nguồn, tab/hàng hiện tại, các ô đã sửa và giá trị trước/sau. Khi chỉnh sửa nhiều hàng, lưu tiến độ từng mã nguồn để tiếp tục sau lỗi mà không ghi trùng. MD không bảo đảm atomic transaction hoặc concurrency.

# Map workbook v1

## Nhận diện bản có dashboard đầu tư

Đã đối chiếu `So-chi-tieu-dashboard-dau-tu.xlsx`: bảng `DauTuTheoThang` chuyển từ A9:L33 sang A36:L60. Trước mỗi lần ghi, đọc range của table và header thực tế để chọn map; không mặc định tọa độ bản cũ.

| Vị trí Đầu tư | Bản cũ | Bản dashboard đầu tư |
|---|---|---|
| Header bảng | A9:L9 | A36:L36 |
| Dữ liệu 24 hàng | A10:L33 | A37:L60 |
| Giá được nhập | F10:F33 | F37:F60 |
| Ngày giá được nhập | G10:G33 | G37:G60 |
| Tổng giá trị danh mục, chỉ đọc | H37 | H64 |
| Tổng lãi/lỗ, chỉ đọc | K37 | K64 |

Bản mới thêm bộ chọn tài sản H5 (input), ngày xem B5 liên kết Dashboard!I5 (công thức), KPI A9/D9/H9, bảng tổng hợp A15:D27 và vùng hỗ trợ chart N16:P27 (chỉ đọc). Không ghi giá vào F10:G33 của bản mới. Chọn hàng cập nhật giá bằng cặp tháng ở cột A và mã tài sản ở cột B trong table, không dựa vào thứ tự hàng.

Dashboard!I41 đã trỏ H64, Dashboard!I46 hiển thị lãi/lỗ từ K64. Hai tab 10-26 và 11-26, ô G32 đã trỏ vùng đầu tư mới. Ghi chép, Chuyển tiền, Thẻ tín dụng và Cài đặt giữ nguyên tọa độ và nội dung/công thức so với bản package.

File `data/so-chi-tieu.xlsx` đi kèm package hiện vẫn là bản cũ; bảng bên dưới mô tả bản cũ. Phần nhận diện trên hỗ trợ file mới khi người dùng chọn dùng nó. Không tự thay nguồn hoặc đồng bộ lên Google Sheets.

Tất cả số tiền là k VND. Đọc header và công thức live để phát hiện thay đổi cấu trúc.

| Tab | Ô input | Ô tính tự động — không ghi |
|---|---|---|
| Ghi chép, hàng 12:1011 | A ngày, B nội dung, C tiền k, D danh mục, E ví, F loại, I UUID, J mã nguồn, K ghi chú gốc, L số lượng tài sản, M mã tài sản, N ngày hạch toán tùy chọn | G kiểm tra, H tháng/năm, O ngày hạch toán hiệu lực, P ngày chốt dự kiến, Q kiểm tra |
| Chuyển tiền, hàng 12:211 | A ngày, B ví nguồn, C ví đích, D tiền k, E ghi chú, F mã kỳ nếu trả thẻ, H mã nguồn/ID | G kiểm tra, I tháng/năm |
| Thẻ tín dụng, hàng 12:83 | F dư sao kê đã xác nhận; L hạn trả thực tế tùy chọn | A mã kỳ, B thẻ, C ngày chốt, D hạn trả, E dư dự kiến, G cần trả, H đã trả, I còn lại, J trạng thái, K tháng/năm |
| Đầu tư, hàng 10:33 | F giá k/đơn vị, G ngày giá của đúng tài sản và tháng | A:E, H:L |
| Cài đặt | B5 ngày bắt đầu; B9:B14 số dư đầu kỳ (B15 nếu có ví vay); K8:K9 ngày chốt; L8:L9 số ngày đến hạn; J22:N23 mã/tên/đơn vị/số lượng/vốn đầu kỳ; C25:D224 ngân sách/ghi chú | Đọc các nhãn tương ứng; không thay tháng/danh mục ngân sách khi chỉ cập nhật số tiền |

Ví ban đầu theo A9:A14: Tiền mặt, VCB 1, VCB 2, Tech, Thẻ VIB, Thẻ Tech. Đọc lại danh sách khi dùng; không tự thêm ví vì công thức và dropdown có thể cần mở rộng.

Khoản vay: `addLoanWallet()` trong apps-script/Migrations.js (chạy một lần từ editor) thêm ví thứ 7 "Vay Agribank" ở Cài đặt A15:B15 (số dư đầu âm = dư nợ gốc tại ngày bắt đầu), dòng Dashboard H40:I40, dòng F31:G31 ở mỗi tab tháng và danh mục chi "Lãi vay" ở D19; các công thức đếm 6 ví thành 7. Ví vay không tính vào Nợ thẻ (Dashboard H10). Sau khi chạy, ví đọc ở A9:A15.

Loại: Chi tiêu, Thu nhập, Đầu tư, Hoàn tiền, Rút đầu tư.
Danh mục chi: Ăn uống, Quà tặng, Sức khỏe, Nhà cửa, Đi lại, Cá nhân, Thú cưng, Điện / nước, Khác, Phí / lãi thẻ, Lãi vay (sau `addLoanWallet()`).
Thu: Lương, Thưởng, Thu khác. Đầu tư: Vàng, Chứng khoán.

Dashboard B5 là năm báo cáo, I5 là ngày tính báo cáo. Khi trả thẻ đọc cả ngày này: khoản trả sau ngày báo cáo chưa được tính là đã trả. Đừng sửa số nợ để bù cho chênh lệch ngày báo cáo.

Kỳ trước ngày bắt đầu: F là phần còn chưa trả tại thời điểm mở sổ, không phải toàn bộ sao kê nếu đã trả một phần trước đó. Không nhập khoản thanh toán trước ngày bắt đầu thêm lần nữa. Đối chiếu với tổng dư nợ đầu kỳ; có thể còn phần chưa lên sao kê.

Ngày phải là date thực, không chuỗi tùy ý. Sheets locale vi_VN có thể dùng dấu chấm phẩy trong công thức; bảo toàn công thức hiện có. XLSX cần date serial/style chuẩn. Đọc số tiền dưới dạng số, không formatted string.

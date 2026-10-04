# Setup tự động, không backend

Đây là quy trình agent thực hiện khi được gọi với package, không phải tiến trình tự chạy khi mở folder. Chỉ thực hiện trong phạm vi yêu cầu người dùng và công cụ hiện có.

## Chọn và xác minh sổ

1. Đọc config.json nếu có. Nếu source đã chọn và người dùng không yêu cầu đổi, dùng đúng nguồn đó. Link khác trong hội thoại không tự động thay nguồn. Không chuyển sang bản cũ khi sổ hiện tại không truy cập được.
2. Khi chưa cấu hình, ưu tiên sổ người dùng chỉ định trong yêu cầu hiện tại. Với Google Sheets, lấy ID từ URL dạng https://docs.google.com/spreadsheets/d/ID/edit; gid là ID tab, không phải spreadsheet ID. Nếu chỉ có tên, tìm qua connector nếu có; nhiều ứng viên thì hỏi một câu để chọn. Nếu thiếu cả link lẫn file, hỏi “Bạn gửi link Google Sheets muốn dùng làm sổ chính nhé.” Không hỏi người dùng chép ID hay sửa JSON.
3. Nếu người dùng đã chọn Google Sheets nhưng mới đưa XLSX và yêu cầu setup, dùng chức năng import native nếu có, bảo toàn file gốc và kiểm tra kết quả chuyển đổi. Không chỉ upload XLSX rồi gọi đó là Google Sheets. Nếu công cụ không hỗ trợ, hướng dẫn người dùng chuyển file và gửi link. Tránh tạo bản trùng khi retry: tìm kết quả lần tạo trước, không import lại mù.
4. Đọc metadata và header/table thực tế. Kiểm tra tab Ghi chép, Chuyển tiền, Thẻ tín dụng, Đầu tư, Cài đặt và Dashboard cùng các cột theo workbook-map.md. Với Đầu tư, nhận diện bản cũ A9:L33 hoặc bản dashboard A36:L60 qua table DauTuTheoThang/header. Nếu khác, đối chiếu nhãn và công thức để lập map đúng trước khi ghi; không ép tọa độ cũ.
5. Kiểm tra có công cụ đọc và ghi range trong phiên, cùng quyền chỉnh sửa nếu API cung cấp. Có tool ghi không chứng minh tài khoản có quyền. Không tạo giao dịch giả, không sửa giá trị tiền để thử quyền. Lưu write_access là unverified, metadata_confirmed hoặc verified_by_write theo bằng chứng. Chỉ verified_by_write sau một yêu cầu ghi thật được phép và đọc lại thành công. Khi chưa có quyền/công cụ, vẫn có thể lưu lựa chọn sổ đã đọc được nhưng báo rõ chưa thể ghi.

## Lưu lựa chọn

Sau khi đọc và xác minh cấu trúc thành công, agent cập nhật config.json, giữ các trường không liên quan:

- source: google_sheets (hoặc xlsx khi người dùng chọn rõ).
- google_spreadsheet_id và setup.spreadsheet_url: lấy từ sổ đã xác minh; với xlsx dùng xlsx_path và để ID/URL null.
- setup.schema_variant: investment_dashboard_v2 hoặc original_v1.
- setup.verified_at: timestamp ISO 8601 thực tế.
- setup.status: configured; trạng thái này chỉ có nghĩa nguồn và cấu trúc đã kiểm tra.
- setup.write_access: bằng chứng quyền nêu trên; kiểm tra lại mỗi phiên.
- setup.financial_setup: incomplete hoặc complete theo dữ kiện trong sổ.

Nếu có quyền ghi folder, lưu file tạm rồi thay config và đọc lại JSON để kiểm tra. Nếu chỉ có attachment chat hoặc folder không ghi được, trả config.json đã điền dưới dạng file để người dùng lưu vào package/project; nói rõ cấu hình chưa được lưu bền vững. Không hứa tự nhớ qua các chat mới. Không lưu token, mật khẩu hay credentials trong package. Không tự tạo tab cấu hình ẩn trên sổ hoặc upload package sang Drive.

## Setup tài chính

Đọc Cài đặt hiện tại và các kỳ nợ cũ. Gom các dữ kiện thiếu thành một câu hỏi ngắn, cho phép người dùng trả lời nhiều lượt. Không hỏi lại dữ kiện hợp lệ đã có. Không mặc định số dư trống là 0, ngày bắt đầu là hôm nay hoặc ngày chốt của ngân hàng.

Ngày bắt đầu và số dư sáu ví phải rõ (0 là hợp lệ). Với thẻ đang dùng cần lịch chốt/hạn, tổng nợ và phần còn chưa trả theo kỳ cũ nếu có. Người dùng xác nhận không dùng thẻ thì không bắt điền lịch cho thẻ đó. Tài sản chỉ bắt khai khi người dùng có tài sản đầu kỳ hoặc yêu cầu giao dịch đầu tư. Phân biệt thiếu giá định giá với thiếu cấu hình: vẫn ghi được giao dịch hợp lệ, nhưng không khẳng định tổng tài sản đã đủ dữ liệu.

Ghi các dữ kiện người dùng cung cấp theo map và đọc lại. Chỉ cập nhật financial_setup=complete khi phần setup cần thiết đã đủ; không sửa số liệu để xóa cảnh báo. Kết thúc bằng tên/link sổ đang dùng, cấu hình lưu ở đâu, còn thiếu gì và khả năng ghi hiện tại. Nếu yêu cầu ban đầu có giao dịch đủ dữ kiện, tiếp tục ghi sau setup theo SKILL.md mà không hỏi xác nhận lại.

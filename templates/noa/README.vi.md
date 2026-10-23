# Noa

Mẫu portfolio tông giấy ấm cho một nhiếp ảnh gia chụp phim (nhân vật hư cấu Noa Lindqvist). Ảnh mở ra nguyên khung, không bị cắt, trong một khung xem toàn màn hình, chuyển ảnh bằng bàn phím hoặc vuốt; ở phần phòng tối, người xem kéo thanh trượt (hoặc chỉ cần chờ) để tấm ảnh hiện dần lên từ tờ giấy trắng; ba bài ghi chép mở ra thành bài đọc đầy đủ; phần bán ảnh in cho xem trước tấm ảnh và khổ giấy được chọn rồi soạn sẵn email hỏi mua; địa chỉ liên hệ có nút chép. Chỉ gồm HTML, CSS và JavaScript trong một tệp, không cần bước build.

## Chạy trên máy

Giải nén thư mục rồi mở `index.html` bằng Chrome, Edge, Firefox hoặc Safari bản mới. Cần có mạng để tải phông chữ từ Google Fonts (Instrument Serif, DM Sans, DM Mono); không có mạng thì trang dùng phông có sẵn trên máy. Nếu đang bật chế độ giảm chuyển động, các hiệu ứng hiện dần được tắt và nút tráng ảnh cho hiện ngay tấm ảnh hoàn chỉnh thay vì hiện dần từ từ; nội dung vẫn đọc được đầy đủ. Khi tắt JavaScript, ảnh và bài viết vẫn hiện, kèm một dòng nhắc về phòng tối và khung xem ảnh.

Để xem trang ổn định hơn, mở cửa sổ dòng lệnh trong thư mục này và chạy:

```sh
python3 -m http.server 8000
```

Trên Windows có thể dùng `py -m http.server 8000`. Mở **http://localhost:8000/** trong trình duyệt. Nhấn Ctrl+C để tắt. Chỉ cần cài Python nếu dùng cách chạy này; không cần npm hay bước build.

## Sửa ở đâu?

Ngoài ảnh, mọi thứ nằm trong **`index.html`**:

- **Chữ và đường dẫn:** nội dung là HTML thường trong thẻ `<body>`, bắt đầu từ `CONTENT & LINKS` (tên, thanh điều hướng, lời mở đầu). Các bài ghi chép nằm ở `CONTENT / FIELD NOTES`, khung xem ảnh ở `CONTENT / VIEWER`. Tên trên tab trình duyệt và đoạn mô tả nằm ở `<head>`.
- **Liên hệ:** thay `hello@example.com` ở chân trang (phần `08 / CONTACT & LINKS`) và ở `contactEmail` trong phần `SETTINGS` của script. Trang không gửi gì đi: nút hỏi mua mở ứng dụng email của người xem với thư soạn sẵn, và ở nơi việc đó bị chặn thì hiện sẵn nội dung để chép tay.
- **Ảnh in:** danh sách ảnh và khổ giấy (kèm giá) là các thẻ `<option>` của `print-choice` và `print-size` trong phần bán ảnh in. Lời văn của email hỏi mua nằm trong `SETTINGS.messages`.
- **Ảnh:** `assets/coast.webp` (ảnh đầu trang, cũng là tấm ảnh hiện lên trong phòng tối), `tide.webp`, `town.webp`, `valley.webp` và `winter.webp` (các ảnh tiêu biểu), `darkroom.webp` (khay tráng ảnh), `noa.webp` (ảnh chân dung), `notes.webp` (ghi chép). Tất cả là ảnh vuông (khoảng 1000×1000); khung xem hiện ảnh nguyên khung. Khi thay ảnh, nhớ sửa phần mô tả `alt` của từng thẻ `<img>`.
- **Màu và phông chữ:** tìm `THEME` ở đầu thẻ `<style>`; đường dẫn phông chữ nằm ở `<head>`.
- **Thời gian và câu thông báo:** `SETTINGS` ở đầu script chứa `developmentDuration` (thời gian một tấm ảnh tự hiện lên), `revealDuration`, `toastDuration`, và mọi câu thông báo ngắn trong `messages`.
- **Bố cục:** các quy tắc `@media` gần cuối thẻ `<style>` chứa bố cục cho máy tính bảng (từ 1100 px trở xuống) và điện thoại (từ 767 px trở xuống).

## Đưa lên mạng

Tải `index.html` cùng thư mục `assets/` lên nơi lưu trang tĩnh như GitHub Pages, Netlify, Cloudflare Pages hoặc máy chủ của bạn. Không cần lệnh build, backend, cookie hay localStorage. Muốn dùng địa chỉ `/demo/noa/`, đặt `index.html` và `assets/` cùng trong thư mục đó; đường dẫn ảnh là tương đối. Khi nhúng vào iframe có sandbox, cần cho phép chạy script; không cần quyền same-origin và trang không gửi biểu mẫu nào.

Phông chữ được tải từ Google Fonts, không nằm sẵn trong thư mục. Tên, địa danh, giá ảnh và các bài ghi chép chỉ để minh hoạ; ảnh được làm riêng cho bản demo này. Hãy thay bằng tác phẩm của bạn và kiểm tra quyền sử dụng mọi nội dung trước khi đăng hoặc bán lại.

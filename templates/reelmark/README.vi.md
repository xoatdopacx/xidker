# Reelmark

Mẫu trang giới thiệu gói gọn trong một màn hình, dành cho dịch vụ kết nối người làm video ngắn. Dùng được trên máy tính và điện thoại. Toàn bộ HTML, CSS và JavaScript nằm trong một file, không cần cài thư viện hay chạy bước build.

## Mở trang

Dùng Chrome, Edge, Firefox hoặc Safari bản mới, có bật JavaScript. Cần mạng để tải phông chữ Google Fonts và ảnh, video từ CloudFront.

- Nhấp đúp vào `index.html` để mở, hoặc
- Mở terminal trong thư mục này, chạy `python3 -m http.server 8080` rồi vào `http://localhost:8080`. Cách này cần có Python 3.

## Sửa nội dung

Mọi thứ đều nằm trong **`index.html`**:

- **Chữ:** tìm `<!-- COPY:` trong phần thân trang. Sửa menu, dòng giới thiệu, tiêu đề, mô tả và các ghi chú ở đó. Nhớ sửa cả `<title>` và phần mô tả ở đầu file.
- **Màu, phông chữ, khoảng cách:** sửa phần `<style>`, bắt đầu từ `:root`. Link Google Fonts nằm ngay phía trên. Vị trí trên máy tính dùng biến `--u`; phần cho điện thoại nằm trong `@media (max-width: 820px)`.
- **Ảnh và video:** tìm `const MEDIA` trong phần script, thay `poster` và `video` bằng link hoặc đường dẫn file của bạn. Cả hai phải là cùng một bảng hình tỉ lệ 16:9, chia **5 cột × 2 hàng**, không phải từng file dọc riêng. Các ô được đọc từ trái sang phải, hàng trên trước. Sửa tên mô tả các ô trong `TILES`.
- **Link:** điền đường dẫn vào các chỗ trống trong `const LINKS`. Menu và nút đăng nhập, đăng ký, tạo video chưa bấm được khi chưa có link thật. Mẫu này không kèm hệ thống tài khoản hay trang phụ.
- **Chuyển động:** tìm `/* CAROUSEL:` để sửa tốc độ và hình dáng dãy thẻ. Hàm `playEntrance()` điều khiển hiệu ứng lúc mở trang. Kéo hoặc vuốt để xem các thẻ; khi chọn dãy thẻ bằng bàn phím, dùng phím mũi tên để di chuyển, phím cách để dừng hoặc chạy tiếp. Nếu thiết bị bật giảm chuyển động, trang chỉ dùng ảnh tĩnh và không tự chạy.

Nếu dùng ảnh, video lưu cùng trang, đặt file trong thư mục này và dùng đường dẫn như `./poster.webp`. Trang không dùng cookie hay bộ nhớ trình duyệt.

## Đưa lên mạng

Tải thư mục này lên dịch vụ lưu trang tĩnh như Netlify, Cloudflare Pages, GitHub Pages hoặc máy chủ của bạn. Không cần lệnh build; chọn thư mục này làm thư mục xuất bản. Có thể đặt trang ở đường dẫn con như `/demo/reelmark/`; để `index.html` ngay trong thư mục đó. Nếu thay nguồn ảnh, video, hãy kiểm tra nguồn đó cho phép trang khác tải nội dung và hỗ trợ CORS.

Ảnh, video và Google Fonts đang được tải từ bên ngoài, không có sẵn trong thư mục. Trước khi bán hoặc đăng trang, hãy kiểm tra quyền sử dụng và phân phối lại nội dung bạn dùng.

# Iris

Mẫu trang giới thiệu trợ lý AI với nền tối, robot 3D nhìn theo con trỏ, hai tay chuyển động, mắt chớp và menu trên điện thoại. Đây là mẫu giao diện, chưa có chức năng trò chuyện với AI.

## Chạy trên máy

Giải nén thư mục rồi mở `index.html` bằng Chrome, Edge, Firefox hoặc Safari bản mới. Trình duyệt cần bật JavaScript, hỗ trợ WebGL 2 và có mạng để tải phông chữ, Three.js và hai mô hình robot từ các đường dẫn gốc. Nếu mô hình không tải được, trang sẽ tự vẽ robot thay thế. Thư viện Three.js vẫn cần tải được.

Để xem trang ổn định hơn, mở cửa sổ dòng lệnh trong thư mục này và chạy:

```sh
python3 -m http.server 8000
```

Trên Windows có thể dùng `py -m http.server 8000`. Mở **http://localhost:8000/** trong trình duyệt. Nhấn Ctrl+C để tắt. Chỉ cần cài Python nếu dùng cách chạy này; không cần npm hay bước build.

## Sửa ở đâu?

Tất cả đều nằm trong **`index.html`**:

- **Chữ và đường dẫn:** tìm `COPY & LINKS` trong phần HTML. Sửa menu, tiêu đề, đoạn mô tả và nút tại đây. Đổi các `href="#"` thành đường dẫn thật; nhớ sửa cả menu máy tính lẫn điện thoại. Tên trên tab trình duyệt nằm trong thẻ `<title>` ở `<head>`.
- **Màu, khoảng cách, phông chữ:** tìm `THEME`, `NAVIGATION`, `HERO` và `RESPONSIVE` trong thẻ `<style>`. Đường dẫn phông Figtree nằm ở `<head>`.
- **Mô hình robot:** tìm `MODEL URLS` ở đầu đoạn script và sửa `HEAD_GLB` / `ARM_GLB`. Mô hình mới cần có kích thước và hướng phù hợp. Nếu dùng đường dẫn bên ngoài, máy chủ đó phải cho phép CORS. Phần xử lý mô hình và robot dự phòng cũng ở trong script này.
- **Ảnh và video:** mẫu không có tệp ảnh, tệp video, thẻ ảnh hay đường dẫn video để thay. Biểu tượng tròn dùng CSS; mắt và ánh sáng được vẽ bằng hàm `radialTexture()` trong script. Robot dùng hai đường dẫn GLB nói trên.
- **Vị trí và chuyển động:** tìm `LAYOUT` và `POINTER, IDLE LOOK, AND ANIMATION` trong script.

## Đưa lên mạng

Tải `index.html` lên nơi lưu trang tĩnh như GitHub Pages, Netlify, Cloudflare Pages hoặc máy chủ của bạn. Không cần lệnh build, backend, cookie hay localStorage. Muốn dùng địa chỉ `/demo/iris/`, đặt tệp `index.html` trong thư mục đó. Nếu thêm tệp riêng, dùng đường dẫn tương đối, ví dụ `./images/example.webp`. Khi nhúng vào iframe có sandbox, cần cho phép chạy script; không cần quyền same-origin.

Phông chữ, thư viện và mô hình được tải từ bên ngoài, không nằm sẵn trong thư mục. Hãy kiểm tra đường dẫn còn hoạt động và quyền sử dụng nội dung trước khi đăng hoặc bán lại.

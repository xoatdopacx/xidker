# Michelle

Mẫu trang portfolio cho nhà thiết kế 3D, chạy theo thao tác cuộn. Phần mở đầu có tượng bán thân 3D nhiều mặt và những quả bóng da rơi xuống như thật; khi cuộn, trang bay qua một hành lang trưng bày màu trắng, đến danh sách tác phẩm có ảnh xem trước bay theo, rồi kết thúc ở màn hình liên hệ nơi các quả bóng quay lại. Chỉ gồm HTML, CSS và JavaScript trong một tệp, không cần bước build.

## Chạy trên máy

Giải nén thư mục rồi mở `index.html` bằng Chrome, Edge, Firefox hoặc Safari bản mới. Trình duyệt cần bật JavaScript và có mạng để tải phông chữ (Anton, Antonio) và thư viện Three.js từ các đường dẫn gốc. Nếu máy không hỗ trợ WebGL 2 hoặc đang bật chế độ giảm chuyển động, các cảnh sẽ chuyển mờ dần thay vì bay, nội dung vẫn đọc được đầy đủ.

Để xem trang ổn định hơn, mở cửa sổ dòng lệnh trong thư mục này và chạy:

```sh
python3 -m http.server 8000
```

Trên Windows có thể dùng `py -m http.server 8000`. Mở **http://localhost:8000/** trong trình duyệt. Nhấn Ctrl+C để tắt. Chỉ cần cài Python nếu dùng cách chạy này; không cần npm hay bước build.

## Sửa ở đâu?

Ngoài ảnh, mọi thứ nằm trong **`index.html`**:

- **Chữ và đường dẫn:** tìm các ghi chú `COPY:` trong phần HTML: `COPY: HERO` (tên, đoạn giới thiệu, dòng tiêu đề cuối màn hình), `COPY: SELECTED WORK` (danh sách dự án) và `COPY: CONTACT` (tiêu đề, email, liên kết cuối trang). Chữ 3D trong hành lang và tấm danh sách trên tường đều lấy từ chính phần chữ này nên chỉ cần sửa một lần. Thay `hello@example.com` ở cả hai chỗ (liên kết `mailto:` và chữ hiển thị) và các `href="#"`. Tên trên tab trình duyệt nằm trong thẻ `<title>` ở `<head>`.
- **Dự án:** mỗi dòng là một thẻ `<a class="row">` có `href` (đường dẫn), `data-image` (ảnh xem trước) và `data-alt` (mô tả ảnh cho trình đọc màn hình). Thêm hoặc xoá nguyên khối `<li>`. Bố cục được canh cho ba dòng; nếu thêm dòng, hãy xem lại trên màn hình nhỏ.
- **Bóng cuối trang:** mỗi liên kết cuối trang có `data-ball-color` (màu bóng) và `data-ball-glyph` (một hoặc hai ký tự in trên bóng). Thêm liên kết mới là có thêm bóng mới.
- **Ảnh:** thư mục `assets/` chứa ba ảnh dự án (`.webp`, tỉ lệ 16:10, ví dụ 1024×640). Ảnh thay thế nên giữ tỉ lệ 16:10.
- **Màu và phông chữ:** tìm `THEME` trong thẻ `<style>`; đường dẫn phông chữ nằm ở `<head>`. Màu các phòng trong hành lang là `ROOM_COLORS` trong phần `SETTINGS` của script.
- **Thời điểm và chuyển động:** tìm `SETTINGS` ở đầu script. `T` là các mốc cuộn của từng cảnh (0 = đầu trang, 1 = cuối), `FOV` là góc nhìn của camera, `SHEET` là kích thước tấm danh sách trên tường cuối.
- **Tượng bán thân:** hàm `buildBust()` trong phần `3D` dựng tượng bằng các khối hình đơn giản ngay trong code, không có tệp mô hình nào phải thay. Màu của tượng là các hằng số ở đầu hàm này.

## Đưa lên mạng

Tải `index.html` cùng thư mục `assets/` lên nơi lưu trang tĩnh như GitHub Pages, Netlify, Cloudflare Pages hoặc máy chủ của bạn. Không cần lệnh build, backend, cookie hay localStorage. Muốn dùng địa chỉ `/demo/michelle/`, đặt `index.html` và `assets/` cùng trong thư mục đó; đường dẫn ảnh là tương đối. Khi nhúng vào iframe có sandbox, cần cho phép chạy script; không cần quyền same-origin. Liên kết cuối trang mở trong tab mới nên iframe cũng cần `allow-popups`.

Phông chữ và thư viện được tải từ bên ngoài, không nằm sẵn trong thư mục. Ba ảnh dự án chỉ để minh hoạ; hãy thay bằng tác phẩm của bạn và kiểm tra quyền sử dụng mọi nội dung trước khi đăng hoặc bán lại.

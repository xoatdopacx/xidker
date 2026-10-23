# Kin OS

Mẫu trang giới thiệu một hệ điều hành AI riêng tư, chạy ngay trên máy người dùng, hoạt động theo thao tác cuộn. Tượng bán thân làm từ hàng chục nghìn điểm sáng nhìn theo người xem và tách ra như nước khi rê chuột qua. Khi cuộn, màn hình thu lại thành một cửa sổ máy tính với các ô thông tin bay quanh, rồi phóng sát vào khuôn mặt điểm sáng cho phần Memory và Agents, và kết thúc bằng lời mời đăng ký chờ. Chỉ gồm HTML, CSS và JavaScript trong một tệp, không cần bước build. Đây là mẫu giao diện: ô đăng ký chưa gửi đi đâu cho đến khi bạn nối với dịch vụ của mình.

## Chạy trên máy

Giải nén thư mục rồi mở `index.html` bằng Chrome, Edge, Firefox hoặc Safari bản mới. Trình duyệt cần bật JavaScript và có mạng để tải phông chữ (Inter, Silkscreen, JetBrains Mono) và thư viện Three.js từ các đường dẫn gốc. Nếu máy không hỗ trợ WebGL 2, tượng được thay bằng một quầng sáng tĩnh; nếu đang bật chế độ giảm chuyển động, các cảnh chuyển sang nhau mà không có hiệu ứng tán điểm, lấp lánh hay gõ chữ. Nội dung vẫn đọc được đầy đủ trong cả hai trường hợp.

Để xem trang ổn định hơn, mở cửa sổ dòng lệnh trong thư mục này và chạy:

```sh
python3 -m http.server 8000
```

Trên Windows có thể dùng `py -m http.server 8000`. Mở **http://localhost:8000/** trong trình duyệt. Nhấn Ctrl+C để tắt. Chỉ cần cài Python nếu dùng cách chạy này; không cần npm hay bước build.

## Sửa ở đâu?

Ngoài ảnh, mọi thứ nằm trong **`index.html`**:

- **Chữ và đường dẫn:** tìm `COPY & LINKS` ở đầu thẻ `<body>`. Thanh điều hướng, bốn cảnh, phần kết và chân trang đều là HTML thường ở đây. Đổi các `href="#"` (Privacy, Terms, Contact) thành đường dẫn thật. Chữ trong hộp đăng ký là `MODES` trong phần `DIALOG` của script; các câu tự gõ trong ô hỏi Kin là `SUGGESTIONS` trong phần `SETTINGS`. Tên trên tab trình duyệt và đoạn mô tả nằm ở `<head>`.
- **Đăng ký chờ:** tìm `WAITLIST` trong script. Hàm `joinWaitlist(email)` nhận địa chỉ email đã được kiểm tra; hiện tại hàm chỉ chờ nửa giây rồi báo thành công, không gửi gì cả. Thay phần thân hàm bằng lệnh gửi tới dịch vụ của bạn (có ví dụ trong ghi chú) và trả về `true` khi đã lưu được. Trả về `false` hoặc báo lỗi thì hộp đăng ký sẽ hiện thông báo lỗi.
- **Ảnh:** `assets/person-1.webp` đến `person-4.webp` (vuông, 220×220) dùng cho ô People, `assets/place.webp` (tỉ lệ 16:10, 720×450) dùng cho ô Places. Khi thay ảnh, nhớ sửa phần mô tả `alt` của từng thẻ `<img>`.
- **Màu và phông chữ:** tìm `THEME` trong thẻ `<style>`; đường dẫn phông chữ nằm ở `<head>`. Trong phần `SETTINGS` của script, `COLORS` là màu các điểm sáng trên tượng, `BLOOM` là độ toả sáng, `POINT_SIZE` là kích thước mỗi điểm.
- **Thời điểm:** trong phần `SETTINGS`, `T` là các mốc cuộn của từng hiệu ứng (0 = bắt đầu đoạn cuộn, 1 = kết thúc), `NAV` là vị trí mà mỗi liên kết trên thanh điều hướng nhảy tới, `STAGES` là chỗ cảnh này chuyển sang cảnh sau.
- **Bố cục:** phần `RESPONSIVE` trong thẻ `<style>` chứa quy tắc cho máy tính bảng (từ 1100 px trở xuống) và điện thoại (từ 760 px trở xuống).
- **Tượng bán thân:** hình dạng của tượng là khối dữ liệu base64 trong `<script id="bust-data">` ở cuối trang: bản đồ độ sâu đã nén của một mô hình đầu và vai (khoảng 46 KB), có thêm phần tóc. Dữ liệu được làm từ mô hình gốc của MakeHuman, thuộc phạm vi công cộng (CC0). Nên giữ nguyên trừ khi bạn có dữ liệu riêng cùng định dạng; hàm `decodeBust()` trong phần `BUST` đọc khối này.

## Đưa lên mạng

Tải `index.html` cùng thư mục `assets/` lên nơi lưu trang tĩnh như GitHub Pages, Netlify, Cloudflare Pages hoặc máy chủ của bạn. Không cần lệnh build, backend, cookie hay localStorage. Muốn dùng địa chỉ `/demo/kin/`, đặt `index.html` và `assets/` cùng trong thư mục đó; đường dẫn ảnh là tương đối. Khi nhúng vào iframe có sandbox, cần cho phép chạy script; không cần quyền same-origin. Ô đăng ký không gửi biểu mẫu nên vẫn chạy được ở nơi chặn biểu mẫu. Khi `joinWaitlist` đã gọi tới dịch vụ thật, dịch vụ đó phải chấp nhận yêu cầu từ địa chỉ trang của bạn (CORS).

Phông chữ và thư viện được tải từ bên ngoài, không nằm sẵn trong thư mục. Ảnh chân dung, ảnh phong cảnh và các con số trong ô thông tin (số khoảnh khắc đã lưu, thời gian tiết kiệm, v.v.) chỉ để minh hoạ; hãy thay chúng và kiểm tra quyền sử dụng mọi nội dung trước khi đăng hoặc bán lại.

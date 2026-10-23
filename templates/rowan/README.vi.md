# Rowan

Mẫu portfolio tông tối, bố cục như một trang tạp chí, dành cho một kỹ sư phần mềm làm việc độc lập (nhân vật hư cấu Rowan Hale). Bấm vào thẻ dự án sẽ mở hộp xem chi tiết dự án; phần quá trình làm việc cho xem lần lượt từng vị trí như các phiên bản phát hành và có chế độ so sánh thay đổi; các bài viết ngắn mở rộng ngay tại chỗ; có một chiếc radio nhạc nền do chính trình duyệt phát, chỉ bật khi người xem bấm; phần liên hệ có nút chép địa chỉ email. Chỉ gồm HTML, CSS và JavaScript trong một tệp, không cần bước build.

## Chạy trên máy

Giải nén thư mục rồi mở `index.html` bằng Chrome, Edge, Firefox hoặc Safari bản mới. Cần có mạng để tải phông chữ từ Google Fonts (Bricolage Grotesque, DM Sans, IBM Plex Mono); không có mạng thì trang dùng phông có sẵn trên máy. Nếu đang bật chế độ giảm chuyển động, các hiệu ứng hiện dần và chuyển cảnh được tắt, nội dung vẫn đọc được đầy đủ.

Để xem trang ổn định hơn, mở cửa sổ dòng lệnh trong thư mục này và chạy:

```sh
python3 -m http.server 8000
```

Trên Windows có thể dùng `py -m http.server 8000`. Mở **http://localhost:8000/** trong trình duyệt. Nhấn Ctrl+C để tắt. Chỉ cần cài Python nếu dùng cách chạy này; không cần npm hay bước build.

## Sửa ở đâu?

Ngoài ảnh, mọi thứ nằm trong **`index.html`**. Ghi chú ở đầu thẻ `<body>` liệt kê vị trí của từng phần.

- **Chữ và đường dẫn:** các phần của trang là những khối HTML đánh số từ `CONTENT 00` (phần mở đầu) đến `CONTENT 07` (liên hệ); thanh điều hướng và chân trang nằm ở `CONTENT & LINKS`. Các phiên bản trong quá trình làm việc nằm ở `CONTENT 03`, các bài viết ở `CONTENT 04`. Tên trên tab trình duyệt và đoạn mô tả nằm ở `<head>`.
- **Dự án:** mỗi thẻ trong `CONTENT 01` mở hộp chi tiết có cùng id trong phần `PROJECT DETAIL CONTENT` gần cuối thẻ `<body>`. Khi đổi một dự án, sửa cả hai chỗ.
- **Lời nhận xét:** `CONTENT 06` là một câu nhận xét mẫu của nhân vật hư cấu. Hãy thay bằng nhận xét thật hoặc xoá khối này.
- **Liên hệ:** thay `hello@example.com` trong đường dẫn liên hệ ở `CONTENT 07`; nút chép đọc địa chỉ từ đường dẫn đó. Ở nơi trình duyệt chặn việc chép (một số khung xem trước nhúng trong trang khác), địa chỉ được bôi đen sẵn để người xem tự chép.
- **Ảnh:** `assets/signal-instrument.webp` (ảnh đầu trang, vuông 1024×1024), `assets/latchline.webp` và `assets/threadwork.webp` (thẻ dự án và hộp chi tiết, vuông 1000×1000). Nên dùng ảnh vuông, hoặc kiểm tra lại phần cắt ảnh sau khi thay, và sửa mô tả `alt` của từng thẻ `<img>`.
- **Màu và phông chữ:** tìm `THEME` ở đầu thẻ `<style>`; đường dẫn phông chữ nằm ở `<head>`.
- **Thời gian và radio:** thời gian hiệu ứng của CSS nằm ở `SETTINGS` trong `:root`. `SETTINGS` của JavaScript ở đầu đoạn script cuối cùng chứa độ trễ giữa các mục hiện dần, thời gian hiện thông báo, nhịp cập nhật đồng hồ, cùng độ mờ dần, âm lượng tối đa và các nốt nhạc của radio; `UI_COPY` ngay bên cạnh chứa các câu thông báo ngắn.
- **Bố cục:** các khối `RESPONSIVE` trong thẻ `<style>` chứa quy tắc cho máy tính bảng (từ 1100 px trở xuống) và điện thoại (từ 767 px trở xuống).

## Đưa lên mạng

Tải `index.html` cùng thư mục `assets/` lên nơi lưu trang tĩnh như GitHub Pages, Netlify, Cloudflare Pages hoặc máy chủ của bạn. Không cần lệnh build, backend, cookie hay localStorage. Muốn dùng địa chỉ `/demo/rowan/`, đặt `index.html` và `assets/` cùng trong thư mục đó; đường dẫn ảnh là tương đối. Khi nhúng vào iframe có sandbox, cần cho phép chạy script; không cần quyền same-origin và trang không gửi biểu mẫu nào.

Phông chữ được tải từ Google Fonts, không nằm sẵn trong thư mục. Tên, khách hàng, dự án, lời nhận xét và các con số chỉ để minh hoạ; ảnh được làm riêng cho bản demo này. Hãy thay bằng nội dung của bạn và kiểm tra quyền sử dụng mọi nội dung trước khi đăng hoặc bán lại.

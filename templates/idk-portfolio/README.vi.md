# idk portfolio

Mẫu portfolio một trang tông tối, đậm chất điện ảnh, dành cho một studio kỹ thuật sáng tạo (idk workshop). Phía sau toàn bộ trang là một mặt biển 3D lúc hoàng hôn, chạy theo thời gian thực bằng three.js: sóng lừng tạo từ nhiễu simplex 4 tầng, hai lớp gợn sóng nhỏ trôi chậm, mặt nước phản chiếu bầu trời theo hiệu ứng Fresnel và vệt nắng được nén mềm cho khỏi chói. Một chiếc đèn phát sáng lướt trên mặt nước: nó đi theo chuột hoặc bút, khi con trỏ đứng yên thì tự quay về lộ trình riêng; một mô phỏng sóng chạy trên card đồ hoạ vẽ vệt sóng hình chữ V (sóng Kelvin) và bọt nước phía sau nó. Thanh điều khiển dưới phần mở đầu cho chỉnh tốc độ đèn, độ cao sóng và độ cao máy quay, kèm ba chế độ dựng sẵn; máy quay nâng dần lên khi cuộn trang. Ngoài ra còn có màn hình chờ tải, cuộn trang mượt (Lenis), con trỏ riêng, thẻ dự án, lưới năng lực và phần hỏi đáp mở ngay tại chỗ. Chỉ gồm HTML, CSS và JavaScript dạng module, không cần bước build.

## Chạy trên máy

Trang tải các tệp JavaScript dạng module, mà trình duyệt chỉ cho phép khi trang được mở qua một máy chủ web. Nếu mở thẳng tệp `index.html` từ thư mục, trang chỉ hiện biển tĩnh thay cho biển 3D. Hãy mở cửa sổ dòng lệnh trong thư mục này và chạy máy chủ đi kèm:

```sh
python3 serve.py
```

Trên Windows dùng `py serve.py`. Mở **http://localhost:8080/** trong trình duyệt; muốn dùng cổng khác thì chạy `python3 serve.py 8000`. Nhấn Ctrl+C để tắt. Máy chủ tĩnh nào cũng dùng được, miễn là gửi tệp `.js` đúng kiểu JavaScript. Không cần npm hay bước build. Phông chữ, three.js và Lenis đã nằm sẵn trong thư mục nên trang chạy được cả khi không có mạng.

Biển 3D cần WebGL2, các trình duyệt máy tính và điện thoại hiện nay đều có. Nếu thiếu, trang giữ hình biển hoàng hôn tĩnh và ẩn thanh điều khiển biển. Trên điện thoại và máy ít nhân xử lý, phần mô phỏng vệt sóng và lưới mặt nước dùng ít ô hơn, độ nét hình tự điều chỉnh để chuyển động luôn mượt. Biển ngừng vẽ khi đã cuộn khuất khỏi màn hình. Nếu đang bật chế độ giảm chuyển động, biển chuyển động chậm, máy quay thôi đung đưa, cuộn mượt và hiệu ứng hiện dần ở phần mở đầu được tắt.

## Sửa ở đâu?

- **Chữ và đường dẫn:** tất cả nằm trong **`index.html`**, chia thành các khối có ghi chú từ `1. HERO SECTION` đến `6. FOOTER`. Tên trên tab trình duyệt và đoạn mô tả nằm ở `<head>`.
- **Email:** `hello@idkworkshop.com` xuất hiện ở nút trên thanh đầu trang, nút "Request Full Archive", câu trả lời hỏi đáp thứ ba và chân trang (cả đường dẫn lẫn chữ). Hãy thay ở tất cả các chỗ.
- **Dự án:** bốn thẻ trong khối `3. SELECTED WORKS ARCHIVE`. Ảnh của chúng là `assets/works/work-01-aether.svg` đến `work-04-solaris.svg` (1200×800). Dùng được ảnh SVG, WebP hoặc JPEG; ảnh được cắt cho vừa khung tỉ lệ 16:10. Nhớ sửa mô tả `alt` của từng thẻ `<img>`.
- **Nội dung giới thiệu:** chữ trên trang mô tả dịch vụ của idk workshop. Đoạn mô tả trang, một nhãn dự án và một thẻ năng lực có nhắc đến GSAP, nhưng mẫu này không dùng GSAP (phần cuộn dùng Lenis cùng mã riêng của trang). Hãy giữ, sửa hoặc bỏ các dòng đó cho đúng với những gì bạn làm.
- **Màu và phông chữ:** màu của trang là các biến ở đầu `css/style.css`. Tệp phông chữ nằm trong `fonts/` và được khai báo trong `css/fonts.css`.
- **Biển 3D:** `OCEAN_SETTINGS` ở đầu `js/ocean/index.js` chứa màu trời, nước, bọt và đèn, vị trí mặt trời, sóng lừng và gợn sóng, phần mô phỏng vệt sóng, lộ trình của đèn, giới hạn độ cao máy quay và giới hạn độ nét; mỗi dòng có ghi chú ngắn. Mã đổ bóng (shader) nằm trong `js/ocean/shaders.js`.
- **Chế độ dựng sẵn và thời gian:** đầu `js/app.js` có `SETTINGS` (thời gian màn hình chờ và hiệu ứng hiện dần, mức nâng máy quay khi cuộn) và `OCEAN_PRESETS` (các giá trị của Calm Horizon, Deep Voyage và Kinetic Swell). Nếu đổi khoảng giá trị của thanh trượt trong `index.html`, hãy giữ các chế độ dựng sẵn nằm trong khoảng đó.
- **Thử giá trị trực tiếp:** trong cửa sổ console của trình duyệt, `__idkOcean` là mặt biển đang chạy, ví dụ `__idkOcean.setSwell(2.6)` hoặc `__idkOcean.setAltitude(30)`. Ghi chú ở đầu `js/ocean/index.js` liệt kê mọi lệnh.
- **Bố cục:** các quy tắc theo kích thước màn hình nằm ở cuối `css/style.css` (từ 1024, 640, 480 và 360 px trở xuống).

## Đưa lên mạng

Tải thư mục lên nơi lưu trang tĩnh như GitHub Pages, Netlify, Cloudflare Pages hoặc máy chủ của bạn; không cần đưa `serve.py` và các tệp README lên. Không cần lệnh build, backend, cookie hay localStorage. Mọi đường dẫn đều là tương đối nên trang chạy được cả trong thư mục con. Nếu nơi lưu trang có đặt chính sách bảo mật nội dung (Content Security Policy), cần cho phép import map viết thẳng trong `index.html` (một đoạn script nội tuyến) và style nội tuyến. Khi nhúng vào iframe có sandbox, cần cho phép chạy script và gửi các tệp kèm header `Access-Control-Allow-Origin`, vì khi đó script module và phông chữ được tải như từ một nguồn khác.

Tên studio, dự án, các con số và email là của idk workshop; hãy thay bằng thông tin của bạn trước khi đăng. Phông chữ (Syne, Plus Jakarta Sans, JetBrains Mono) dùng giấy phép SIL Open Font License, tệp giấy phép nằm trong `fonts/`. three.js r186 và Lenis 1.3.27 dùng giấy phép MIT, tệp giấy phép nằm trong `vendor/`. Mã biển 3D trong `js/ocean/` được viết riêng cho mẫu này.

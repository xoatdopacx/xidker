# Plinth

Mẫu portfolio tông giấy nhẹ nhàng cho một văn phòng kiến trúc và nội thất nhỏ (văn phòng hư cấu Plinth). Các dự án lọc được theo nhóm và mở ra thành hồ sơ đầy đủ; ở phần bản vẽ, người xem kéo qua lại giữa mặt bằng và căn phòng đã hoàn thiện; danh sách vật liệu mở từng loại một kèm ảnh; các bài nhật ký mở ra thành bài đọc đầy đủ; phần liên hệ có nút chép địa chỉ email. Chỉ gồm HTML, CSS và JavaScript trong một tệp, không cần bước build.

## Chạy trên máy

Giải nén thư mục rồi mở `index.html` bằng Chrome, Edge, Firefox hoặc Safari bản mới. Cần có mạng để tải phông chữ từ Google Fonts (Manrope, Instrument Serif, DM Mono); không có mạng thì trang dùng phông có sẵn trên máy. Nếu đang bật chế độ giảm chuyển động, các hiệu ứng hiện dần và chuyển cảnh được tắt, nội dung vẫn đọc được đầy đủ. Thanh kéo mặt bằng dùng được cả bằng tay trên màn hình cảm ứng và bằng phím mũi tên.

Để xem trang ổn định hơn, mở cửa sổ dòng lệnh trong thư mục này và chạy:

```sh
python3 -m http.server 8000
```

Trên Windows có thể dùng `py -m http.server 8000`. Mở **http://localhost:8000/** trong trình duyệt. Nhấn Ctrl+C để tắt. Chỉ cần cài Python nếu dùng cách chạy này; không cần npm hay bước build.

## Sửa ở đâu?

Ngoài ảnh, mọi thứ nằm trong **`index.html`**:

- **Chữ và đường dẫn:** thanh điều hướng nằm ở `CONTENT & LINKS / NAVIGATION`; các phần của trang là các khối từ `CONTENT / 00 — OPENING` đến `CONTENT & LINKS / 07 — CONTACT`. Tên trên tab trình duyệt và đoạn mô tả nằm ở `<head>`.
- **Dự án:** mỗi thẻ trong `CONTENT / 02 — SELECTED PROJECTS` có tên `data-project` và nhóm `data-category` mà các nút lọc phía trên dùng (nhớ sửa cả con số trên các nút). Hồ sơ mở ra là thẻ `<template id="project-…">` cùng tên trong phần `CONTENT / PROJECT FOLIOS`; muốn thêm dự án thì thêm một thẻ dự án và một template tương ứng.
- **Nhật ký:** các bài viết đầy đủ nằm ở `CONTENT / JOURNAL ENTRIES`.
- **Bản vẽ:** mặt bằng là một hình SVG viết thẳng trong `CONTENT / 03 — FROM LINE TO LIFE`. Đây là bản vẽ minh hoạ ý tưởng, không phải bản vẽ thi công; hãy thay bằng mặt bằng của bạn.
- **Liên hệ:** thay email trong đường dẫn liên hệ và trong ô chép tay ở `CONTENT & LINKS / 07 — CONTACT`; nút chép đọc địa chỉ từ đường dẫn đó. Ở nơi trình duyệt chặn việc chép (một số khung xem trước nhúng trong trang khác), địa chỉ được hiện sẵn để chép tay.
- **Ảnh:** `assets/courtyard.webp` (ảnh đầu trang, phần bản vẽ và dự án Marden Courtyard), `alder-house.webp`, `fold-house.webp` và `still-room.webp` (các dự án), `window-detail.webp` và `material-study.webp` (vật liệu và nhật ký), `studio.webp` (hai kiến trúc sư). Một số ảnh được dùng lại ở danh sách vật liệu, phần ghi chép và hồ sơ dự án, nên hãy tìm theo tên tệp để thấy hết các chỗ ảnh xuất hiện. Ảnh vuông, khoảng 1000×1000 (`alder-house.webp` là 860×860). Khi thay ảnh, nhớ sửa phần mô tả `alt` của từng thẻ `<img>`.
- **Màu và phông chữ:** tìm `PLINTH / THEME` ở đầu thẻ `<style>`; đường dẫn phông chữ nằm ở `<head>`.
- **Thời gian:** `SETTINGS / BEHAVIOUR & ANIMATION TIMINGS` ở đầu script chứa thời gian và điểm bắt đầu hiệu ứng hiện dần, thời gian hiện thông báo đã chép, và độ rộng màn hình mà từ đó trở xuống dùng menu điện thoại.
- **Bố cục:** các quy tắc `@media` trong thẻ `<style>` chứa bố cục cho máy tính bảng (từ 1100 px trở xuống) và điện thoại (từ 767 px trở xuống).

## Đưa lên mạng

Tải `index.html` cùng thư mục `assets/` lên nơi lưu trang tĩnh như GitHub Pages, Netlify, Cloudflare Pages hoặc máy chủ của bạn. Không cần lệnh build, backend, cookie hay localStorage. Muốn dùng địa chỉ `/demo/plinth/`, đặt `index.html` và `assets/` cùng trong thư mục đó; đường dẫn ảnh là tương đối. Khi nhúng vào iframe có sandbox, cần cho phép chạy script; không cần quyền same-origin và trang không gửi biểu mẫu nào.

Phông chữ được tải từ Google Fonts, không nằm sẵn trong thư mục. Tên văn phòng, hai kiến trúc sư, dự án, địa danh và các bài viết chỉ để minh hoạ; ảnh được làm riêng cho bản demo này. Hãy thay bằng tác phẩm của bạn và kiểm tra quyền sử dụng mọi nội dung trước khi đăng hoặc bán lại.

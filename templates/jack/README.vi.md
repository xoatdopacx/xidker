# Jack — 3D Creator

Mẫu trang giới thiệu portfolio dùng React, TypeScript, Vite, Tailwind CSS 3 và Framer Motion. Trang có phần mở đầu, hai hàng GIF chạy theo khi cuộn, giới thiệu, năm dịch vụ và ba dự án xếp chồng. Không cần máy chủ xử lý dữ liệu, tài khoản, cookie hay localStorage.

## Chạy trên máy

Cài **Node.js 20.19 trở lên** (nên dùng Node.js 22 LTS). npm có sẵn khi cài Node.js. Cần mạng để cài thư viện và tải ảnh, GIF, phông chữ từ các đường dẫn có sẵn.

1. Giải nén và mở thư mục `jack` trong trình soạn thảo.
2. Mở terminal ngay trong thư mục đó, chạy:

```sh
npm install
npm run dev
```

Mở đường dẫn mà terminal hiện ra bằng trình duyệt. Đừng mở thẳng tệp `index.html`.

## Đổi nội dung

- **Chữ và menu:** mở `src/data/content.ts`, sửa các phần `HERO`, `LABELS`, `ABOUT_TEXT`, `NAV_LINKS`, `SERVICES` và `PROJECTS`.
- **Email:** sửa `CONTACT_EMAIL` ở đầu `src/data/content.ts`. `hello@example.com` chỉ là địa chỉ mẫu, không phải email thật của Jack. Mục “Contact” và hai nút “Contact Me” cùng dùng email này.
- **Link dự án:** sửa `href` của từng mục trong `PROJECTS`, cũng ở `src/data/content.ts`. Đề bài không có link trang dự án nên đang để `https://example.com`.
- **Ảnh:** trong `src/data/content.ts`, sửa `HERO.portrait`, `DECORATIVE_IMAGES[].src` và mảng `images` của từng dự án. Ba ảnh lần lượt nằm ở trái trên, trái dưới và bên phải.
- **Ảnh động và video:** `MARQUEE_IMAGES` trong `src/data/content.ts` chứa 21 link GIF; 11 ảnh đầu ở hàng một, 10 ảnh còn lại ở hàng hai. Mẫu này không có tệp video hay trình phát video.
- **Dùng ảnh của bạn:** tạo thư mục `src/assets/`, cho ảnh vào rồi import trong `src/data/content.ts`, ví dụ `import portrait from "../assets/portrait.png"`. Dùng `portrait` thay cho link ảnh để trang vẫn chạy khi đặt trong thư mục con.
- **Phông chữ, màu và nền chuyển màu:** sửa `src/index.css`. Màu và phông chữ của Tailwind nằm trong `tailwind.config.cjs`. Bố cục từng phần nằm trong `src/sections/`; nút và hiệu ứng dùng chung nằm trong `src/components/`.
- **Tiêu đề tab và mô tả trang:** sửa thẻ `<title>` và thẻ `<meta>` có `name="description"` trong `index.html`.

Ảnh và GIF vẫn dùng link gốc từ bên ngoài. Trước khi đăng hoặc bán, hãy kiểm tra link còn hoạt động và bạn có quyền dùng các ảnh đó. Có mã nguồn không đồng nghĩa với việc có bản quyền ảnh.

Lưu ý: khi kiểm tra, GIF cuối `hero-celestia-preview-0yO3jXO8.gif` trả về lỗi 404. Mẫu vẫn giữ nguyên link trong mục cuối của `MARQUEE_IMAGES`. Bạn có thể thay mục này bằng ảnh động của mình.

## Đưa lên mạng

```sh
npm run build
npm run preview
```

Tải **mọi tệp bên trong `dist/`** lên nơi lưu trang tĩnh như Netlify, Cloudflare Pages hoặc GitHub Pages. Nếu kết nối qua Git, chọn lệnh build là `npm run build`, thư mục kết quả là `dist`.

Vite đã đặt `base: "./"`, nên bản build chạy được ở trang gốc hoặc đường dẫn như `/demo/jack/`. Giữ nguyên các đường dẫn tệp trong bản build. Không cần biến môi trường hay máy chủ riêng.

Bản build cũng chạy trong iframe sandbox được phép chạy script, không cần quyền same-origin hay cấu hình CORS riêng. `vite.config.ts` đã gói mã thành script thường để làm việc này; hãy giữ phần plugin dành cho sandbox. Việc mở email hoặc tab mới còn tùy quyền mà trang nhúng cho phép.

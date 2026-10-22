# Mainframe

Mẫu trang giới thiệu agency gói gọn trong một màn hình, dùng React, TypeScript, Vite và Tailwind CSS 3. Có video tua theo chuột, lời chào hiện từng chữ, menu trên điện thoại và nút sao chép email. Không cần máy chủ xử lý dữ liệu, cookie hay bộ nhớ trình duyệt.

## Chạy trên máy

Cài **Node.js từ 20.19 trở lên** (nên chọn bản LTS mới). Giải nén, mở terminal ngay trong thư mục này rồi chạy:

```sh
npm install
npm run dev
```

Mở địa chỉ được in trong terminal. Muốn xem thử bản dùng để đưa lên mạng:

```sh
npm run build
npm run preview
```

## Sửa ở đâu?

- **Chữ và đường dẫn:** mở `src/content.ts`, sửa `BRAND`, `INTRO_LINES`, `GREETING`, `EMAIL`, `NAV_LINKS`, `CONTACT_LINK` và `ACTION_LINKS`. Yêu cầu gốc không ghi địa chỉ cho các mục menu và nút trắng, nên chúng đang mở email hỏi thông tin. Thay các giá trị `href` bằng đường dẫn của bạn trước khi đăng.
- **Video:** sửa `VIDEO_URL` trong `src/content.ts`. Đường dẫn gốc vẫn được thử trước. Vì video gốc dùng HEVC, trình duyệt không đọc được định dạng này sẽ dùng bản H.264 cùng nội dung ở `src/assets/mainframe-h264.mp4`, qua `VIDEO_FALLBACK_URL`. Khi đổi video, nhớ đổi cả hai nguồn. Nếu dùng tệp của mình, thêm `src/assets/background.mp4`, rồi đặt các URL thành `new URL('./assets/background.mp4', import.meta.url).href`. Mẫu này không dùng ảnh.
- **Phông chữ:** sửa hai đường dẫn stylesheet trong `index.html` và tên phông tương ứng ở đầu `src/index.css`.
- **Bố cục và màu:** sửa các lớp Tailwind trong `src/components/Navbar.tsx`, `Hero.tsx` và `ActionPills.tsx`. Độ mờ, cỡ chữ và hiệu ứng nằm trong `src/index.css`.
- **Thời gian hiệu ứng:** `src/hooks/useTypewriter.ts` đặt tốc độ 38 ms và độ trễ 600 ms; `src/components/ActionPills.tsx` đặt thời gian hiện nút 400 ms; `src/hooks/useMouseScrub.ts` đặt độ nhạy chuột `0.8`.

Cần có mạng để tải video gốc và phông chữ; bản video tương thích đã có trong mẫu. Hãy kiểm tra quyền sử dụng và nơi lưu các tệp này trước khi bán hoặc đăng bản của bạn. Trên thiết bị chỉ có cảm ứng, video đứng yên theo yêu cầu gốc. Nếu trình duyệt chặn sao chép, trang sẽ thử cách khác hoặc chọn sẵn email để bạn tự sao chép. Nếu nhúng bằng iframe có sandbox và không có `allow-same-origin`, nơi lưu trang cần bật CORS cho mã JavaScript, CSS và video.

## Đưa lên mạng

Chạy `npm run build`, rồi tải **toàn bộ nội dung trong `dist/`** lên dịch vụ lưu web tĩnh như Netlify, Cloudflare Pages, GitHub Pages hoặc máy chủ của bạn. Nếu dịch vụ tự tạo bản phát hành, đặt lệnh là `npm run build` và thư mục kết quả là `dist`. Thiết lập `base: './'` trong `vite.config.ts` giúp trang chạy cả ở địa chỉ gốc lẫn thư mục con như `/demo/mainframe/`; nhớ dấu `/` cuối. Không cần cấu hình chuyển hướng cho ứng dụng hay viết mã máy chủ. Nên dùng HTTPS để sao chép email. Không mở trực tiếp tệp HTML đã tạo bằng `file://`.

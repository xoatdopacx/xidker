// Built-in translations of the package text, keyed by package key. `source` is the English
// text each entry was translated from: when the admin changes a package's English text, these
// translations are skipped until they are refreshed, and those languages show the English text.
export type PackageText = { name: string; tagline: string | null; features: string[] };

export const PACKAGE_TRANSLATIONS: Record<
  string,
  { source: PackageText; text: Partial<Record<string, PackageText>> }
> = {
  "personal": {
    "source": {
      "name": "Personal Source",
      "tagline": "The complete portfolio source code. Set it up yourself with our guide.",
      "features": [
        "Complete source code, yours to edit",
        "Looks great on phones and desktops",
        "Motion effects built in",
        "Edit your name, projects and photos in a single file",
        "README guide to put your portfolio online, step by step",
        "Builds 1 portfolio"
      ]
    },
    "text": {
      "ja": {
        "name": "個人用ソース",
        "tagline": "完全なポートフォリオのソースコード。ガイドに従ってご自身でセットアップ可能です。",
        "features": [
          "編集可能な完全なソースコード",
          "スマホでもPCでも美しく表示",
          "アニメーションエフェクト組み込み済み",
          "名前、プロジェクト、写真を1つのファイルで編集可能",
          "ポートフォリオ公開までをステップごとに説明したREADMEガイド",
          "ポートフォリオ1件分"
        ]
      },
      "zh-CN": {
        "name": "个人版源码",
        "tagline": "完整的作品集源码。按照我们的指南自己设置即可。",
        "features": [
          "完整的源码，可自由修改",
          "在手机和电脑上显示都很出色",
          "内置动态效果",
          "在单个文件中修改您的名字、项目和照片",
          "README 指南，一步步教您把作品集上线",
          "可制作 1 个作品集"
        ]
      },
      "zh-TW": {
        "name": "個人原始碼",
        "tagline": "完整的作品集原始碼。根據我們的指南自行設定。",
        "features": [
          "完整原始碼，可自由編輯",
          "手機與桌機皆美觀",
          "內建動態效果",
          "在單一檔案中修改名字、專案與照片",
          "README 指南，一步步教你把作品集上線",
          "可製作 1 個作品集"
        ]
      },
      "ko": {
        "name": "개인용 소스",
        "tagline": "완벽한 포트폴리오 소스 코드. 가이드를 보고 직접 설치하세요.",
        "features": [
          "전체 소스 코드, 자유로운 수정 가능",
          "휴대폰과 데스크톱 모두에서 완벽하게 표시",
          "모션 효과 내장",
          "하나의 파일에서 이름, 프로젝트, 사진 수정",
          "포트폴리오 온라인 게시까지 단계별로 안내하는 README 가이드",
          "포트폴리오 1개 제작"
        ]
      },
      "th": {
        "name": "ซอร์สโค้ดส่วนตัว",
        "tagline": "ซอร์สโค้ดพอร์ตโฟลิโอฉบับสมบูรณ์ ติดตั้งเองได้ด้วยคู่มือของเรา",
        "features": [
          "ซอร์สโค้ดครบถ้วน แก้ไขได้เองทั้งหมด",
          "สวยงามทั้งบนมือถือและคอมพิวเตอร์",
          "มีเอฟเฟกต์การเคลื่อนไหวในตัว",
          "แก้ไขชื่อ โปรเจกต์ และรูปภาพได้ในไฟล์เดียว",
          "คู่มือ README ทีละขั้นตอนเพื่อนำพอร์ตโฟลิโอขึ้นออนไลน์",
          "ใช้ทำพอร์ตโฟลิโอได้ 1 ชิ้น"
        ]
      },
      "id": {
        "name": "Kode Sumber Pribadi",
        "tagline": "Kode sumber portofolio lengkap. Atur sendiri dengan panduan kami.",
        "features": [
          "Kode sumber lengkap, milik Anda untuk diedit",
          "Tampilan hebat di ponsel dan desktop",
          "Efek gerak bawaan",
          "Edit nama, proyek, dan foto Anda dalam satu file",
          "Panduan README langkah demi langkah untuk menaruh portofolio online",
          "Untuk 1 portofolio"
        ]
      },
      "ms": {
        "name": "Kod Sumber Peribadi",
        "tagline": "Kod sumber portfolio lengkap. Sediakan sendiri dengan panduan kami.",
        "features": [
          "Kod sumber lengkap, milik anda untuk disunting",
          "Tampak hebat pada telefon dan komputer",
          "Kesan gerakan terbina dalam",
          "Sunting nama, projek dan foto anda dalam satu fail",
          "Panduan README langkah demi langkah untuk meletakkan portfolio dalam talian",
          "Untuk 1 portfolio"
        ]
      },
      "fil": {
        "name": "Personal na Source Code",
        "tagline": "Ang kumpletong portfolio source code. I-set up ito nang mag-isa gamit ang aming gabay.",
        "features": [
          "Kumpletong source code, ikaw ang mag-e-edit",
          "Maganda sa phones at desktops",
          "May built-in motion effects",
          "I-edit ang pangalan, projects, at photos sa isang file lang",
          "README guide para mailagay online ang portfolio mo, step by step",
          "Para sa 1 portfolio"
        ]
      },
      "km": {
        "name": "កូដប្រភពផ្ទាល់ខ្លួន",
        "tagline": "កូដប្រភពផលប័ត្រពេញលេញ។ រៀបចំវាដោយខ្លួនឯងជាមួយនឹងមគ្គុទ្ទេសក៍របស់យើង",
        "features": [
          "កូដប្រភពពេញលេញ អ្នកអាចកែសម្រួលបាន",
          "មើលទៅល្អឥតខ្ចោះនៅលើទូរស័ព្ទ និងកុំព្យូទ័រ",
          "មានបែបផែនចលនាស្រាប់",
          "កែសម្រួលឈ្មោះ គម្រោង និងរូបថតក្នុងឯកសារតែមួយ",
          "មគ្គុទ្ទេសក៍ README ជាជំហានៗ ដើម្បីដាក់ផលប័ត្ររបស់អ្នកនៅលើអ៊ីនធឺណិត",
          "សម្រាប់ផលប័ត្រ 1"
        ]
      },
      "lo": {
        "name": "ລະຫັດແຫຼ່ງສ່ວນຕົວ",
        "tagline": "ລະຫັດແຫຼ່ງ Portfolio ເຕັມຮູບແບບ. ຕັ້ງຄ່າດ້ວຍຕົວເອງຕາມຄຳແນະນຳຂອງເຮົາ.",
        "features": [
          "ລະຫັດແຫຼ່ງເຕັມ ທ່ານສາມາດແກ້ໄຂໄດ້",
          "ສະແດງຜົນດີທັງໃນມືຖື ແລະ ຄອມພິວເຕີ",
          "ມີເອຟເຟັກການເຄື່ອນໄຫວໃນຕົວ",
          "ແກ້ໄຂຊື່, ຜົນງານ ແລະ ຮູບພາບໃນໄຟລ໌ດຽວ",
          "ຄູ່ມື README ເປັນຂັ້ນຕອນເພື່ອອອນລາຍ Portfolio",
          "ສຳລັບ 1 Portfolio"
        ]
      },
      "hi": {
        "name": "पर्सनल सोर्स",
        "tagline": "पूरा पोर्टफोलियो सोर्स कोड। हमारे गाइड के साथ इसे खुद सेट करें।",
        "features": [
          "पूरा सोर्स कोड, जिसे आप एडिट कर सकते हैं",
          "फोन और डेस्कटॉप पर बेहतरीन दिखता है",
          "मोशन इफेक्ट्स पहले से बने हैं",
          "अपना नाम, प्रोजेक्ट्स और फोटो एक फाइल में एडिट करें",
          "पोर्टफोलियो ऑनलाइन डालने के लिए स्टेप-बाय-स्टेप README गाइड",
          "1 पोर्टफोलियो के लिए"
        ]
      },
      "bn": {
        "name": "পার্সোনাল সোর্স",
        "tagline": "সম্পূর্ণ পোর্টফোলিও সোর্স কোড। আমাদের গাইড দেখে নিজেই সেটআপ করুন।",
        "features": [
          "সম্পূর্ণ সোর্স কোড, আপনার এডিট করার জন্য",
          "ফোন এবং ডেস্কটপে দারুণ দেখায়",
          "বিল্ট-ইন মোশন ইফেক্ট",
          "একটি ফাইলে নাম, প্রজেক্ট এবং ছবি এডিট করুন",
          "পোর্টফোলিও অনলাইনে দেওয়ার স্টেপ-বাই-স্টেপ README গাইড",
          "১টি পোর্টফোলিওর জন্য"
        ]
      },
      "ar": {
        "name": "الكود الشخصي",
        "tagline": "الكود المصدري الكامل لمعرض الأعمال. قم بإعداده بنفسك عبر دليلنا.",
        "features": [
          "الكود المصدري الكامل، ملكك للتعديل",
          "يبدو رائعاً على الهواتف والحواسيب",
          "تأثيرات حركة مدمجة",
          "عدل اسمك ومشاريعك وصورك في ملف واحد",
          "دليل README خطوة بخطوة لنشر معرض أعمالك",
          "لمعرض أعمال واحد"
        ]
      },
      "fa": {
        "name": "سورس شخصی",
        "tagline": "سورس‌کد کامل نمونه‌کار. با راهنمای ما خودتان آن را راه‌اندازی کنید.",
        "features": [
          "سورس‌کد کامل، برای ویرایش توسط شما",
          "نمایش عالی روی گوشی‌ها و دسکتاپ‌ها",
          "افکت‌های حرکتی داخلی",
          "نام، پروژه‌ها و عکس‌های خود را در یک فایل واحد ویرایش کنید",
          "راهنمای گام‌به‌گام README برای آنلاین کردن نمونه‌کار",
          "برای ۱ نمونه‌کار"
        ]
      },
      "he": {
        "name": "קוד מקור אישי",
        "tagline": "קוד המקור המלא לפורטפוליו. הגדירו אותו בעצמכם בעזרת המדריך שלנו.",
        "features": [
          "קוד מקור מלא, לעריכה חופשית",
          "נראה מעולה בטלפונים ובמחשבים",
          "אפקטי תנועה מובנים",
          "עריכת שם, פרויקטים ותמונות בקובץ אחד",
          "מדריך README שלב-אחר-שלב להעלאת הפורטפוליו לרשת",
          "לפורטפוליו אחד"
        ]
      },
      "ur": {
        "name": "پرسنل سورس",
        "tagline": "مکمل پورٹ فولیو سورس کوڈ۔ ہماری گائیڈ کے ساتھ خود سیٹ اپ کریں۔",
        "features": [
          "مکمل سورس کوڈ، جسے آپ ایڈٹ کر سکتے ہیں",
          "فون اور ڈیسک ٹاپ پر بہترین نظر آتا ہے",
          "موشن ایفیکٹس شامل ہیں",
          "اپنا نام، پروجیکٹس اور تصاویر ایک فائل میں بدلیں",
          "پورٹ فولیو آن لائن کرنے کے لیے سٹیپ بائی سٹیپ README گائیڈ",
          "1 پورٹ فولیو کے لیے"
        ]
      },
      "tr": {
        "name": "Kişisel Kaynak Kod",
        "tagline": "Eksiksiz portfolyo kaynak kodu. Kılavuzumuzla kendiniz kurun.",
        "features": [
          "Tam kaynak kodu, dilediğiniz gibi düzenleyin",
          "Telefon ve bilgisayarlarda harika görünüm",
          "Dahili hareket efektleri",
          "Adınızı, projelerinizi ve fotoğraflarınızı tek dosyada düzenleyin",
          "Portfolyonuzu yayına almak için adım adım README kılavuzu",
          "1 portfolyo için"
        ]
      },
      "ru": {
        "name": "Личный исходный код",
        "tagline": "Полный исходный код портфолио. Настройте сами по нашей инструкции.",
        "features": [
          "Весь исходный код, можно менять всё",
          "Отлично выглядит на телефонах и ПК",
          "Встроенные анимации",
          "Меняйте имя, проекты и фото в одном файле",
          "Пошаговая инструкция README по запуску портфолио",
          "Для 1 портфолио"
        ]
      },
      "uk": {
        "name": "Особистий код",
        "tagline": "Повний код портфоліо. Налаштуйте все самостійно за нашою інструкцією.",
        "features": [
          "Весь вихідний код, повний доступ до редагування",
          "Чудовий вигляд на телефонах і ПК",
          "Вбудовані анімаційні ефекти",
          "Редагуйте ім'я, проекти та фото в одному файлі",
          "Покрокова інструкція README для запуску портфоліо",
          "Для 1 портфоліо"
        ]
      },
      "pl": {
        "name": "Kod osobisty",
        "tagline": "Pełny kod źródłowy portfolio. Skonfiguruj sam za pomocą naszego poradnika.",
        "features": [
          "Kompletny kod źródłowy, do pełnej edycji",
          "Wygląda świetnie na telefonach i komputerach",
          "Wbudowane efekty ruchu",
          "Edytuj imię, projekty i zdjęcia w jednym pliku",
          "Poradnik README krok po kroku, jak wystawić portfolio online",
          "Na 1 portfolio"
        ]
      },
      "cs": {
        "name": "Osobní zdrojový kód",
        "tagline": "Kompletní zdrojový kód portfolia. Nastavte si ho sami podle našeho návodu.",
        "features": [
          "Kompletní zdrojový kód, který si upravíte",
          "Vypadá skvěle na telefonech i počítačích",
          "Integrované pohybové efekty",
          "Jméno, projekty a fotky změníte v jednom souboru",
          "Návod README krok za krokem, jak dát portfolio online",
          "Pro 1 portfolio"
        ]
      },
      "de": {
        "name": "Persönlicher Quellcode",
        "tagline": "Der vollständige Portfolio-Quellcode. Richte ihn selbst mit unserem Guide ein.",
        "features": [
          "Vollständiger Quellcode zur freien Bearbeitung",
          "Sieht auf Handys und Desktops toll aus",
          "Integrierte Bewegungseffekte",
          "Ändere Name, Projekte und Fotos in einer einzigen Datei",
          "README-Anleitung, um dein Portfolio Schritt für Schritt online zu bringen",
          "Für 1 Portfolio"
        ]
      },
      "fr": {
        "name": "Code source personnel",
        "tagline": "Le code source complet du portfolio. Installez-le vous-même avec notre guide.",
        "features": [
          "Code source complet, à vous de modifier",
          "S'affiche parfaitement sur mobile et bureau",
          "Effets de mouvement intégrés",
          "Modifiez votre nom, vos projets et photos dans un seul fichier",
          "Guide README étape par étape pour mettre votre portfolio en ligne",
          "Pour 1 portfolio"
        ]
      },
      "es": {
        "name": "Código personal",
        "tagline": "El código fuente completo del portafolio. Configúralo tú mismo con nuestra guía.",
        "features": [
          "Código fuente completo, tuyo para editar",
          "Se ve excelente en teléfonos y computadoras",
          "Efectos de movimiento incluidos",
          "Edita tu nombre, proyectos y fotos en un solo archivo",
          "Guía README paso a paso para poner tu portafolio en línea",
          "Para 1 portafolio"
        ]
      },
      "pt": {
        "name": "Código Pessoal",
        "tagline": "O código-fonte completo do portfólio. Configure você mesmo com nosso guia.",
        "features": [
          "Código-fonte completo, pronto para editar",
          "Fica ótimo em celulares e computadores",
          "Efeitos de movimento incluídos",
          "Edite nome, projetos e fotos em um arquivo só",
          "Guia README passo a passo para publicar seu portfólio",
          "Para 1 portfólio"
        ]
      },
      "it": {
        "name": "Codice sorgente personale",
        "tagline": "Il codice sorgente completo del portfolio. Configuralo tu stesso con la nostra guida.",
        "features": [
          "Codice sorgente completo, pronto per essere modificato",
          "Ottimo su telefoni e desktop",
          "Effetti di movimento inclusi",
          "Modifica nome, progetti e foto in un unico file",
          "Guida README passo dopo passo per pubblicare il tuo portfolio",
          "Per 1 portfolio"
        ]
      },
      "nl": {
        "name": "Persoonlijke Broncode",
        "tagline": "De complete broncode voor je portfolio. Installeer het zelf met onze handleiding.",
        "features": [
          "Volledige broncode, vrij te bewerken",
          "Ziet er top uit op mobiel en desktop",
          "Ingebouwde animatie-effecten",
          "Naam, projecten en foto's bewerken in één bestand",
          "README-handleiding om je portfolio stap voor stap online te zetten",
          "Voor 1 portfolio"
        ]
      },
      "sv": {
        "name": "Personlig källkod",
        "tagline": "Den kompletta portföljens källkod. Sätt upp den själv med vår guide.",
        "features": [
          "Komplett källkod, din att redigera",
          "Ser bra ut på mobiler och datorer",
          "Rörelseeffekter inbyggda",
          "Redigera ditt namn, projekt och foton i en enda fil",
          "README-guide för att få din portfölj online steg för steg",
          "För 1 portfölj"
        ]
      },
      "el": {
        "name": "Προσωπικός Πηγαίος Κώδικας",
        "tagline": "Ο πλήρης πηγαίος κώδικας για το portfolio σας. Στήστε το μόνοι σας με τον οδηγό μας.",
        "features": [
          "Πλήρης πηγαίος κώδικας, δικός σας για επεξεργασία",
          "Φαίνεται τέλεια σε κινητά και desktop",
          "Ενσωματωμένα εφέ κίνησης",
          "Αλλάξτε όνομα, έργα και φωτογραφίες σε ένα αρχείο",
          "Οδηγός README βήμα-βήμα για να βάλετε το portfolio online",
          "Για 1 portfolio"
        ]
      },
      "ro": {
        "name": "Cod Sursă Personal",
        "tagline": "Codul sursă complet al portofoliului. Configurează-l singur urmând ghidul nostru.",
        "features": [
          "Cod sursă complet, gata de editat",
          "Arată excelent pe telefoane și computere",
          "Efecte de mișcare incluse",
          "Editare nume, proiecte și fotografii dintr-un singur fișier",
          "Ghid README pas cu pas pentru a pune portofoliul online",
          "Pentru 1 portofoliu"
        ]
      },
      "hu": {
        "name": "Személyes forráskód",
        "tagline": "A teljes portfólió forráskód. Állítsd be magad a útmutatónkkal.",
        "features": [
          "Teljes forráskód, szerkeszthető",
          "Remekül néz ki telefonon és asztali gépen is",
          "Beépített mozgási effektek",
          "Szerkeszd a nevedet, projektjeidet és fotóidat egyetlen fájlban",
          "Lépésről lépésre README-útmutató a portfólió közzétételéhez",
          "1 portfólióhoz"
        ]
      }
    }
  },
  "setup": {
    "source": {
      "name": "Custom Build",
      "tagline": "Send us your requirements and we build the portfolio for you.",
      "features": [
        "Everything in Personal Source",
        "Send requirements as Word, README or PDF with images, sketches welcome",
        "Your portfolio built to match your requirements",
        "1 round of revisions",
        "30 days of support"
      ]
    },
    "text": {
      "ja": {
        "name": "オーダーメイド制作",
        "tagline": "ご要望を送るだけで、ポートフォリオを制作します。",
        "features": [
          "個人用ソースの全内容",
          "要望はWord・README・画像付きPDFで送信（ラフスケッチ歓迎）",
          "ご要望どおりにポートフォリオを制作",
          "修正1回",
          "30日間のサポート"
        ]
      },
      "zh-CN": {
        "name": "按需定制",
        "tagline": "把您的需求发给我们，我们为您制作作品集。",
        "features": [
          "个人版源码的所有内容",
          "用 Word、README 或带图片的 PDF 提交需求，欢迎附上草图",
          "按您的需求制作作品集",
          "1 次修改",
          "30 天支持"
        ]
      },
      "zh-TW": {
        "name": "客製化製作",
        "tagline": "把你的需求寄給我們，我們幫你製作作品集。",
        "features": [
          "包含個人原始碼方案的所有內容",
          "以 Word、README 或附圖的 PDF 提供需求，歡迎附上草圖",
          "依照你的需求製作作品集",
          "修改 1 次",
          "30 天支援"
        ]
      },
      "ko": {
        "name": "맞춤 제작",
        "tagline": "요청 사항을 보내 주시면 포트폴리오를 만들어 드립니다.",
        "features": [
          "개인용 소스 모든 기능 포함",
          "Word, README 또는 이미지가 포함된 PDF로 요청 사항 전달 (스케치 환영)",
          "요청 사항에 맞춘 포트폴리오 제작",
          "수정 1회",
          "30일간 지원"
        ]
      },
      "th": {
        "name": "สร้างตามสั่ง",
        "tagline": "ส่งความต้องการมา แล้วเราจะสร้างพอร์ตโฟลิโอให้คุณ",
        "features": [
          "ทุกอย่างที่มีในแพ็กเกจส่วนตัว",
          "ส่งความต้องการเป็นไฟล์ Word, README หรือ PDF พร้อมรูป มีภาพร่างยิ่งดี",
          "สร้างพอร์ตโฟลิโอตามความต้องการของคุณ",
          "แก้ไขได้ 1 ครั้ง",
          "ดูแลช่วยเหลือ 30 วัน"
        ]
      },
      "id": {
        "name": "Buat Sesuai Permintaan",
        "tagline": "Kirim kebutuhan Anda, kami buatkan portofolionya untuk Anda.",
        "features": [
          "Semua yang ada di Kode Sumber Pribadi",
          "Kirim kebutuhan dalam Word, README, atau PDF bergambar, sketsa juga boleh",
          "Portofolio dibuat sesuai kebutuhan Anda",
          "1 kali revisi",
          "Dukungan 30 hari"
        ]
      },
      "ms": {
        "name": "Bina Ikut Permintaan",
        "tagline": "Hantar keperluan anda dan kami bina portfolio untuk anda.",
        "features": [
          "Segala yang ada dalam Kod Sumber Peribadi",
          "Hantar keperluan dalam Word, README atau PDF bergambar, lakaran dialu-alukan",
          "Portfolio dibina mengikut keperluan anda",
          "1 pusingan pindaan",
          "Sokongan 30 hari"
        ]
      },
      "fil": {
        "name": "Custom Build",
        "tagline": "Ipadala ang requirements mo at gagawin namin ang portfolio para sa iyo.",
        "features": [
          "Lahat ng nasa Personal na Source Code",
          "Ipadala ang requirements bilang Word, README o PDF na may larawan, puwede rin ang sketch",
          "Gagawin ang portfolio ayon sa requirements mo",
          "1 beses na revision",
          "30 araw ng support"
        ]
      },
      "km": {
        "name": "បង្កើតតាមតម្រូវការ",
        "tagline": "ផ្ញើតម្រូវការរបស់អ្នកមក យើងនឹងបង្កើតផលប័ត្រជូនអ្នក។",
        "features": [
          "អ្វីគ្រប់យ៉ាងនៅក្នុងកូដប្រភពផ្ទាល់ខ្លួន",
          "ផ្ញើតម្រូវការជា Word, README ឬ PDF មានរូបភាព អាចភ្ជាប់គំនូរព្រាងបាន",
          "បង្កើតផលប័ត្រតាមតម្រូវការរបស់អ្នក",
          "កែប្រែ 1 ដង",
          "ការគាំទ្ររយៈពេល 30 ថ្ងៃ"
        ]
      },
      "lo": {
        "name": "ສ້າງຕາມຄວາມຕ້ອງການ",
        "tagline": "ສົ່ງຄວາມຕ້ອງການຂອງທ່ານມາ ແລ້ວພວກເຮົາຈະສ້າງ Portfolio ໃຫ້.",
        "features": [
          "ທຸກຢ່າງໃນລະຫັດສ່ວນຕົວ",
          "ສົ່ງຄວາມຕ້ອງການເປັນ Word, README ຫຼື PDF ພ້ອມຮູບ ມີພາບຮ່າງຍິ່ງດີ",
          "ສ້າງ Portfolio ຕາມຄວາມຕ້ອງການຂອງທ່ານ",
          "ແກ້ໄຂ 1 ຄັ້ງ",
          "ຊ່ວຍເຫຼືອ 30 ວັນ"
        ]
      },
      "hi": {
        "name": "कस्टम बिल्ड",
        "tagline": "अपनी ज़रूरतें भेजें, हम आपके लिए पोर्टफोलियो बनाएंगे।",
        "features": [
          "पर्सनल सोर्स में सब कुछ",
          "ज़रूरतें Word, README या तस्वीरों वाली PDF में भेजें, स्केच भी चलेंगे",
          "आपकी ज़रूरतों के मुताबिक बना पोर्टफोलियो",
          "1 बार बदलाव",
          "30 दिनों का सपोर्ट"
        ]
      },
      "bn": {
        "name": "কাস্টম বিল্ড",
        "tagline": "আপনার চাহিদা পাঠান, আমরা আপনার জন্য পোর্টফোলিও বানিয়ে দেব।",
        "features": [
          "পার্সোনাল সোর্সের সব সুবিধা",
          "চাহিদা পাঠান Word, README বা ছবিসহ PDF-এ, স্কেচ দিলে আরও ভালো",
          "আপনার চাহিদা অনুযায়ী তৈরি পোর্টফোলিও",
          "১ বার সংশোধন",
          "৩০ দিনের সাপোর্ট"
        ]
      },
      "ar": {
        "name": "تصميم حسب الطلب",
        "tagline": "أرسل لنا متطلباتك ونبني لك معرض أعمالك.",
        "features": [
          "كل ما في باقة الكود الشخصي",
          "أرسل متطلباتك بصيغة Word أو README أو PDF مع صور، والرسومات الأولية مرحب بها",
          "معرض أعمال مبني وفق متطلباتك",
          "جولة تعديل واحدة",
          "دعم لمدة 30 يوماً"
        ]
      },
      "fa": {
        "name": "ساخت سفارشی",
        "tagline": "نیازهایتان را بفرستید تا نمونه‌کارتان را برایتان بسازیم.",
        "features": [
          "همه چیز در سورس شخصی",
          "نیازها را با Word، README یا PDF همراه تصویر بفرستید؛ طرح اولیه هم خوب است",
          "ساخت نمونه‌کار مطابق نیازهای شما",
          "۱ بار اصلاح",
          "۳۰ روز پشتیبانی"
        ]
      },
      "he": {
        "name": "בנייה לפי דרישה",
        "tagline": "שלחו לנו את הדרישות ואנחנו נבנה לכם את הפורטפוליו.",
        "features": [
          "כל מה שיש בקוד האישי",
          "שליחת דרישות בקובץ Word, README או PDF עם תמונות, אפשר לצרף סקיצות",
          "פורטפוליו שנבנה לפי הדרישות שלכם",
          "סבב תיקונים אחד",
          "30 ימי תמיכה"
        ]
      },
      "ur": {
        "name": "کسٹم بلڈ",
        "tagline": "اپنی ضروریات بھیجیں، ہم آپ کے لیے پورٹ فولیو بنائیں گے۔",
        "features": [
          "پرسنل سورس کی تمام چیزیں",
          "ضروریات Word، README یا تصاویر والی PDF میں بھیجیں، خاکے بھی خوش آمدید",
          "آپ کی ضروریات کے مطابق بنا پورٹ فولیو",
          "1 بار ترمیم",
          "30 دن کی سپورٹ"
        ]
      },
      "tr": {
        "name": "İsteğe Özel Yapım",
        "tagline": "İsteklerinizi gönderin, portfolyonuzu sizin için yapalım.",
        "features": [
          "Kişisel Kaynak Kod paketindeki her şey",
          "İsteklerinizi Word, README veya görselli PDF olarak gönderin, eskizler de olur",
          "İsteklerinize göre hazırlanan portfolyo",
          "1 revizyon",
          "30 gün destek"
        ]
      },
      "ru": {
        "name": "Сборка под заказ",
        "tagline": "Пришлите требования, и мы соберём портфолио за вас.",
        "features": [
          "Всё из пакета Личный",
          "Требования в Word, README или PDF с картинками, наброски приветствуются",
          "Портфолио, собранное по вашим требованиям",
          "1 раунд правок",
          "30 дней поддержки"
        ]
      },
      "uk": {
        "name": "Розробка на замовлення",
        "tagline": "Надішліть вимоги, і ми зробимо портфоліо за вас.",
        "features": [
          "Все, що в Особистому коді",
          "Вимоги у Word, README або PDF із зображеннями, ескізи вітаються",
          "Портфоліо, зроблене за вашими вимогами",
          "1 раунд правок",
          "30 днів підтримки"
        ]
      },
      "pl": {
        "name": "Wykonanie na zamówienie",
        "tagline": "Wyślij nam swoje wymagania, a zbudujemy portfolio za Ciebie.",
        "features": [
          "Wszystko z kodu osobistego",
          "Wymagania w Word, README lub PDF ze zdjęciami, szkice mile widziane",
          "Portfolio zbudowane według Twoich wymagań",
          "1 runda poprawek",
          "30 dni wsparcia"
        ]
      },
      "cs": {
        "name": "Výroba na míru",
        "tagline": "Pošlete nám své požadavky a portfolio vytvoříme za vás.",
        "features": [
          "Vše z balíčku Osobní zdrojový kód",
          "Požadavky ve Wordu, README nebo PDF s obrázky, skici vítány",
          "Portfolio vytvořené podle vašich požadavků",
          "1 kolo úprav",
          "30 dní podpory"
        ]
      },
      "de": {
        "name": "Individuelle Umsetzung",
        "tagline": "Schick uns deine Anforderungen, wir bauen das Portfolio für dich.",
        "features": [
          "Alles aus dem persönlichen Quellcode",
          "Anforderungen als Word, README oder PDF mit Bildern, Skizzen willkommen",
          "Dein Portfolio, gebaut nach deinen Anforderungen",
          "1 Korrekturrunde",
          "30 Tage Support"
        ]
      },
      "fr": {
        "name": "Sur mesure",
        "tagline": "Envoyez-nous vos besoins et nous créons le portfolio pour vous.",
        "features": [
          "Tout ce qui est dans le code source personnel",
          "Besoins en Word, README ou PDF avec images, croquis bienvenus",
          "Votre portfolio réalisé selon vos besoins",
          "1 série de retouches",
          "30 jours de support"
        ]
      },
      "es": {
        "name": "A medida",
        "tagline": "Envíanos tus requisitos y creamos el portafolio por ti.",
        "features": [
          "Todo lo del código personal",
          "Requisitos en Word, README o PDF con imágenes, se aceptan bocetos",
          "Tu portafolio hecho según tus requisitos",
          "1 ronda de cambios",
          "30 días de soporte"
        ]
      },
      "pt": {
        "name": "Sob Medida",
        "tagline": "Envie seus requisitos e nós criamos o portfólio para você.",
        "features": [
          "Tudo do Código Pessoal",
          "Requisitos em Word, README ou PDF com imagens, rascunhos são bem-vindos",
          "Seu portfólio feito de acordo com seus requisitos",
          "1 rodada de ajustes",
          "30 dias de suporte"
        ]
      },
      "it": {
        "name": "Su misura",
        "tagline": "Inviaci le tue richieste e creiamo il portfolio per te.",
        "features": [
          "Tutto quello del pacchetto Codice sorgente personale",
          "Richieste in Word, README o PDF con immagini, schizzi benvenuti",
          "Il tuo portfolio realizzato secondo le tue richieste",
          "1 giro di modifiche",
          "30 giorni di assistenza"
        ]
      },
      "nl": {
        "name": "Op maat gebouwd",
        "tagline": "Stuur ons je wensen en wij bouwen het portfolio voor je.",
        "features": [
          "Alles in Persoonlijke Broncode",
          "Wensen in Word, README of pdf met afbeeldingen, schetsen welkom",
          "Je portfolio gebouwd volgens je wensen",
          "1 correctieronde",
          "30 dagen support"
        ]
      },
      "sv": {
        "name": "Skräddarsydd",
        "tagline": "Skicka dina önskemål så bygger vi portföljen åt dig.",
        "features": [
          "Allt i Personlig källkod",
          "Önskemål i Word, README eller PDF med bilder, skisser välkomna",
          "Din portfölj byggd efter dina önskemål",
          "1 omgång ändringar",
          "30 dagars support"
        ]
      },
      "el": {
        "name": "Κατασκευή κατά παραγγελία",
        "tagline": "Στείλτε μας τις απαιτήσεις σας και φτιάχνουμε το portfolio για εσάς.",
        "features": [
          "Όλα όσα περιλαμβάνει ο Προσωπικός Πηγαίος Κώδικας",
          "Απαιτήσεις σε Word, README ή PDF με εικόνες, ευπρόσδεκτα τα σκίτσα",
          "Portfolio φτιαγμένο σύμφωνα με τις απαιτήσεις σας",
          "1 γύρος διορθώσεων",
          "30 ημέρες υποστήριξης"
        ]
      },
      "ro": {
        "name": "La comandă",
        "tagline": "Trimite-ne cerințele tale și construim portofoliul pentru tine.",
        "features": [
          "Tot ce este în Cod Sursă Personal",
          "Cerințe în Word, README sau PDF cu imagini, schițele sunt binevenite",
          "Portofoliul tău construit după cerințele tale",
          "1 rundă de modificări",
          "30 de zile de asistență"
        ]
      },
      "hu": {
        "name": "Egyedi kivitelezés",
        "tagline": "Küldd el az igényeidet, és mi elkészítjük a portfóliót.",
        "features": [
          "Minden, ami a Személyes csomagban van",
          "Igények Wordben, README-ben vagy képes PDF-ben, vázlatokat is szívesen fogadunk",
          "Az igényeid szerint elkészített portfólió",
          "1 javítási kör",
          "30 nap támogatás"
        ]
      }
    }
  },
  "commercial": {
    "source": {
      "name": "All-in-One A–Z",
      "tagline": "We build it, put it online and take care of hosting and the domain.",
      "features": [
        "Everything in Custom Build",
        "3 rounds of revisions",
        "Hosting for 1 year",
        "Domain name for 1 year",
        "90 days of priority support"
      ]
    },
    "text": {
      "ja": {
        "name": "オールインワン A–Z",
        "tagline": "制作から公開、ホスティングとドメインまでお任せください。",
        "features": [
          "オーダーメイド制作の全内容",
          "修正3回",
          "ホスティング1年分",
          "ドメイン1年分",
          "90日間の優先サポート"
        ]
      },
      "zh-CN": {
        "name": "全包 A–Z",
        "tagline": "从制作、上线到主机和域名，我们全部搞定。",
        "features": [
          "包含按需定制的所有内容",
          "3 次修改",
          "1 年主机托管",
          "1 年域名",
          "90 天优先支持"
        ]
      },
      "zh-TW": {
        "name": "全包 A–Z",
        "tagline": "從製作、上線到主機與網域，我們一手包辦。",
        "features": [
          "包含客製化製作的所有內容",
          "修改 3 次",
          "1 年主機代管",
          "1 年網域",
          "90 天優先支援"
        ]
      },
      "ko": {
        "name": "올인원 A–Z",
        "tagline": "제작부터 게시, 호스팅과 도메인까지 모두 맡아 드립니다.",
        "features": [
          "맞춤 제작의 모든 기능 포함",
          "수정 3회",
          "호스팅 1년",
          "도메인 1년",
          "90일간 우선 지원"
        ]
      },
      "th": {
        "name": "ครบวงจร A–Z",
        "tagline": "เราสร้าง นำขึ้นออนไลน์ และดูแลโฮสติ้งกับโดเมนให้ครบ",
        "features": [
          "ทุกอย่างในแพ็กเกจสร้างตามสั่ง",
          "แก้ไขได้ 3 ครั้ง",
          "โฮสติ้ง 1 ปี",
          "โดเมน 1 ปี",
          "ดูแลช่วยเหลือแบบเร่งด่วน 90 วัน"
        ]
      },
      "id": {
        "name": "Paket Lengkap A–Z",
        "tagline": "Kami buatkan, onlinekan, dan urus hosting serta domainnya.",
        "features": [
          "Semua yang ada di Buat Sesuai Permintaan",
          "3 kali revisi",
          "Hosting 1 tahun",
          "Domain 1 tahun",
          "Dukungan prioritas 90 hari"
        ]
      },
      "ms": {
        "name": "Pakej Lengkap A–Z",
        "tagline": "Kami bina, letakkan dalam talian dan uruskan hosting serta domain.",
        "features": [
          "Segala yang ada dalam Bina Ikut Permintaan",
          "3 pusingan pindaan",
          "Hosting 1 tahun",
          "Domain 1 tahun",
          "Sokongan keutamaan 90 hari"
        ]
      },
      "fil": {
        "name": "All-in-One A–Z",
        "tagline": "Kami ang gagawa, maglalagay online, at bahala sa hosting at domain.",
        "features": [
          "Lahat ng nasa Custom Build",
          "3 beses na revision",
          "Hosting sa loob ng 1 taon",
          "Domain sa loob ng 1 taon",
          "90 araw ng priority support"
        ]
      },
      "km": {
        "name": "កញ្ចប់ពេញលេញ A–Z",
        "tagline": "យើងបង្កើត ដាក់លើអ៊ីនធឺណិត និងរៀបចំ hosting និងដូមែនជូនទាំងអស់។",
        "features": [
          "អ្វីគ្រប់យ៉ាងនៅក្នុងបង្កើតតាមតម្រូវការ",
          "កែប្រែ 3 ដង",
          "Hosting រយៈពេល 1 ឆ្នាំ",
          "ដូមែនរយៈពេល 1 ឆ្នាំ",
          "ការគាំទ្រជាអាទិភាពរយៈពេល 90 ថ្ងៃ"
        ]
      },
      "lo": {
        "name": "ຄົບຊຸດ A–Z",
        "tagline": "ພວກເຮົາສ້າງ, ອອນລາຍ ແລະ ດູແລ hosting ກັບໂດເມນໃຫ້ຄົບ.",
        "features": [
          "ທຸກຢ່າງໃນຊຸດສ້າງຕາມຄວາມຕ້ອງການ",
          "ແກ້ໄຂ 3 ຄັ້ງ",
          "Hosting 1 ປີ",
          "ໂດເມນ 1 ປີ",
          "ຊ່ວຍເຫຼືອພິເສດ 90 ວັນ"
        ]
      },
      "hi": {
        "name": "ऑल-इन-वन A–Z",
        "tagline": "हम बनाते हैं, ऑनलाइन डालते हैं और होस्टिंग व डोमेन भी संभालते हैं।",
        "features": [
          "कस्टम बिल्ड में सब कुछ",
          "3 बार बदलाव",
          "1 साल की होस्टिंग",
          "1 साल का डोमेन",
          "90 दिनों का प्राथमिकता सपोर्ट"
        ]
      },
      "bn": {
        "name": "অল-ইন-ওয়ান A–Z",
        "tagline": "আমরা বানাই, অনলাইনে দিই, আর হোস্টিং ও ডোমেইনও দেখি।",
        "features": [
          "কাস্টম বিল্ডের সব সুবিধা",
          "৩ বার সংশোধন",
          "১ বছরের হোস্টিং",
          "১ বছরের ডোমেইন",
          "৯০ দিনের প্রায়োরিটি সাপোর্ট"
        ]
      },
      "ar": {
        "name": "الباقة الشاملة A–Z",
        "tagline": "نبنيه وننشره ونتولى الاستضافة والنطاق أيضاً.",
        "features": [
          "كل ما في تصميم حسب الطلب",
          "3 جولات تعديل",
          "استضافة لمدة سنة",
          "نطاق (دومين) لمدة سنة",
          "دعم ذو أولوية لمدة 90 يوماً"
        ]
      },
      "fa": {
        "name": "بسته کامل A–Z",
        "tagline": "می‌سازیم، آنلاین می‌کنیم و هاست و دامنه را هم فراهم می‌کنیم.",
        "features": [
          "همه چیز در ساخت سفارشی",
          "۳ بار اصلاح",
          "هاست ۱ ساله",
          "دامنه ۱ ساله",
          "۹۰ روز پشتیبانی اولویت‌دار"
        ]
      },
      "he": {
        "name": "חבילה מלאה A–Z",
        "tagline": "אנחנו בונים, מעלים לרשת ודואגים גם לאחסון ולדומיין.",
        "features": [
          "כל מה שיש בבנייה לפי דרישה",
          "3 סבבי תיקונים",
          "אחסון לשנה",
          "דומיין לשנה",
          "90 ימי תמיכה בעדיפות"
        ]
      },
      "ur": {
        "name": "آل اِن ون A–Z",
        "tagline": "ہم بناتے ہیں، آن لائن کرتے ہیں اور ہوسٹنگ اور ڈومین بھی سنبھالتے ہیں۔",
        "features": [
          "کسٹم بلڈ کی تمام چیزیں",
          "3 بار ترمیم",
          "1 سال کی ہوسٹنگ",
          "1 سال کا ڈومین",
          "90 دن کی ترجیحی سپورٹ"
        ]
      },
      "tr": {
        "name": "Hepsi Bir Arada A–Z",
        "tagline": "Yapıyoruz, yayına alıyoruz, hosting ve alan adını da hallediyoruz.",
        "features": [
          "İsteğe Özel Yapım paketindeki her şey",
          "3 revizyon",
          "1 yıl hosting",
          "1 yıl alan adı",
          "90 gün öncelikli destek"
        ]
      },
      "ru": {
        "name": "Всё включено A–Z",
        "tagline": "Соберём, запустим и возьмём на себя хостинг и домен.",
        "features": [
          "Всё из пакета «Сборка под заказ»",
          "3 раунда правок",
          "Хостинг на 1 год",
          "Домен на 1 год",
          "90 дней приоритетной поддержки"
        ]
      },
      "uk": {
        "name": "Усе включено A–Z",
        "tagline": "Зробимо, запустимо й подбаємо про хостинг і домен.",
        "features": [
          "Усе з пакета «Розробка на замовлення»",
          "3 раунди правок",
          "Хостинг на 1 рік",
          "Домен на 1 рік",
          "90 днів пріоритетної підтримки"
        ]
      },
      "pl": {
        "name": "Wszystko w jednym A–Z",
        "tagline": "Budujemy, publikujemy i zajmujemy się hostingiem oraz domeną.",
        "features": [
          "Wszystko z pakietu Wykonanie na zamówienie",
          "3 rundy poprawek",
          "Hosting na 1 rok",
          "Domena na 1 rok",
          "90 dni priorytetowego wsparcia"
        ]
      },
      "cs": {
        "name": "Vše v jednom A–Z",
        "tagline": "Vytvoříme, spustíme a postaráme se i o hosting a doménu.",
        "features": [
          "Vše z balíčku Výroba na míru",
          "3 kola úprav",
          "Hosting na 1 rok",
          "Doména na 1 rok",
          "90 dní prioritní podpory"
        ]
      },
      "de": {
        "name": "Rundum-Paket A–Z",
        "tagline": "Wir bauen es, bringen es online und kümmern uns um Hosting und Domain.",
        "features": [
          "Alles aus Individuelle Umsetzung",
          "3 Korrekturrunden",
          "Hosting für 1 Jahr",
          "Domain für 1 Jahr",
          "90 Tage bevorzugter Support"
        ]
      },
      "fr": {
        "name": "Tout-en-un A–Z",
        "tagline": "Nous le créons, le mettons en ligne et gérons l'hébergement et le domaine.",
        "features": [
          "Tout ce qui est dans Sur mesure",
          "3 séries de retouches",
          "Hébergement pendant 1 an",
          "Nom de domaine pendant 1 an",
          "90 jours de support prioritaire"
        ]
      },
      "es": {
        "name": "Todo incluido A–Z",
        "tagline": "Lo creamos, lo publicamos y nos ocupamos del hosting y el dominio.",
        "features": [
          "Todo lo de A medida",
          "3 rondas de cambios",
          "Hosting por 1 año",
          "Dominio por 1 año",
          "90 días de soporte prioritario"
        ]
      },
      "pt": {
        "name": "Tudo Incluído A–Z",
        "tagline": "Nós criamos, publicamos e cuidamos da hospedagem e do domínio.",
        "features": [
          "Tudo do Sob Medida",
          "3 rodadas de ajustes",
          "Hospedagem por 1 ano",
          "Domínio por 1 ano",
          "90 dias de suporte prioritário"
        ]
      },
      "it": {
        "name": "Tutto incluso A–Z",
        "tagline": "Lo creiamo, lo pubblichiamo e pensiamo noi a hosting e dominio.",
        "features": [
          "Tutto quello del pacchetto Su misura",
          "3 giri di modifiche",
          "Hosting per 1 anno",
          "Dominio per 1 anno",
          "90 giorni di assistenza prioritaria"
        ]
      },
      "nl": {
        "name": "Alles-in-één A–Z",
        "tagline": "Wij bouwen het, zetten het online en regelen hosting en domein.",
        "features": [
          "Alles uit Op maat gebouwd",
          "3 correctierondes",
          "1 jaar hosting",
          "1 jaar domeinnaam",
          "90 dagen voorrangssupport"
        ]
      },
      "sv": {
        "name": "Allt-i-ett A–Z",
        "tagline": "Vi bygger den, publicerar den och sköter webbhotell och domän.",
        "features": [
          "Allt i Skräddarsydd",
          "3 omgångar ändringar",
          "Webbhotell i 1 år",
          "Domän i 1 år",
          "90 dagars prioriterad support"
        ]
      },
      "el": {
        "name": "Όλα σε ένα A–Z",
        "tagline": "Το φτιάχνουμε, το ανεβάζουμε online και αναλαμβάνουμε hosting και domain.",
        "features": [
          "Όλα όσα περιλαμβάνει η Κατασκευή κατά παραγγελία",
          "3 γύροι διορθώσεων",
          "Hosting για 1 χρόνο",
          "Domain για 1 χρόνο",
          "90 ημέρες υποστήριξης με προτεραιότητα"
        ]
      },
      "ro": {
        "name": "Totul inclus A–Z",
        "tagline": "Îl construim, îl punem online și ne ocupăm de găzduire și domeniu.",
        "features": [
          "Tot ce este în La comandă",
          "3 runde de modificări",
          "Găzduire pentru 1 an",
          "Domeniu pentru 1 an",
          "90 de zile de asistență prioritară"
        ]
      },
      "hu": {
        "name": "Minden egyben A–Z",
        "tagline": "Elkészítjük, közzétesszük, és a tárhelyet meg a domaint is intézzük.",
        "features": [
          "Minden, ami az Egyedi kivitelezés csomagban van",
          "3 javítási kör",
          "1 év tárhely",
          "1 év domain",
          "90 nap elsőbbségi támogatás"
        ]
      }
    }
  }
};

// Built-in translations of the package text, keyed by the Whop plan metadata "key".
// `source` is the English text (from Whop) each entry was translated from: when that
// English text changes in Whop, these translations are skipped until they are refreshed.
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
        "Step-by-step guide to put your portfolio online",
        "License for 1 personal portfolio"
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
          "ポートフォリオ公開までのステップバイステップガイド",
          "個人用ポートフォリオ1件分のライセンス"
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
          "将作品集上线的分步指南",
          "1个个人作品集使用许可"
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
          "作品集上線逐步指南",
          "個人作品集授權（1 個）"
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
          "온라인 게시를 위한 단계별 가이드",
          "개인 포트폴리오 1개용 라이선스"
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
          "คู่มือทีละขั้นตอนเพื่อนำพอร์ตโฟลิโอขึ้นออนไลน์",
          "สิทธิ์ใช้งานสำหรับ 1 พอร์ตโฟลิโอส่วนตัว"
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
          "Panduan langkah demi langkah untuk menaruh portofolio online",
          "Lisensi untuk 1 portofolio pribadi"
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
          "Panduan langkah demi langkah untuk meletakkan portfolio anda dalam talian",
          "Lesen untuk 1 portfolio peribadi"
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
          "Step-by-step guide para mailagay online ang portfolio mo",
          "License para sa 1 personal portfolio"
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
          "មគ្គុទ្ទេសក៍ជាជំហានៗដើម្បីដាក់ផលប័ត្ររបស់អ្នកនៅលើអ៊ីនធឺណិត",
          "អាជ្ញាប័ណ្ណសម្រាប់ផលប័ត្រផ្ទាល់ខ្លួនចំនួន 1"
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
          "ຄູ່ມືເປັນຂັ້ນຕອນເພື່ອອອນລາຍ Portfolio",
          "ໃບອະນຸຍາດສຳລັບ 1 Portfolio ສ່ວນຕົວ"
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
          "अपना पोर्टफोलियो ऑनलाइन डालने के लिए स्टेप-बाय-स्टेप गाइड",
          "1 पर्सनल पोर्टफोलियो के लिए लाइसेंस"
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
          "পোর্টফোলিও অনলাইনে দেওয়ার স্টেপ-বাই-স্টেপ গাইড",
          "১টি পার্সোনাল পোর্টফোলিও’র লাইসেন্স"
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
          "دليل خطوة بخطوة لنشر موقعك",
          "رخصة لمعرض أعمال شخصي واحد"
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
          "راهنمای گام‌به‌گام برای آنلاین کردن نمونه‌کار",
          "مجوز برای ۱ نمونه‌کار شخصی"
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
          "מדריך שלב-אחר-שלב להעלאת הפורטפוליו לרשת",
          "רישיון לפורטפוליו אישי אחד"
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
          "اپنے پورٹ فولیو کو آن لائن کرنے کے لیے سٹیپ بائی سٹیپ گائیڈ",
          "1 ذاتی پورٹ فولیو کے لیے لائسنس"
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
          "Portfolyonuzu yayına almak için adım adım kılavuz",
          "1 kişisel portfolyo için lisans"
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
          "Пошаговое руководство по запуску",
          "Лицензия для 1 личного портфолио"
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
          "Покрокова інструкція для запуску",
          "Ліцензія на 1 особисте портфоліо"
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
          "Poradnik krok po kroku jak wystartować",
          "Licencja na 1 własne portfolio"
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
          "Návod krok za krokem pro spuštění webu",
          "Licence pro 1 osobní portfolio"
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
          "Schritt-für-Schritt-Anleitung, um dein Portfolio online zu bringen",
          "Lizenz für 1 persönliches Portfolio"
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
          "Guide étape par étape pour mettre votre portfolio en ligne",
          "Licence pour 1 portfolio personnel"
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
          "Guía paso a paso para poner tu portafolio en línea",
          "Licencia para 1 portafolio personal"
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
          "Guia passo a passo para publicar seu portfólio",
          "Licença para 1 portfólio pessoal"
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
          "Guida passo dopo passo per pubblicare il tuo portfolio",
          "Licenza per 1 portfolio personale"
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
          "Stap-voor-stap handleiding om je site online te krijgen",
          "Licentie voor 1 persoonlijk portfolio"
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
          "Steg-för-steg-guide för att få din portfölj online",
          "Licens för 1 personlig portfölj"
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
          "Οδηγός βήμα-βήμα για να βάλετε το portfolio online",
          "Άδεια για 1 προσωπικό portfolio"
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
          "Ghid pas cu pas pentru a pune portofoliul online",
          "Licență pentru 1 portofoliu personal"
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
          "Lépésről lépésre útmutató a portfólió közzétételéhez",
          "Licenc 1 személyes portfólióhoz"
        ]
      }
    }
  },
  "setup": {
    "source": {
      "name": "Source + Setup",
      "tagline": "Source code with full setup: send us your content and we put your portfolio online.",
      "features": [
        "Everything in Personal Source",
        "We fill in your content, photos and projects",
        "Online on your own domain",
        "Colors and fonts adjusted to your taste",
        "30 days of email support"
      ]
    },
    "text": {
      "ja": {
        "name": "ソース ＋ セットアップ",
        "tagline": "ソースコードとセットアップの完全パッケージ：コンテンツを送っていただければ、こちらで公開まで代行します。",
        "features": [
          "個人用ソースの全内容",
          "コンテンツ、写真、プロジェクトを代行入力",
          "独自のドメインで公開",
          "お好みに合わせて色やフォントを調整",
          "30日間のメールサポート"
        ]
      },
      "zh-CN": {
        "name": "源码+设置服务",
        "tagline": "源码加上全套设置：发送您的内容给我们，我们帮您发布作品集。",
        "features": [
          "个人版源码的所有内容",
          "我们代为您填充内容、照片和项目",
          "在您的个人域名上上线",
          "根据您的喜好调整颜色和字体",
          "30天电子邮件支持"
        ]
      },
      "zh-TW": {
        "name": "原始碼 + 設定",
        "tagline": "原始碼含全套設定：將你的資料發給我們，我們幫你把作品集上線。",
        "features": [
          "包含個人原始碼方案的所有內容",
          "協助代填內容、照片與專案",
          "於你的專屬網域上線",
          "依你的喜好調整配色與字體",
          "30 天電子郵件支援"
        ]
      },
      "ko": {
        "name": "소스 + 설치",
        "tagline": "소스 코드와 전체 설치: 내용을 보내주시면 포트폴리오를 게시해 드립니다.",
        "features": [
          "개인용 소스 모든 기능 포함",
          "내용, 사진, 프로젝트 직접 등록",
          "개인 도메인으로 온라인 게시",
          "취향에 맞는 색상 및 폰트 설정",
          "30일간 이메일 지원"
        ]
      },
      "th": {
        "name": "ซอร์สโค้ดพร้อมติดตั้ง",
        "tagline": "ซอร์สโค้ดพร้อมบริการติดตั้งครบวงจร เพียงส่งข้อมูลมา เราจะนำพอร์ตโฟลิโอของคุณขึ้นออนไลน์ให้",
        "features": [
          "ทุกอย่างที่มีในแพ็กเกจส่วนตัว",
          "เราใส่เนื้อหา รูปภาพ และโปรเจกต์ให้คุณ",
          "ออนไลน์บนโดเมนของคุณเอง",
          "ปรับสีและฟอนต์ตามรสนิยมของคุณ",
          "สนับสนุนทางอีเมล 30 วัน"
        ]
      },
      "id": {
        "name": "Kode Sumber + Pengaturan",
        "tagline": "Kode sumber dengan pengaturan penuh: kirimkan konten Anda dan kami akan membuat portofolio Anda online.",
        "features": [
          "Semua yang ada di Kode Sumber Pribadi",
          "Kami mengisi konten, foto, dan proyek Anda",
          "Online di domain Anda sendiri",
          "Warna dan font disesuaikan dengan selera Anda",
          "Dukungan email 30 hari"
        ]
      },
      "ms": {
        "name": "Kod Sumber + Penyediaan",
        "tagline": "Kod sumber dengan penyediaan penuh: hantarkan kandungan anda dan kami akan letakkan portfolio anda dalam talian.",
        "features": [
          "Segala yang ada dalam Kod Sumber Peribadi",
          "Kami isikan kandungan, foto dan projek anda",
          "Dalam talian pada domain anda sendiri",
          "Warna dan fon diselaraskan mengikut cita rasa anda",
          "30 hari sokongan e-mel"
        ]
      },
      "fil": {
        "name": "Source Code + Setup",
        "tagline": "Source code na may kasamang full setup: ipadala sa amin ang iyong content at kami na ang maglalagay ng portfolio mo online.",
        "features": [
          "Lahat ng nasa Personal na Source Code",
          "Kami ang maglalagay ng content, photos, at projects mo",
          "Online sa sarili mong domain",
          "Colors at fonts na naka-adjust sa gusto mo",
          "30 araw ng email support"
        ]
      },
      "km": {
        "name": "កូដប្រភព + ការរៀបចំ",
        "tagline": "កូដប្រភពជាមួយនឹងការរៀបចំពេញលេញ៖ ផ្ញើខ្លឹមសាររបស់អ្នកមកយើង ហើយយើងនឹងដាក់ផលប័ត្ររបស់អ្នកលើអ៊ីនធឺណិត",
        "features": [
          "អ្វីគ្រប់យ៉ាងនៅក្នុងកូដប្រភពផ្ទាល់ខ្លួន",
          "យើងបំពេញខ្លឹមសារ រូបថត និងគម្រោងរបស់អ្នក",
          "នៅលើអ៊ីនធឺណិតជាមួយដែនផ្ទាល់ខ្លួនរបស់អ្នក",
          "ពណ៌ និងពុម្ពអក្សរត្រូវបានកែសម្រួលតាមចំណូលចិត្តរបស់អ្នក",
          "ការគាំទ្រតាមអ៊ីមែលរយៈពេល 30 ថ្ងៃ"
        ]
      },
      "lo": {
        "name": "ລະຫັດ + ຕັ້ງຄ່າ",
        "tagline": "ລະຫັດແຫຼ່ງພ້ອມຕັ້ງຄ່າທັງໝົດ: ທ່ານສົ່ງເນື້ອຫາໃຫ້ເຮົາ ແລ້ວເຮົາຈະນຳ Portfolio ຂອງທ່ານອອນລາຍ.",
        "features": [
          "ທຸກຢ່າງໃນລະຫັດສ່ວນຕົວ",
          "ເຮົາໃສ່ເນື້ອຫາ, ຮູບພາບ ແລະ ຜົນງານໃຫ້ທ່ານ",
          "ອອນລາຍຜ່ານໂດເມນຂອງທ່ານເອງ",
          "ປັບສີ ແລະ ຟອນໃຫ້ຖືກໃຈທ່ານ",
          "ຊ່ວຍເຫຼືອທາງອີເມລ໌ 30 ວັນ"
        ]
      },
      "hi": {
        "name": "सोर्स + सेटअप",
        "tagline": "पूरे सेटअप के साथ सोर्स कोड: अपना कंटेंट हमें भेजें और हम आपका पोर्टफोलियो ऑनलाइन डाल देंगे।",
        "features": [
          "पर्सनल सोर्स में सब कुछ",
          "हम आपका कंटेंट, फोटो और प्रोजेक्ट्स भरते हैं",
          "अपने खुद के डोमेन पर ऑनलाइन",
          "आपकी पसंद के अनुसार रंग और फोंट एडजस्ट",
          "30 दिनों का ईमेल सपोर्ट"
        ]
      },
      "bn": {
        "name": "সোর্স + সেটআপ",
        "tagline": "পুরো সেটআপসহ সোর্স কোড: আপনার কন্টেন্ট আমাদের পাঠান আর আমরা পোর্টফোলিও অনলাইনে দেব।",
        "features": [
          "পার্সোনাল সোর্সের সব সুবিধা",
          "আমরা আপনার কন্টেন্ট, ছবি এবং প্রজেক্ট বসিয়ে দেব",
          "আপনার নিজস্ব ডোমেনে অনলাইনে",
          "আপনার পছন্দ অনুযায়ী রঙ এবং ফন্ট সেট করা",
          "৩০ দিনের ইমেইল সাপোর্ট"
        ]
      },
      "ar": {
        "name": "الكود مع الإعداد",
        "tagline": "الكود المصدري مع إعداد كامل: أرسل لنا محتواك وسنضع معرض أعمالك على الإنترنت.",
        "features": [
          "كل ما في باقة الكود الشخصي",
          "نملأ المحتوى والصور والمشاريع بدلاً منك",
          "موقع مباشر على نطاقك الخاص",
          "تعديل الألوان والخطوط لتناسب ذوقك",
          "30 يوماً من دعم البريد الإلكتروني"
        ]
      },
      "fa": {
        "name": "سورس + نصب",
        "tagline": "سورس‌کد با نصب کامل: محتوای خود را برای ما بفرستید و ما نمونه‌کار شما را آنلاین می‌کنیم.",
        "features": [
          "همه چیز در سورس شخصی",
          "ما محتوا، عکس‌ها و پروژه‌های شما را وارد می‌کنیم",
          "آنلاین روی دامنه شخصی خودتان",
          "رنگ‌ها و فونت‌ها طبق سلیقه شما تنظیم می‌شوند",
          "۳۰ روز پشتیبانی ایمیلی"
        ]
      },
      "he": {
        "name": "קוד מקור + התקנה",
        "tagline": "קוד מקור עם התקנה מלאה: שלחו לנו את התוכן שלכם ואנחנו נעלה את הפורטפוליו לאוויר.",
        "features": [
          "כל מה שיש בקוד האישי",
          "אנחנו נמלא את התוכן, התמונות והפרויקטים עבורכם",
          "באוויר תחת דומיין משלכם",
          "צבעים ופונטים מותאמים לטעם שלכם",
          "30 ימי תמיכה במייל"
        ]
      },
      "ur": {
        "name": "سورس + سیٹ اپ",
        "tagline": "مکمل سیٹ اپ کے ساتھ سورس کوڈ: ہمیں اپنا مواد بھیجیں اور ہم آپ کا پورٹ فولیو آن لائن کر دیں گے۔",
        "features": [
          "پرسنل سورس کی تمام چیزیں",
          "ہم آپ کا مواد، تصاویر اور پروجیکٹس شامل کرتے ہیں",
          "آپ کے اپنے ڈومین پر آن لائن",
          "آپ کی پسند کے مطابق رنگ اور فونٹس",
          "30 دن کی ای میل سپورٹ"
        ]
      },
      "tr": {
        "name": "Kaynak Kod + Kurulum",
        "tagline": "Kurulum dahil kaynak kodu: içeriklerinizi bize gönderin, portfolyonuzu yayına alalım.",
        "features": [
          "Kişisel Kaynak Kod paketindeki her şey",
          "İçerik, fotoğraf ve projelerinizi biz ekliyoruz",
          "Kendi alan adınızda yayınlanma",
          "Zevkinize uygun renk ve yazı tipi ayarları",
          "30 gün e-posta desteği"
        ]
      },
      "ru": {
        "name": "Код + Настройка",
        "tagline": "Исходный код с полной настройкой: вы присылаете контент, мы запускаем портфолио.",
        "features": [
          "Всё из пакета Личный",
          "Мы сами добавим ваш контент, фото и проекты",
          "Запуск на вашем домене",
          "Настройка цветов и шрифтов под ваш вкус",
          "Поддержка по почте 30 дней"
        ]
      },
      "uk": {
        "name": "Код + Установка",
        "tagline": "Повний код із установкою: надішліть нам дані, і ми опублікуємо ваше портфоліо.",
        "features": [
          "Все, що в Особистому коді",
          "Ми самі внесемо ваші дані, фото та проекти",
          "Сайт буде на вашому домені",
          "Кольори та шрифти на ваш смак",
          "30 днів підтримки"
        ]
      },
      "pl": {
        "name": "Kod + Konfiguracja",
        "tagline": "Kod źródłowy z pełną konfiguracją: wyślij nam swoje dane, a my uruchomimy Twoje portfolio.",
        "features": [
          "Wszystko z kodu osobistego",
          "Wpiszemy Twoje dane, zdjęcia i projekty",
          "Uruchomienie na Twojej domenie",
          "Kolory i czcionki dopasowane do Twojego gustu",
          "30 dni wsparcia mailowego"
        ]
      },
      "cs": {
        "name": "Zdrojový kód + nastavení",
        "tagline": "Zdrojový kód s kompletním nastavením: pošlete nám obsah a my portfolio zprovozníme.",
        "features": [
          "Vše z balíčku Osobní zdrojový kód",
          "Vložíme váš obsah, fotky a projekty",
          "Online na vaší vlastní doméně",
          "Barvy a fonty dle vašeho vkusu",
          "30 dní e-mailové podpory"
        ]
      },
      "de": {
        "name": "Quellcode + Setup",
        "tagline": "Quellcode inklusive Einrichtung: Sende uns deine Inhalte und wir bringen dein Portfolio online.",
        "features": [
          "Alles aus dem persönlichen Quellcode",
          "Wir füllen deine Inhalte, Fotos und Projekte ein",
          "Online unter deiner eigenen Domain",
          "Farben und Schriften nach deinem Geschmack angepasst",
          "30 Tage E-Mail-Support"
        ]
      },
      "fr": {
        "name": "Code source + Installation",
        "tagline": "Code source avec installation complète : envoyez-nous votre contenu et nous mettons votre portfolio en ligne.",
        "features": [
          "Tout ce qui est dans le code source personnel",
          "Nous remplissons votre contenu, vos photos et projets",
          "En ligne sur votre propre domaine",
          "Couleurs et polices ajustées à vos goûts",
          "30 jours de support par e-mail"
        ]
      },
      "es": {
        "name": "Código + Configuración",
        "tagline": "Código fuente con configuración completa: envíanos tu contenido y pondremos tu portafolio en línea.",
        "features": [
          "Todo lo del código personal",
          "Nosotros añadimos tu contenido, fotos y proyectos",
          "En línea bajo tu propio dominio",
          "Colores y fuentes ajustados a tu gusto",
          "30 días de soporte por correo"
        ]
      },
      "pt": {
        "name": "Código + Configuração",
        "tagline": "Código-fonte com configuração completa: nos envie seu conteúdo e nós colocamos seu portfólio no ar.",
        "features": [
          "Tudo do Código Pessoal",
          "Nós preenchemos seu conteúdo, fotos e projetos",
          "Online no seu próprio domínio",
          "Cores e fontes ajustadas ao seu gosto",
          "30 dias de suporte por e-mail"
        ]
      },
      "it": {
        "name": "Codice sorgente + setup",
        "tagline": "Codice sorgente con setup completo: inviaci i contenuti e pubblichiamo il tuo portfolio.",
        "features": [
          "Tutto quello del pacchetto Codice sorgente personale",
          "Inseriamo noi contenuti, foto e progetti",
          "Online sul tuo dominio",
          "Colori e font adattati ai tuoi gusti",
          "30 giorni di assistenza email"
        ]
      },
      "nl": {
        "name": "Broncode + Setup",
        "tagline": "Broncode inclusief volledige installatie: stuur ons je materiaal en wij zetten je portfolio online.",
        "features": [
          "Alles in Persoonlijke Broncode",
          "Wij vullen je inhoud, foto's en projecten in",
          "Online op je eigen domein",
          "Kleuren en lettertypes aangepast naar jouw smaak",
          "30 dagen mailsupport"
        ]
      },
      "sv": {
        "name": "Källkod + installation",
        "tagline": "Källkod med full installation: skicka oss ditt innehåll så sätter vi upp din portfölj online.",
        "features": [
          "Allt i Personlig källkod",
          "Vi fyller i ditt innehåll, foton och projekt",
          "Online på din egen domän",
          "Färger och typsnitt anpassade efter din smak",
          "30 dagars e-postsupport"
        ]
      },
      "el": {
        "name": "Πηγαίος Κώδικας + Εγκατάσταση",
        "tagline": "Πηγαίος κώδικας με πλήρη εγκατάσταση: στείλτε μας το περιεχόμενό σας και εμείς ανεβάζουμε το portfolio online.",
        "features": [
          "Όλα όσα περιλαμβάνει ο Προσωπικός Πηγαίος Κώδικας",
          "Συμπληρώνουμε το περιεχόμενο, τις φωτογραφίες και τα έργα σας",
          "Online στο δικό σας domain",
          "Χρώματα και γραμματοσειρές προσαρμοσμένα στα γούστα σας",
          "30 ημέρες υποστήριξης μέσω email"
        ]
      },
      "ro": {
        "name": "Cod Sursă + Configurare",
        "tagline": "Cod sursă cu configurare completă: trimite-ne conținutul tău și noi punem portofoliul online.",
        "features": [
          "Tot ce este în Cod Sursă Personal",
          "Noi introducem conținutul, fotografiile și proiectele",
          "Online pe propriul tău domeniu",
          "Culori și fonturi ajustate după gustul tău",
          "30 de zile de asistență prin email"
        ]
      },
      "hu": {
        "name": "Forráskód + Beállítás",
        "tagline": "Forráskód teljes beállítással: küldd el a tartalmadat és mi online közzétesszük a portfóliódat.",
        "features": [
          "Minden, ami a Személyes csomagban van",
          "Feltöltjük a tartalmadat, fotóidat és projektjeidet",
          "Online a saját domaineden",
          "Színek és betűtípusok az ízlésedre igazítva",
          "30 nap e-mail támogatás"
        ]
      }
    }
  },
  "commercial": {
    "source": {
      "name": "Commercial Source",
      "tagline": "Build client portfolios with the source code, for as many projects as you like.",
      "features": [
        "Everything in Personal Source",
        "Commercial license for client work",
        "Build as many portfolios as you like",
        "Free source updates for life",
        "90 days of priority email support"
      ]
    },
    "text": {
      "ja": {
        "name": "商用ソース",
        "tagline": "ソースコードを使って、クライアントのポートフォリオを何件でも制作できます。",
        "features": [
          "個人用ソースの全内容",
          "クライアントワーク用商用ライセンス",
          "ポートフォリオ制作数無制限",
          "ソースコードの無期限アップデート無料",
          "90日間の優先メールサポート"
        ]
      },
      "zh-CN": {
        "name": "商业用途源码",
        "tagline": "使用该源码为客户制作作品集，不限项目数量。",
        "features": [
          "个人版源码的所有内容",
          "用于客户项目的商业许可",
          "制作任意数量的作品集",
          "终身免费源码更新",
          "90天优先电子邮件支持"
        ]
      },
      "zh-TW": {
        "name": "商業原始碼",
        "tagline": "使用原始碼為客戶建置作品集，專案數量不限。",
        "features": [
          "包含個人原始碼方案的所有內容",
          "客戶專案商業授權",
          "可建置無限數量的作品集",
          "原始碼終身免費更新",
          "90 天優先電子郵件支援"
        ]
      },
      "ko": {
        "name": "상업용 소스",
        "tagline": "소스 코드를 사용하여 클라이언트 포트폴리오를 제한 없이 무제한으로 제작하세요.",
        "features": [
          "개인용 소스 모든 기능 포함",
          "클라이언트 작업용 상업적 라이선스",
          "원하는 만큼 많은 포트폴리오 제작 가능",
          "평생 무료 소스 업데이트",
          "90일간 우선 이메일 지원"
        ]
      },
      "th": {
        "name": "ซอร์สโค้ดเชิงพาณิชย์",
        "tagline": "สร้างพอร์ตโฟลิโอให้ลูกค้าด้วยซอร์สโค้ดนี้ ได้ไม่จำกัดจำนวนโปรเจกต์",
        "features": [
          "ทุกอย่างที่มีในแพ็กเกจส่วนตัว",
          "สิทธิ์การใช้งานเชิงพาณิชย์สำหรับงานลูกค้า",
          "สร้างกี่พอร์ตโฟลิโอก็ได้ตามต้องการ",
          "อัปเดตซอร์สโค้ดฟรีตลอดชีพ",
          "สนับสนุนพิเศษทางอีเมล 90 วัน"
        ]
      },
      "id": {
        "name": "Kode Sumber Komersial",
        "tagline": "Bangun portofolio klien dengan kode sumber, untuk sebanyak mungkin proyek yang Anda inginkan.",
        "features": [
          "Semua yang ada di Kode Sumber Pribadi",
          "Lisensi komersial untuk pekerjaan klien",
          "Buat portofolio sebanyak yang Anda inginkan",
          "Pembaruan kode sumber gratis seumur hidup",
          "Dukungan email prioritas 90 hari"
        ]
      },
      "ms": {
        "name": "Kod Sumber Komersial",
        "tagline": "Bina portfolio klien dengan kod sumber, untuk seberapa banyak projek yang anda suka.",
        "features": [
          "Segala yang ada dalam Kod Sumber Peribadi",
          "Lesen komersial untuk kerja klien",
          "Bina sebanyak mungkin portfolio yang anda suka",
          "Kemas kini kod sumber percuma seumur hidup",
          "90 hari sokongan e-mel keutamaan"
        ]
      },
      "fil": {
        "name": "Pangkomersyal na Source Code",
        "tagline": "Bumuo ng client portfolios gamit ang source code, para sa kahit ilang proyekto na gusto mo.",
        "features": [
          "Lahat ng nasa Personal na Source Code",
          "Commercial license para sa trabaho sa client",
          "Gumawa ng kahit gaano karaming portfolio",
          "Libreng source updates habangbuhay",
          "90 araw ng priority email support"
        ]
      },
      "km": {
        "name": "កូដប្រភពពាណិជ្ជកម្ម",
        "tagline": "បង្កើតផលប័ត្រសម្រាប់អតិថិជនដោយប្រើកូដប្រភព សម្រាប់គម្រោងជាច្រើនតាមដែលអ្នកចង់បាន",
        "features": [
          "អ្វីគ្រប់យ៉ាងនៅក្នុងកូដប្រភពផ្ទាល់ខ្លួន",
          "អាជ្ញាប័ណ្ណពាណិជ្ជកម្មសម្រាប់ការងារអតិថិជន",
          "បង្កើតផលប័ត្របានច្រើនតាមចិត្ត",
          "អាប់ដេតកូដប្រភពដោយឥតគិតថ្លៃពេញមួយជីវិត",
          "ការគាំទ្រតាមអ៊ីមែលជាអាទិភាពរយៈពេល 90 ថ្ងៃ"
        ]
      },
      "lo": {
        "name": "ລະຫັດແຫຼ່ງຮູບແບບການຄ້າ",
        "tagline": "ໃຊ້ລະຫັດແຫຼ່ງເພື່ອສ້າງ Portfolio ໃຫ້ລູກຄ້າໄດ້ບໍ່ຈຳກັດຈຳນວນໂຄງການ.",
        "features": [
          "ທຸກຢ່າງໃນລະຫັດສ່ວນຕົວ",
          "ໃບອະນຸຍາດການຄ້າສຳລັບງານລູກຄ້າ",
          "ສ້າງໄດ້ຈັກ Portfolio ກໍໄດ້ຕາມໃຈ",
          "ອັບເດດລະຫັດຟຣີຕະຫຼອດຊີວິດ",
          "ຊ່ວຍເຫຼືອພິເສດທາງອີເມລ໌ 90 ວັນ"
        ]
      },
      "hi": {
        "name": "कमर्शियल सोर्स",
        "tagline": "क्लाइंट पोर्टफोलियो बनाने के लिए सोर्स कोड का उपयोग करें, जितने प्रोजेक्ट्स आप चाहें उतने के लिए।",
        "features": [
          "पर्सनल सोर्स में सब कुछ",
          "क्लाइंट के काम के लिए कमर्शियल लाइसेंस",
          "जितने चाहें उतने पोर्टफोलियो बनाएं",
          "जीवन भर के लिए मुफ्त सोर्स अपडेट",
          "90 दिनों के लिए प्राथमिकता ईमेल सपोर्ट"
        ]
      },
      "bn": {
        "name": "কমার্শিয়াল সোর্স",
        "tagline": "সোর্স কোড দিয়ে ক্লায়েন্টের পোর্টফোলিও তৈরি করুন, যত খুশি প্রজেক্টের জন্য।",
        "features": [
          "পার্সোনাল সোর্সের সব সুবিধা",
          "ক্লায়েন্টের কাজের জন্য কমার্শিয়াল লাইসেন্স",
          "যত খুশি পোর্টফোলিও তৈরি করুন",
          "আজীবন বিনামূল্যে সোর্স আপডেট",
          "৯০ দিনের প্রায়োরিটি ইমেইল সাপোর্ট"
        ]
      },
      "ar": {
        "name": "الكود التجاري",
        "tagline": "ابنِ معارض أعمال للعملاء باستخدام الكود المصدري، لعدد غير محدود من المشاريع.",
        "features": [
          "كل ما في باقة الكود الشخصي",
          "رخصة تجارية لأعمال العملاء",
          "ابنِ عدداً غير محدود من المواقع",
          "تحديثات مجانية للكود مدى الحياة",
          "90 يوماً من دعم البريد الإلكتروني ذي الأولوية"
        ]
      },
      "fa": {
        "name": "سورس تجاری",
        "tagline": "با سورس‌کد، برای هر تعداد پروژه‌ای که دوست دارید، نمونه‌کار مشتری بسازید.",
        "features": [
          "همه چیز در سورس شخصی",
          "مجوز تجاری برای کارهای مشتری",
          "به هر تعداد که می‌خواهید نمونه‌کار بسازید",
          "به‌روزرسانی‌های رایگان مادام‌العمر سورس",
          "۹۰ روز پشتیبانی اولویت‌دار ایمیلی"
        ]
      },
      "he": {
        "name": "קוד מקור מסחרי",
        "tagline": "בנו אתרי פורטפוליו ללקוחות בעזרת קוד המקור, לכל פרויקט שתרצו.",
        "features": [
          "כל מה שיש בקוד האישי",
          "רישיון מסחרי לעבודות עבור לקוחות",
          "בנו כמה פורטפוליואים שתרצו",
          "עדכוני קוד בחינם לכל החיים",
          "90 ימי תמיכה טכנית בעדיפות"
        ]
      },
      "ur": {
        "name": "کمرشل سورس",
        "tagline": "سور س کوڈ کے ساتھ کلائنٹ پورٹ فولیوز بنائیں، جتنے پروجیکٹس چاہیں کریں۔",
        "features": [
          "پرسنل سورس کی تمام چیزیں",
          "کلائنٹ کے کام کے لیے کمرشل لائسنس",
          "جتنے چاہیں پورٹ فولیوز بنائیں",
          "زندگی بھر مفت سورس اپ ڈیٹس",
          "90 دن کی ترجیحی ای میل سپورٹ"
        ]
      },
      "tr": {
        "name": "Ticari Kaynak Kod",
        "tagline": "Kaynak kodu ile dilediğiniz kadar müşteri portfolyosu oluşturun.",
        "features": [
          "Kişisel Kaynak Kod paketindeki her şey",
          "Müşteri projeleri için ticari lisans",
          "İstediğiniz kadar portfolyo oluşturun",
          "Ömür boyu ücretsiz güncellemeler",
          "90 gün öncelikli e-posta desteği"
        ]
      },
      "ru": {
        "name": "Коммерческий исходный код",
        "tagline": "Используйте код для создания портфолио для клиентов в любых количествах.",
        "features": [
          "Всё из пакета Личный",
          "Коммерческая лицензия для работы с клиентами",
          "Неограниченное число портфолио",
          "Бесплатные обновления кода навсегда",
          "Приоритетная поддержка по почте 90 дней"
        ]
      },
      "uk": {
        "name": "Комерційний код",
        "tagline": "Використовуйте код для створення портфоліо клієнтів без обмежень за кількістю проектів.",
        "features": [
          "Все, що в Особистому коді",
          "Комерційна ліцензія для клієнтської роботи",
          "Створюйте стільки портфоліо, скільки хочете",
          "Довічні оновлення коду",
          "90 днів пріоритетної підтримки"
        ]
      },
      "pl": {
        "name": "Kod komercyjny",
        "tagline": "Buduj portfolio dla klientów, bez limitu projektów.",
        "features": [
          "Wszystko z kodu osobistego",
          "Licencja komercyjna na projekty dla klientów",
          "Buduj dowolną liczbę portfolio",
          "Dożywotnie darmowe aktualizacje kodu",
          "90 dni priorytetowego wsparcia mailowego"
        ]
      },
      "cs": {
        "name": "Komerční zdrojový kód",
        "tagline": "Vytvářejte klientská portfolia pomocí tohoto kódu pro libovolný počet projektů.",
        "features": [
          "Vše z balíčku Osobní zdrojový kód",
          "Komerční licence pro práci s klienty",
          "Vytvořte kolik portfolií chcete",
          "Doživotní aktualizace kódu zdarma",
          "90 dní prioritní e-mailové podpory"
        ]
      },
      "de": {
        "name": "Kommerzieller Quellcode",
        "tagline": "Baue Kunden-Portfolios mit dem Quellcode, für so viele Projekte wie du möchtest.",
        "features": [
          "Alles aus dem persönlichen Quellcode",
          "Kommerzielle Lizenz für Kundenarbeit",
          "Erstelle so viele Portfolios wie du willst",
          "Lebenslange kostenlose Quellcode-Updates",
          "90 Tage bevorzugter E-Mail-Support"
        ]
      },
      "fr": {
        "name": "Code source commercial",
        "tagline": "Créez des portfolios pour vos clients avec le code source, pour autant de projets que vous voulez.",
        "features": [
          "Tout ce qui est dans le code source personnel",
          "Licence commerciale pour le travail client",
          "Créez autant de portfolios que vous voulez",
          "Mises à jour gratuites du code source à vie",
          "90 jours de support e-mail prioritaire"
        ]
      },
      "es": {
        "name": "Código comercial",
        "tagline": "Crea portafolios para clientes con este código, para tantos proyectos como quieras.",
        "features": [
          "Todo lo del código personal",
          "Licencia comercial para trabajos de clientes",
          "Crea tantos portafolios como quieras",
          "Actualizaciones de código gratuitas de por vida",
          "90 días de soporte técnico prioritario"
        ]
      },
      "pt": {
        "name": "Código Comercial",
        "tagline": "Crie portfólios para clientes com o código-fonte, para quantos projetos quiser.",
        "features": [
          "Tudo do Código Pessoal",
          "Licença comercial para trabalho com clientes",
          "Crie quantos portfólios desejar",
          "Atualizações de código grátis para sempre",
          "90 dias de suporte prioritário por e-mail"
        ]
      },
      "it": {
        "name": "Codice sorgente commerciale",
        "tagline": "Costruisci portfolio per clienti con il codice sorgente, per tutti i progetti che vuoi.",
        "features": [
          "Tutto quello del pacchetto Codice sorgente personale",
          "Licenza commerciale per lavori per clienti",
          "Costruisci quanti portfolio vuoi",
          "Aggiornamenti gratuiti a vita",
          "90 giorni di assistenza email prioritaria"
        ]
      },
      "nl": {
        "name": "Commerciële Broncode",
        "tagline": "Bouw portfolio's voor klanten met deze broncode, voor zoveel projecten als je wilt.",
        "features": [
          "Alles in Persoonlijke Broncode",
          "Commerciële licentie voor klantwerk",
          "Maak zoveel portfolio's als je wilt",
          "Levenslang gratis updates",
          "90 dagen prioriteits-mailsupport"
        ]
      },
      "sv": {
        "name": "Kommersiell källkod",
        "tagline": "Bygg klientportföljer med källkoden, för så många projekt du vill.",
        "features": [
          "Allt i Personlig källkod",
          "Kommersiell licens för klientarbete",
          "Bygg så många portföljer du vill",
          "Gratis uppdateringar av källkod för livet",
          "90 dagars prioriterad e-postsupport"
        ]
      },
      "el": {
        "name": "Εμπορικός Πηγαίος Κώδικας",
        "tagline": "Χρησιμοποιήστε τον κώδικα για να φτιάξετε portfolio για πελάτες, για όσα έργα θέλετε.",
        "features": [
          "Όλα όσα περιλαμβάνει ο Προσωπικός Πηγαίος Κώδικας",
          "Εμπορική άδεια για εργασία με πελάτες",
          "Φτιάξτε όσα portfolio θέλετε",
          "Δωρεάν ενημερώσεις κώδικα για πάντα",
          "90 ημέρες προτεραιότητας στην υποστήριξη email"
        ]
      },
      "ro": {
        "name": "Cod Sursă Comercial",
        "tagline": "Construiește portofolii pentru clienți cu acest cod, pentru oricâte proiecte dorești.",
        "features": [
          "Tot ce este în Cod Sursă Personal",
          "Licență comercială pentru proiecte clienți",
          "Construiește oricâte portofolii dorești",
          "Actualizări de cod gratuite pe viață",
          "90 de zile de asistență prioritară prin email"
        ]
      },
      "hu": {
        "name": "Kereskedelmi forráskód",
        "tagline": "Építs portfóliókat ügyfeleidnek a forráskóddal, tetszőleges számú projektben.",
        "features": [
          "Minden, ami a Személyes csomagban van",
          "Kereskedelmi licenc ügyfélmunkákhoz",
          "Annyi portfóliót építesz, amennyit csak szeretnél",
          "Ingyenes forráskód frissítések örökre",
          "90 nap elsőbbségi e-mail támogatás"
        ]
      }
    }
  }
};

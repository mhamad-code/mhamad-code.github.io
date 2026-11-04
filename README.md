# موقع Mhamad (بورتفوليو)

موقع ثابت (HTML / CSS / JS) جاهز للرفع على GitHub Pages.

## هيكل الملفات

```
index.html        الصفحة الرئيسية (الصورة + آخر 7 مشاريع)
projects.html     كل المشاريع مع بحث
login.html        تسجيل الدخول وإنشاء حساب
css/style.css     الستايل المشترك (الألوان، الأزرار، الكروت، النافبار)
css/auth.css      ستايل صفحة تسجيل الدخول فقط
js/config.js      الإعدادات: اسم GitHub وإعدادات Firebase (الملف الوحيد اللي بتعدله)
js/firebase.js    تهيئة Firebase
js/nav.js         زر Login / اسم المستخدم + تسجيل الخروج في النافبار
js/login.js       منطق تسجيل الدخول (إيميل، Google، GitHub)
js/projects.js    جلب المشاريع من GitHub وعرضها
assets/           الصور
```

## 1) إعداد Firebase

1. من https://console.firebase.google.com أنشئ مشروع جديد.
2. أضف تطبيق ويب (أيقونة `</>`) وانسخ الـ `firebaseConfig` إلى `js/config.js`.
3. من **Authentication > Sign-in method** فعّل:
   - **Email/Password**
   - **Google**
   - **GitHub**: أنشئ OAuth App من GitHub (Settings > Developer settings > OAuth Apps)،
     ضع فيها الـ Callback URL اللي بيعطيك إياه Firebase، ثم الصق Client ID و Client secret في Firebase.
4. من **Authentication > Settings > Authorized domains** أضف دومين موقعك:
   `mhamad-code.github.io` (و `localhost` للتجربة).

لحد ما تكمل الخطوات، الموقع بيشتغل عادي والمشاريع بتظهر، وصفحة تسجيل الدخول بتعرض رسالة إن Firebase مش مضبوط.

## 2) الرفع على GitHub Pages

1. أنشئ ريبو جديد (مثلاً `mhamad-code.github.io` ليكون الرابط `https://mhamad-code.github.io`).
2. ارفع كل الملفات في جذر الريبو.
3. **Settings > Pages > Source: Deploy from a branch > main / (root)**.

## 3) التجربة محلياً

لا تفتح الملفات بالضغط المزدوج (الـ modules بتحتاج سيرفر). شغّل:

```
python3 -m http.server 8000
```

وافتح http://localhost:8000

## ملاحظات

- المشاريع بتنجلب من `github.com/mhamad-code` وبتنرتب حسب آخر تحديث. الـ forks وريبو البروفايل مستثناة.
- GitHub بيسمح بـ 60 طلب بالساعة بدون مفتاح، فالنتيجة بتتخزن 10 دقائق في المتصفح.
- لتغيير عدد المشاريع بالرئيسية عدّل `data-limit="7"` في `index.html`.

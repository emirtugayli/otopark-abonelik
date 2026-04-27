# Otopark Abonelik Paneli (BTS Garage)

Tek bir otopark için **abone takip paneli**. Aboneleri ekler, ödeme günlerini takip eder ve tek tıkla WhatsApp üzerinden hatırlatma mesajı gönderirsiniz.

> Bu panelde **fiyat / ücret / ödeme tutarı bilgisi yer almaz**. Sadece "kim, hangi araç, hangi gün ödüyor, ödedi mi ödemedi mi" tutulur.

**Stack:** Next.js 14 (App Router, TypeScript) · Supabase (PostgreSQL) · TailwindCSS

---

## Hızlı Kurulum

1. **Gereksinimler:** Node.js 18+, Supabase hesabı.
2. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```
3. **Supabase projesi oluşturun ve migration'ları uygulayın:**
   ```bash
   npm install -g supabase   # daha önce yoksa
   supabase login
   supabase link --project-ref <YOUR_PROJECT_REF>
   supabase db push
   ```
   Bu adım `subscribers` tablosunu oluşturur ve `ABONE LİSTESİ.xlsx` içindeki 57 aboneyi seed olarak yükler.
4. **`.env.local` dosyasını doldurun:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=güçlü-bir-şifre
   ```
5. **Geliştirme sunucusunu çalıştırın:**
   ```bash
   npm run dev
   ```
   Tarayıcıdan `http://localhost:3000` açın, yukarıdaki kullanıcı adı ve şifre ile giriş yapın.

---

## Panel Mantığı

### Şema (`subscribers`)

| Kolon | Tür | Açıklama |
|---|---|---|
| `id` | uuid | birincil anahtar |
| `vehicle_type` | text | `OTOMOBIL` veya `MOTOR` |
| `full_name` | text | Ad Soyad |
| `phone` | text? | `905XXXXXXXXX` formatı (boş olabilir) |
| `plate_number` | text | Plaka |
| `payment_day` | int 1-31 | Ayın hangi günü ödediği |
| `last_paid_at` | date? | En son hangi tarihte "ödendi" işaretlendi |
| `status` | text | `active` veya `cancelled` |

### Durum Hesabı

`payment_day` ve `last_paid_at`'a bakarak her abone için durum **anlık olarak** UI tarafında hesaplanır:

- **PAID** — bu ayın ödeme günü gelmiş ve `last_paid_at` o tarihten sonra ise.
- **DUE_TODAY** — bugün ödeme günü ve henüz ödenmemiş.
- **OVERDUE** — ödeme günü geçmiş ve henüz ödenmemiş.
- **APPROACHING** — ödeme gününe 5 gün veya daha az kalmış.
- **PENDING** — ödeme günü bu ay daha gelmemiş.

### Sayfalar

- `/` — **Ana Sayfa**. 4 büyük kutu (Toplam / Bugün / Yaklaşan / Geciken) + 3 liste.
- `/subscribers` — **Aboneler**. Otomobil/Motor filtresi, abone kartları, her satırda 4 buton:
  - **Mesaj Gönder** — `wa.me/...?text=...` linki açar; bilgisayardaki WhatsApp Web'den mesaj gider.
  - **Ödendi / Ödendiyi Geri Al** — `last_paid_at` günü güncellenir.
  - **Düzenle / Sil**
- `/nasil-kullanilir` — kısa kullanım rehberi.
- `/login` — `ADMIN_USERNAME` + `ADMIN_PASSWORD` ile giriş.

### Mesaj Şablonu

Mesaj şablonu `lib/whatsappMessage.ts` dosyasında sabittir. Değiştirmek için bu dosyadaki `TEMPLATE_DEFAULT` ve `TEMPLATE_OVERDUE` stringlerini düzenleyin. Otomatik gönderim **yoktur**; mesaj her zaman manuel olarak butona basıldığında WhatsApp Web'de açılır.

---

## Notlar

- Çoklu kiracı (multi-tenant) yoktur, tek otoparka göredir.
- Online ödeme entegrasyonu yoktur.
- Otomatik cron / WhatsApp Cloud API kullanımı yoktur.
- Telefon normalizasyonu Türkiye GSM'i içindir (`05XX...`, `5XX...`, `+90...`, `90...` kabul edilir).

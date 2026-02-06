# Parking Lot Subscription Management – MVP

Minimal, production-ready admin panel for a **single parking lot** to manage subscribers, track payments, and send WhatsApp reminders with a clear payment lifecycle.

Built with **Next.js 14 (App Router, TypeScript)**, **Supabase (PostgreSQL + Auth)**, **Supabase Edge Functions + Cron**, and **TailwindCSS**.

> This is **not** multi-tenant and not a SaaS product. One deployment = one parking lot.

---

## Hızlı Kurulum Özeti (TR)

1. **Gereksinimler**
   - Node.js 18+
   - Supabase hesabı ve proje
   - WhatsApp Cloud API (Meta Developer)
2. **Projeyi indir**
   - Bu repo’yu makinenize klonlayın.
3. **Bağımlılıkları yükle**
   - Proje klasöründe:
   ```bash
   npm install
   ```
4. **Supabase’i bağla ve migration’ları çalıştır**
   ```bash
   npm install -g supabase         # daha önce yoksa
   supabase login                  # bir kez
   supabase link --project-ref <YOUR_PROJECT_REF>
   supabase db push                # tüm migration'ları uygular
   ```
5. **.env.local dosyasını doldur**
   - Supabase URL + service role key
   - WhatsApp Cloud API access token + phone number ID
6. **Edge function’ı deploy et ve cron ekle**
   ```bash
   cd supabase
   supabase functions deploy send-reminders --project-ref <YOUR_PROJECT_REF>
   ```
   - Supabase Dashboard → Edge Functions → `send-reminders` → **Schedule**
   - Cron: `0 9 * * *` (her gün 09:00)
7. **Local geliştirme**
   ```bash
   npm run dev
   ```
   - Tarayıcıdan `http://localhost:3000` açın.

Detaylar aşağıdaki bölümlerde.

---

## Features

- **Dashboard**
  - Total subscribers
  - Active subscribers
  - Overdue (status) subscribers
  - Total payments collected this month
  - **Ödemesi Gecikenler listesi**:
    - Filtre: `end_date < today` ve `status != 'cancelled'`
    - Kolonlar: `full_name`, `phone`, `end_date` (next_payment_date), `days_overdue`
    - Üstte: toplam geciken abone sayısı
- **Subscribers management**
  - List subscribers in a clean, responsive table
  - Add / edit / delete subscriber
  - **Mark Payment Received**:
    - Creates a `payments` record
    - Extends `end_date` (next payment date) by 1 month from `max(end_date, today)`
    - Sets `status` to `active`
    - Sıfırlar:
      - `pre_reminder_sent_at`
      - `due_reminder_sent_at`
      - `last_overdue_reminder_sent_at`
- **Overdue highlight**
  - Rows where `end_date < today` or `status = 'overdue'` show with a red background
- **Automation (payment lifecycle)**
  - Supabase Edge Function scheduled daily at **09:00**
  - 3 aşamalı WhatsApp hatırlatma sistemi:
    - 3 gün kala (bir kez)
    - Ödeme günü (bir kez)
    - Gecikme (her gecikme günü en fazla bir kez)

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router, TypeScript), TailwindCSS
- **Backend**: Supabase (PostgreSQL, Edge Functions, Cron, Auth)
- **Messaging**: WhatsApp Cloud API (official Meta API)

---

## 1. Database & Migrations

Migration’lar `supabase/migrations` altında tutulur ve `supabase db push` ile hepsi uygulanır.

- `0001_initial.sql`
  - `subscribers` tablosu:
    - `id uuid primary key default uuid_generate_v4()`
    - `full_name text not null`
    - `phone text not null`
    - `plate_number text not null`
    - `start_date date not null`
    - `end_date date not null` (aynı zamanda **next_payment_date** gibi kullanılır)
    - `monthly_fee numeric not null`
    - `status text check (status in ('active','overdue','cancelled')) default 'active'`
    - `created_at timestamp default now()`
  - `payments` tablosu:
    - `id uuid primary key default uuid_generate_v4()`
    - `subscriber_id uuid references subscribers(id) on delete cascade`
    - `amount numeric not null`
    - `payment_date date not null`
    - `payment_method text default 'cash'`
    - `created_at timestamp default now()`
- `0002_add_last_reminder.sql`
  - `last_reminder_sent_at timestamp null` + index (eski mantık için, geriye dönük uyum)
- `0003_add_payment_reminder_columns.sql`
  - `pre_reminder_sent_at timestamp null`
  - `due_reminder_sent_at timestamp null`
  - `last_overdue_reminder_sent_at timestamp null`
  - İlgili index’ler:
    - `idx_pre_reminder`
    - `idx_due_reminder`
    - `idx_last_overdue_reminder`

Bu şema tek bir otopark işletmesini hedefler, multi-tenant mantık içermez.

---

## 2. Environment Variables

Proje kökünde `.env.local` oluşturun:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

WHATSAPP_ACCESS_TOKEN=your_whatsapp_cloud_api_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
```

- `NEXT_PUBLIC_SUPABASE_URL` – Supabase proje ayarlarından.
- `SUPABASE_SERVICE_ROLE_KEY` – Supabase API ayarlarından (**sadece server-side**).
- `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` – Meta Developer / WhatsApp Cloud API.

Supabase Edge Function için aynı değişkenleri Supabase Dashboard üzerinden Function ayarlarına da ekleyin:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

---

## 3. WhatsApp Cloud API Setup

1. Meta Developer Portal’da bir **WhatsApp Cloud API** app oluşturun.
2. Aşağıdakileri alın:
   - **Phone Number ID**
   - **Access token** (kalıcı)
3. Aşağıdaki template’leri oluşturup onaylatın (örnek isimler, kodda kullanılıyor):
   - `parking_pre_reminder` – 2 parametre:
     1. `full_name`
     2. `next_payment_date` (`YYYY-MM-DD`)
   - `parking_due_reminder` – 2 parametre:
     1. `full_name`
     2. `next_payment_date`
   - `parking_overdue_reminder` – 3 parametre:
     1. `full_name`
     2. `days_overdue` (string olarak)
     3. `next_payment_date`
4. Bu template isimleri şu anda koda **sabit** yazılmıştır. İsterseniz daha sonra env değişkenlerine çıkarabilirsiniz.

Projede kullanılan ana helper:

- `lib/whatsapp.ts` – `sendWhatsAppTemplate(phone, templateName, parameters)`

Edge Function (Deno) tarafında da aynı mantık yeniden uygulanır.

---

## 4. Supabase Edge Function & Cron

### Function

Dosya: `supabase/functions/send-reminders/index.ts`

**Amaç:**

- Her gün 09:00’da abonelik ödeme lifecycle’ını kontrol edip WhatsApp üzerinden hatırlatma göndermek.
- `end_date` alanı **next_payment_date** gibi kullanılır.
- `status != 'cancelled'` olanlar aktif kabul edilir.

**Aşamalar:**

1. **3 gün kala hatırlatma (A) – tek sefer**
   - Koşul:
     - `status != 'cancelled'`
     - `end_date = today + 3`
     - `pre_reminder_sent_at is null`
   - Mesaj template: `parking_pre_reminder(full_name, end_date)`
   - Başarılı gönderim → `pre_reminder_sent_at = now()`

2. **Ödeme günü hatırlatma (B) – tek sefer**
   - Koşul:
     - `status != 'cancelled'`
     - `end_date = today`
     - `due_reminder_sent_at is null`
   - Mesaj template: `parking_due_reminder(full_name, end_date)`
   - Başarılı gönderim → `due_reminder_sent_at = now()`

3. **Gecikme hatırlatması (C) – her gün en fazla 1 kez**
   - Koşul:
     - `status != 'cancelled'`
     - `end_date < today`
     - `last_overdue_reminder_sent_at is null`
       **veya**
       `last_overdue_reminder_sent_at::date < today`
   - `days_overdue = today - end_date` (güne yuvarlanmış, min 1)
   - Mesaj template: `parking_overdue_reminder(full_name, days_overdue, end_date)`
   - Başarılı gönderim → `last_overdue_reminder_sent_at = now()`

**Teknik detaylar:**

- WhatsApp çağrıları `sendWhatsAppTemplate` fonksiyonu ile yapılır:
  - Telefon numarası Türkiye için normalize edilir (`905XXXXXXXXX` formatı).
  - Hata durumunda `false` döner; exception fırlatıp fonksiyonu çökertmez.
- Her abone için `try/catch` kullanılır:
  - Tek bir abonedeki hata tüm job’u bozmaz.
- Fonksiyon sonunda daima `200 OK` döner ve JSON’da kaç adet pre/due/overdue mesajı başarıyla gittiği raporlanır.

### Deploy the function

```bash
cd supabase
supabase functions deploy send-reminders --project-ref <YOUR_PROJECT_REF>
```

Dashboard’da function’a environment variable’ları eklemeyi unutmayın (bkz. **Environment Variables** bölümü).

### Schedule the cron job

Supabase Dashboard:

1. **Edge Functions → send-reminders → Schedule**
2. Yeni schedule:
   - **Cron expression**: `0 9 * * *`
   - **Time zone**: sizin zaman diliminiz

---

## 5. Phone Normalization (Türkiye)

Telefon numaraları hem Next.js API tarafında hem Edge Function içinde normalize edilir.

- Hedef format: `905XXXXXXXXX`
- Kabul edilen örnek girişler:
  - `05XXXXXXXXX`
  - `5XXXXXXXXX`
  - `+905XXXXXXXXX`
  - `905XXXXXXXXX`
- `lib/phone.ts` içindeki `normalizeTurkishPhone` fonksiyonu:
  - Hatalı formatta input gelirse exception atar.
  - API route’ları bu hatayı yakalayıp `400 Bad Request` döner.

Edge Function tarafında da benzer bir normalize fonksiyonu vardır; geçersiz numaralar loglanır ve gönderim **skip** edilir.

---

## 6. Running the Next.js App Locally

Bağımlılıkları yükleyin:

```bash
npm install
```

Geliştirme sunucusunu çalıştırın:

```bash
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini açın.

---

## 7. Admin Panel Overview

### Dashboard (`/`)

- Toplam abone sayısı
- Aktif abone sayısı
- Overdue (status) abone sayısı
- Bu ay toplanan toplam ödeme
- **Ödemesi Gecikenler**:
  - Filtre: `end_date < today` ve `status != 'cancelled'`
  - Kolonlar:
    - `full_name`
    - `phone`
    - `end_date` (next_payment_date)
    - `days_overdue`

### Subscribers (`/subscribers`)

- Responsive tablo:
  - Name, phone, plate, start date, end date, status, monthly fee
- Overdue highlight:
  - `end_date < today` veya `status = 'overdue'` ise satır hafif kırmızı
- Satır aksiyonları:
  - **Mark payment**
    - Tutar input’u (default: `monthly_fee`)
    - `payments` tablosuna insert:
      - `payment_date = today`
      - `payment_method = 'cash'`
    - `subscribers.end_date` alanını 1 ay ileri alır (`max(end_date, today) + 1 ay`)
    - `status = 'active'`
    - Reminder alanlarını resetler:
      - `pre_reminder_sent_at = null`
      - `due_reminder_sent_at = null`
      - `last_overdue_reminder_sent_at = null`
  - **Edit**
    - Abone bilgilerini güncelleyen modal
  - **Delete**
    - Aboneyi siler, ilgili payments kayıtları cascade ile silinir

API route’ları:

- `app/api/subscribers/route.ts` – list, create
- `app/api/subscribers/[id]/route.ts` – update, delete
- `app/api/subscribers/[id]/mark-payment/route.ts` – payment + extend subscription + reminder reset

UI:

- `app/subscribers/page.tsx`

---

## 8. Tailwind & UI

- Global stiller: `app/globals.css`
- Tailwind konfigürasyonu: `tailwind.config.ts`, `postcss.config.mjs`
- Minimal admin görünümü:
  - Dashboard’da basit kartlar
  - Temiz tablolar, hafif gölgeler
  - Mobilde yatay scroll destekli

---

## 9. Deployment

Bu Next.js uygulamasını şuralara deploy edebilirsiniz:

- **Vercel**
- **Supabase Hosting**
- Next.js 14 destekleyen herhangi bir Node.js host

Örnek: Vercel

1. Bu projeyi bir Git repo’suna push edin.
2. Vercel’de yeni proje oluşturup bu repo’yu bağlayın.
3. Vercel ortam değişkenlerini ayarlayın:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
4. Deploy edin.

Admin panele erişimi sadece otopark sahibiyle sınırlamak için ek güvenlik önlemleri alın:

- Basit HTTP Basic Auth,
- Supabase Auth (email/password),
- VPN veya IP allowlist, vb.

---

## 10. Notes & Limitations

- **No multi-tenant**: bir deployment = bir otopark.
- **No roles / permissions UI**: erişimi dışarıdan sınırlandırın.
- **No online payments integration**: ödemeler panelden manuel işlenir.
- **No analytics charts**: dashboard sade metrikler gösterir.

Odak noktası: **basitlik**, **güvenilirlik** ve **kolay kurulum**. 


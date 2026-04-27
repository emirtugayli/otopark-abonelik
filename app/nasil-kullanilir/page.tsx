export default function GuidePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Nasıl Kullanılır?</h1>
        <p className="mt-1 text-base text-slate-600">
          Aşağıdaki adımları takip ederek paneli kolayca kullanabilirsiniz.
        </p>
      </div>

      <Step
        n={1}
        title="Ana Sayfa"
        body="Açılışta gördüğünüz ekranda 4 büyük kutu vardır: Toplam Abone, Bugün Ödeme Günü, Yaklaşan ve Geciken. Hangi abonelerin ödemesi geciktiyse hemen burada görebilirsiniz."
      />

      <Step
        n={2}
        title="Yeni Abone Ekleme"
        body={
          <>
            <strong>Aboneler</strong> sayfasına gidin. Sağ üstteki yeşil{" "}
            <strong>+ Yeni Abone Ekle</strong> butonuna basın. Aracın türünü
            (Otomobil mi Motor mu?), kişinin adını, telefonunu, plakayı ve ayın
            kaçında ödeme yaptığını yazıp <strong>Kaydet</strong> deyin.
          </>
        }
      />

      <Step
        n={3}
        title="WhatsApp ile Mesaj Gönderme"
        body={
          <>
            Bir abonenin ödeme günü yaklaştığında ya da geciktiğinde, abone
            kartındaki yeşil <strong>Mesaj Gönder</strong> butonuna basın.
            Bilgisayarınızda WhatsApp Web açıksa, mesaj otomatik olarak hazır
            şekilde WhatsApp&apos;ta açılır. Tek yapmanız gereken{" "}
            <strong>Gönder</strong> tuşuna basmak.
          </>
        }
      />

      <Step
        n={4}
        title="Ödeme Geldi mi? Sadece İşaretleyin"
        body={
          <>
            Bir abone ödemesini yaptığında abone kartındaki yeşil{" "}
            <strong>✓ Ödendi</strong> butonuna bir kez basın. Sistem o ay için
            kişiyi &quot;ödendi&quot; olarak işaretler ve ödeme günü bir sonraki aya
            kayar. Yanlışlıkla işaretlediyseniz <strong>Ödendiyi Geri Al</strong>{" "}
            ile geri alabilirsiniz.
          </>
        }
      />

      <Step
        n={5}
        title="Listeyi Süzme"
        body={
          <>
            <strong>Aboneler</strong> sayfasının üstündeki{" "}
            <strong>Tümü / 🚗 Otomobil / 🏍️ Motor</strong> butonlarına basarak
            listeyi sadece istediğiniz tipe göre filtreleyebilirsiniz.
          </>
        }
      />

      <Step
        n={6}
        title="Düzenleme veya Silme"
        body={
          <>
            Bir abonenin bilgisini değiştirmek için kartındaki{" "}
            <strong>✎ Düzenle</strong> butonuna basın. Aboneliği iptal etmek
            için <strong>🗑 Sil</strong> butonunu kullanın.
          </>
        }
      />

      <div className="mt-6 rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <strong>İpucu:</strong> Mesaj Gönder butonunun çalışması için bilgisayarınızda{" "}
        <a
          href="https://web.whatsapp.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          web.whatsapp.com
        </a>{" "}
        açık olmalı ve cep telefonunuzdan WhatsApp Web&apos;e bağlı olmalısınız.
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-3 text-lg font-bold text-slate-900">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-base font-extrabold text-emerald-700">
          {n}
        </span>
        {title}
      </h2>
      <p className="mt-2 text-base leading-relaxed text-slate-700">{body}</p>
    </section>
  );
}

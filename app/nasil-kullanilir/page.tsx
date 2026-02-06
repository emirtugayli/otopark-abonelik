export default function GuidePage() {
    return (
        <div className="mx-auto max-w-2xl space-y-8 py-8">
            <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Sistem Nasıl Kullanılır?
                </h1>
                <p className="text-lg text-slate-600">
                    Otopark Abonelik Paneli kullanım kılavuzu.
                </p>
            </div>

            <div className="space-y-6">
                <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                            1
                        </span>
                        Abone Ekleme
                    </h2>
                    <p className="mt-2 text-slate-600">
                        "Aboneler" sayfasına gidin ve sağ üstteki <strong>"Abone Ekle"</strong> butonuna tıklayın.
                        Abone bilgilerini eksiksiz doldurun ve kaydedin.
                    </p>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                            2
                        </span>
                        Ödeme Alma
                    </h2>
                    <p className="mt-2 text-slate-600">
                        Bir abone ödemesini yaptığında, listedeki <strong>"Ödeme İşaretle"</strong> butonuna basın.
                        Çıkan pencerede tutarı kontrol edip <strong>"Ödemeyi Onayla"</strong> diyerek işlemi tamamlayın.
                        Bu işlem abonenin süresini otomatik olarak 1 ay uzatır.
                    </p>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                            3
                        </span>
                        Abone Silme / İptal
                    </h2>
                    <p className="mt-2 text-slate-600">
                        Abonelik iptali için "Sil" butonunu kullanın.
                        <br />
                        <span className="mt-2 block rounded bg-amber-50 p-2 text-sm text-amber-800">
                            <strong>Dikkat:</strong> Silinen bir abonenin geçmişte yaptığı ödemeler kasadan <u>silinmez</u>.
                            Sadece gelecekte ondan para beklemezsiniz.
                        </span>
                    </p>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                            4
                        </span>
                        Panel (Ciro) Takibi
                    </h2>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-slate-600">
                        <li><strong>Tahsil Edilen (Kasa):</strong> Cebinize giren net nakit paradır.</li>
                        <li><strong>Tahsilat Bekleyen:</strong> Aktif abonelerden henüz almadığınız ama almanız gereken paradır.</li>
                        <li><strong>Aylık Toplam Ciro:</strong> Tüm aboneler ödeme yaparsa ulaşacağınız toplam tutardır.</li>
                    </ul>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                            5
                        </span>
                        Otomatik Hatırlatma Sistemi
                    </h2>
                    <p className="mt-2 text-slate-600">
                        Abonelerinize ödeme günü yaklaştığında veya geçtiğinde WhatsApp üzerinden hazır mesaj gönderebilirsiniz.
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-slate-600">
                        <li>Üst menüdeki <strong>Ayarlar</strong> kısmından kaç gün kala hatırlatılacağını ve mesaj şablonlarını belirleyin.</li>
                        <li>Aboneler listesinde, günü gelen veya geçen kişilerin yanında otomatik olarak yeşil renkli <strong>Hatırlat</strong> butonu çıkar.</li>
                        <li><strong>Akıllı Şablon:</strong> Eğer ödeme günü geçmediyse "Yaklaşıyor", geçtiyse "Gecikmiştir" mesajı otomatik seçilir.</li>
                        <li>Buton, ödeme alınana kadar abonenin yanında kalmaya devam eder.</li>
                    </ul>
                </section>
            </div>

            <div className="mt-8 text-center text-sm text-slate-500">
                Yardım veya destek için geliştirici ile iletişime geçebilirsiniz.
            </div>
        </div>
    );
}

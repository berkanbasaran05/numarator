import { useEffect, useState } from "react";
import localFont from "next/font/local";

// Fontları tanımlama
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Order tipi
interface Order {
  createdAt: string;
  updatedAt: string;
  id: number;
  number: string;
}

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]); // Orders state'i
  const [isPortrait, setIsPortrait] = useState<boolean>(true); // Yön durumu

  // Veriyi Fetch Eden Fonksiyon
  const fetchOrders = async (): Promise<void> => {
    try {
      const response = await fetch(
        `${process.env.NEXT_APP_API_URL}/api/order/getAllCustomerOrderNo`
      ); // API endpoint'inizi burada belirtin
      if (!response.ok) {
        throw new Error("Veriler alınırken bir hata oluştu.");
      }
      const data: Order[] = await response.json(); // Gelen verileri Order tipinde al
      setOrders(data);
    } catch (error) {
      console.error("Hata:", error);
    }
  };

  // Yönü Kontrol Etme
  const checkOrientation = () => {
    setIsPortrait(window.matchMedia("(orientation: portrait)").matches);
  };

  useEffect(() => {
    fetchOrders(); // İlk yüklemede verileri çek
    const intervalId = setInterval(fetchOrders, 5000); // 5 saniyede bir çalıştır

    checkOrientation(); // Yönü kontrol et
    window.addEventListener("resize", checkOrientation); // Ekran boyutları değiştiğinde kontrol et

    return () => {
      clearInterval(intervalId); // Component unmount olunca interval'i temizle
      window.removeEventListener("resize", checkOrientation);
    };
  }, []);

  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} flex flex-col items-center justify-center space-y-12 px-12 font-[family-name:var(--font-geist-sans)]`}
    >
      <div className="w-full items-center justify-between  flex flex-col ">
        <img
          className="w-[550px]  h-32 object-cover"
          src={"/images/greenlogo.png"}
          alt="Logo"
        />
        <span className="text-5xl  whitespace-nowrap font-bold">
          HAZIR SİPARİŞLER
        </span>
      </div>
      <div className="w-full border border-white bg-white h-2"></div>

      <div
        className={`grid   ${
          isPortrait
            ? "grid-cols-2 gap-y-40 gap-x-44"
            : "grid-cols-4 gap-y-12 gap-x-28"
        } items-center justify-center`}
      >
        {orders
          .sort((a, b) => b.id - a.id)
          .map((order) => (
            <span
              key={order.id}
              className={` ${
                isPortrait ? "text-8xl" : "text-6xl"
              } font-bold p-4 border  items-center mx-auto flex w-64 justify-center rounded-xl border-white text-white shadow-md`}
            >
              {order.number}
            </span>
          ))}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import Image from "next/image";
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
  const [orders, setOrders] = useState<Order[]>([]); // Orders state'i için tip

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

  // Component yüklendiğinde ve her 15 saniyede bir verileri çek
  useEffect(() => {
    fetchOrders(); // İlk yüklemede verileri çek
    const intervalId = setInterval(fetchOrders, 15000); // 15 saniyede bir çalıştır

    return () => clearInterval(intervalId); // Component unmount olunca interval'i temizle
  }, []);

  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} flex flex-col items-center justify-center space-y-8 px-12 font-[family-name:var(--font-geist-sans)]`}
    >
      <div className="w-full items-center justify-between h-36 flex flex-row ">
        <img
          className="w-[550px] object-cover"
          src={"/images/greenlogo.png"}
          alt="Logo"
        />
        <span className="text-5xl  font-bold">HAZIR OLAN SİPARİŞLER</span>
      </div>
      <div className="w-full border border-white bg-white h-2"></div>

      <div className="grid grid-cols-4  gap-y-12 gap-x-28 items-center justify-center">
        {orders.map((order) => (
          <span
            key={order.id}
            className="text-7xl font-bold p-4 border items-center mx-auto flex w-64 justify-center rounded-xl border-white  text-white shadow-md"
          >
            {order.number}
          </span>
        ))}
      </div>
    </div>
  );
}

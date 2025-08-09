import { useEffect, useState, useRef } from "react";
import localFont from "next/font/local";
import { Nunito } from "next/font/google";
import { io, Socket } from "socket.io-client";
import Confetti from "react-confetti";

// Fontları tanımlama
const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Nunito font tanımı
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

// Order tipi
interface Order {
  createdAt: string;
  updatedAt: string;
  id: number;
  number: string;
  status: string;
  companyId?: number;
  visible?: boolean;
}

interface NewOrderNotification {
  isVisible: boolean;
  order: Order | null;
}

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [prevOrders, setPrevOrders] = useState<Order[]>([]);
  const [notification, setNotification] = useState<NewOrderNotification>({
    isVisible: false,
    order: null,
  });
  const [notificationQueue, setNotificationQueue] = useState<Order[]>([]);
  const [isPortrait, setIsPortrait] = useState<boolean>(true);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(true);

  // İlk yüklemede API'den siparişleri çek

  const fetchOrders = async () => {
    try {
      const pathParts = window.location.pathname.split("/");
      const branchId = pathParts[pathParts.length - 1];
      const response = await fetch(
        `${process.env.NEXT_APP_API_URL}/api/customerScreen/branch/${branchId}`
      );
      if (!response.ok) throw new Error("Veriler alınırken bir hata oluştu.");
      const data: Order[] = await response.json();
      console.log(data);
      // Sadece visible olanları al
      const visibleOrders = data.filter((order) => order.visible !== false);
      setOrders(visibleOrders);
      setPrevOrders(visibleOrders);
    } catch (error) {
      console.error("Hata:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  // Kuyruktan sıradaki bildirimi göster
  useEffect(() => {
    if (!notification.isVisible && notificationQueue.length > 0) {
      const nextOrder = notificationQueue[0];
      setNotification({ isVisible: true, order: nextOrder });
      setNotificationQueue((q) => q.slice(1));
      setTimeout(() => {
        setNotification({ isVisible: false, order: null });
      }, 5000);
    }
  }, [notification.isVisible, notificationQueue]);

  // --- SOCKET.IO ---
  useEffect(() => {
    // URL'den branchId'yi al
    const pathParts = window.location.pathname.split("/");
    const branchId = pathParts[pathParts.length - 1];
    const key = process.env.NEXT_PUBLIC_CUSTOMERSCREEN_SOCKET_KEY;
    if (!branchId || !key) return;
    const socket: Socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      auth: { branchId, key },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });
    socket.on("connect", () => {
      setIsSocketConnected(true);
      console.log("Müşteri ekranı socket bağlı!");
    });
    socket.on("disconnect", () => {
      setIsSocketConnected(false);
      console.warn("Socket bağlantısı koptu, tekrar bağlanıyor...");
    });
    socket.on("reconnect_attempt", () => {
      setIsSocketConnected(false);
    });
    socket.on("reconnect", () => {
      setIsSocketConnected(true);
    });
    socket.on("newOrder", (order: Order) => {
      if (order.visible === false) return;
      setNotificationQueue((q) => [...q, order]);
      setPrevOrders(orders);
      setOrders((prev) => [...prev, order]);
      fetchOrders();
    });
    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line
  }, []);

  // Yeni sipariş kontrolü (grid animasyonu için)
  const isNewOrder = (order: Order) => {
    return !prevOrders.find((prevOrder) => prevOrder.id === order.id);
  };

  // Yönü Kontrol Etme
  const checkOrientation = () => {
    setIsPortrait(window.matchMedia("(orientation: portrait)").matches);
  };

  useEffect(() => {
    checkOrientation(); // Yönü kontrol et
    window.addEventListener("resize", checkOrientation); // Ekran boyutları değiştiğinde kontrol et

    return () => {
      window.removeEventListener("resize", checkOrientation);
    };
  }, []);

  if (notification.isVisible && notification.order) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-brand-blue-primary bg-opacity-90 z-50">
        {notification.order.status === "PAYED" && <Confetti />}
        <div className="relative w-[800px] flex flex-col items-center space-y-8">
          <img
            src="/images/colored.svg"
            alt="Logo"
            className="w-[400px] object-contain"
          />
          <div
            className="relative w-full flex justify-center items-center"
            style={{ minHeight: "0" }}
          >
            <div
              className="relative flex items-center justify-center"
              style={{ width: "clamp(300px, 40vw, 600px)", height: "auto" }}
            >
              <img
                src="/images/chicken.png"
                className="w-full h-auto max-w-[600px] max-h-[60vh] object-contain"
                alt="Ticket Background"
                style={{ display: "block" }}
              />
              <div
                className={`absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center w-[clamp(180px,18vw,340px)] h-[clamp(60px,7vw,120px)]`}
                style={{
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              >
                {/** <div className="number-animation w-full flex justify-center items-center mb-[clamp(20px,2vw,50px)]">
                  {notification.order.number.split("").map((digit, index) => (
                    <span
                      key={index}
                      className="font-bold"
                      style={{
                        fontSize: "clamp(2rem, 6vw, 6rem)",
                        animationDelay: `${index * 0.1}s`,
                        lineHeight: 1,
                      }}
                    >
                      {digit}
                    </span>
                  ))}
                </div> */}
              </div>
            </div>
          </div>
          <div className="text-white text-center flex flex-col space-y-4">
            <h2
              className={`text-5xl font-bold ${
                notification.order.status === "PAYED"
                  ? "neon-text-PAYED"
                  : "neon-text-COMPLETED"
              }`}
            >
              {notification.order.status === "PAYED"
                ? "Sipariş Hazırlanıyor"
                : "Sipariş Hazır"}
            </h2>
            <p
              className={`text-5xl font-semibold flex flex-col ${
                notification.order.status === "PAYED"
                  ? "neon-text-PAYED"
                  : "neon-text-COMPLETED"
              }`}
            >
              <span className="number-animation ml-2">
                {notification.order.number.split("").map((digit, index) => (
                  <span
                    key={index}
                    className="font-extrabold"
                    style={{
                      animationDelay: `${index * 0.1}s`,
                      fontSize: "clamp(3.9rem, 13vw, 13.5rem)",
                    }}
                  >
                    {digit}
                  </span>
                ))}
              </span>
              <span className="text-3xl font-bold">Sipariş Numarası</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} 
        bg-brand-blue-primary min-h-screen h-screen w-screen overflow-hidden select-none
        flex flex-col items-center space-y-2 sm:space-y-4 p-2 sm:p-4 md:p-8 lg:p-12 
        font-[family-name:var(--font-nunito)] max-w-screen-2xl mx-auto aspect-[16/9]`}
      style={{ maxHeight: "100vh", maxWidth: "100vw" }}
    >
      <img
        src="/images/ajantavuk.png"
        alt="Arka Plan Tavuk"
        className="absolute inset-0 w-full h-full object-cover opacity-5 pointer-events-none select-none z-0"
        draggable="false"
        style={{ maxWidth: "100vw", maxHeight: "100vh" }}
      />
      <style jsx>{`
        @keyframes neonGlowPAYED {
          0% {
            text-shadow: 0 0 10px rgba(245, 158, 11, 0.7),
              0 0 20px rgba(245, 158, 11, 0.5), 0 0 30px rgba(245, 158, 11, 0.3);
            box-shadow: 0 0 0px 0px #f59e0b;
            border-color: #ec3b19;
          }
          50% {
            text-shadow: 0 0 20px rgba(245, 158, 11, 0.9),
              0 0 40px rgba(245, 158, 11, 0.7), 0 0 60px rgba(245, 158, 11, 0.5);
            box-shadow: 0 0 32px 8px #f59e0b;
            border-color: #f59e0b;
          }
          100% {
            text-shadow: 0 0 10px rgba(245, 158, 11, 0.7),
              0 0 20px rgba(245, 158, 11, 0.5), 0 0 30px rgba(245, 158, 11, 0.3);
            box-shadow: 0 0 0px 0px #f59e0b;
            border-color: #ec3b19;
          }
        }

        @keyframes neonGlowCOMPLETED {
          0% {
            text-shadow: 0 0 10px rgba(16, 185, 129, 0.7),
              0 0 20px rgba(16, 185, 129, 0.5), 0 0 30px rgba(16, 185, 129, 0.3);
            box-shadow: 0 0 0px 0px #10b981;
            border-color: #10b981;
          }
          50% {
            text-shadow: 0 0 20px rgba(16, 185, 129, 0.9),
              0 0 40px rgba(16, 185, 129, 0.7), 0 0 60px rgba(16, 185, 129, 0.5);
            box-shadow: 0 0 32px 8px #10b981;
            border-color: #10b981;
          }
          100% {
            text-shadow: 0 0 10px rgba(16, 185, 129, 0.7),
              0 0 20px rgba(16, 185, 129, 0.5), 0 0 30px rgba(16, 185, 129, 0.3);
            box-shadow: 0 0 0px 0px #10b981;
            border-color: #10b981;
          }
        }

        @keyframes numberAppear {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.5);
          }
          60% {
            transform: translateY(-10px) scale(1.2);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .number-animation {
          display: inline-block;
        }

        .number-animation > span {
          display: inline-block;
          animation: numberAppear 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .neon-text-PAYED {
          animation: neonGlowPAYED 2s ease-in-out infinite;
          animation-duration: 10s;
        }

        .neon-text-COMPLETED {
          animation: neonGlowCOMPLETED 2s ease-in-out infinite;
          animation-duration: 10s;
        }

        .new-order-PAYED {
          animation: neonGlowPAYED 2s ease-in-out infinite;
          animation-duration: 10s;
        }
        .new-order-COMPLETED {
          animation: neonGlowCOMPLETED 2s ease-in-out infinite;
          animation-duration: 10s;
        }

        .order-card {
          backdrop-filter: blur(8px);
          transition: all 0.3s ease;
          min-width: clamp(80px, 7vw, 140px);
          min-height: clamp(80px, 7vw, 140px);
          max-width: 16vw;
          max-height: 16vw;
        }
        .order-card > span,
        .order-card {
          font-size: clamp(2.6rem, 5vw, 5.8rem);
        }
        .number-animation > span {
          font-size: clamp(3.4rem, 10.1vw, 11.8rem);
        }
        .number-animation {
          min-width: clamp(80px, 10vw, 200px);
        }
        .slide-in {
          animation: slideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) both;
        }
        @keyframes slideIn {
          0% {
            opacity: 0;
            transform: translateY(40px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="w-full items-center justify-between py-2 flex flex-col slide-in">
        <img
          className="h-[8vw] max-h-20 object-contain pointer-events-none"
          src={"/images/colored.svg"}
          alt="Logo"
          draggable="false"
        />
      </div>

      <div className="w-full h-full flex flex-col justify-between gap-4 lg:gap-8">
        <div
          className="w-full flex-1 flex flex-col gap-2 sm:gap-4 px-2 sm:px-4 md:px-6 lg:px-8 slide-in"
          style={{ animationDelay: "0.2s", minHeight: "0" }}
        >
          <div className="w-full border border-[#EC3B19] bg-[#EC3B19] h-[0.5vw] min-h-[2px] max-h-2"></div>
          <span className="text-[clamp(2rem,3vw,3.5rem)] text-[#EC3B19] text-center font-bold pointer-events-none">
            Hazırlanıyor
          </span>

          <div className="relative w-full h-full">
            <div
              className={`grid w-full mx-auto gap-4 sm:gap-6 md:gap-1 
                auto-rows-min grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 landscape:grid-cols-6 
                justify-items-center content-start overflow-hidden overscroll-none relative z-10`}
              style={{ minHeight: "0" }}
            >
              {orders
                .filter((order) => {
                  if (order.status !== "PAYED") return false;
                  const createdAt = new Date(order.createdAt);
                  const now = new Date();
                  const diffMinutes =
                    (now.getTime() - createdAt.getTime()) / 1000 / 60;
                  return diffMinutes <= 30;
                })
                .sort(
                  (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime()
                )
                .map((order, index) => (
                  <span
                    key={order.id}
                    className={`order-card border-2 items-center flex justify-center rounded-xl border-[#EC3B19] text-white shadow-md pointer-events-none select-none slide-in font-extrabold ${
                      isNewOrder(order) ? "new-order-PAYED" : ""
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {order.number}
                  </span>
                ))}
            </div>
          </div>
        </div>

        <div
          className="w-full flex-1 flex flex-col gap-2 sm:gap-4 px-2 sm:px-4 md:px-6 lg:px-8 slide-in"
          style={{ animationDelay: "0.4s", minHeight: "0" }}
        >
          <div className="w-full border border-brand-yellow-primary bg-brand-yellow-primary h-[0.5vw] min-h-[2px] max-h-2"></div>
          <span className="text-[clamp(2rem,3vw,3.5rem)] text-brand-yellow-primary text-center font-bold pointer-events-none">
            Hazırlandı
          </span>

          <div
            className={`grid w-full mx-auto gap-4 sm:gap-6 md:gap-1 
              auto-rows-min grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 landscape:grid-cols-6 
              justify-items-center content-start overflow-hidden overscroll-none relative z-10`}
            style={{ minHeight: "0" }}
          >
            {orders
              .filter((order) => {
                if (order.status !== "COMPLETED") return false;
                const updatedAt = new Date(order.updatedAt);
                const now = new Date();
                const diffMinutes =
                  (now.getTime() - updatedAt.getTime()) / 1000 / 60;
                return diffMinutes <= 5;
              })
              .map((order, index) => (
                <span
                  key={order.id}
                  className={`order-card border-2 items-center flex justify-center rounded-xl border-brand-yellow-primary text-brand-yellow-primary shadow-md pointer-events-none select-none slide-in font-extrabold ${
                    isNewOrder(order) ? "new-order-COMPLETED" : ""
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {order.number}
                </span>
              ))}
          </div>
        </div>
      </div>

      {!isSocketConnected && (
        <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-center py-2 z-[100] font-bold animate-pulse">
          Sunucu ile bağlantı kurulamadı. Tekrar bağlanıyor...
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useRef } from "react";
import localFont from "next/font/local";
import { Nunito } from "next/font/google";
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
}

interface NewOrderNotification {
  isVisible: boolean;
  order: Order | null;
}

// Test için dummy veriler
const initialDummyOrders: Order[] = [
  {
    id: 1,
    createdAt: "2024-03-20T10:30:00Z",
    updatedAt: "2024-03-20T10:30:00Z",
    number: "123",
    status: "preparing",
    companyId: 1,
  },
  {
    id: 2,
    createdAt: "2024-03-20T10:35:00Z",
    updatedAt: "2024-03-20T10:35:00Z",
    number: "456",
    status: "ready",
    companyId: 1,
  },
];

// Yeni sipariş simülasyonu için dummy veriler
const newOrdersDummy: Order[] = [
  {
    id: 3,
    createdAt: "2024-03-20T10:40:00Z",
    updatedAt: "2024-03-20T10:40:00Z",
    number: "789",
    status: "preparing",
    companyId: 1,
  },
  {
    id: 4,
    createdAt: "2024-03-20T10:45:00Z",
    updatedAt: "2024-03-20T10:45:00Z",
    number: "321",
    status: "ready",
    companyId: 1,
  },
];

export default function Home() {
  const [orders, setOrders] = useState<Order[]>(initialDummyOrders);
  const [prevOrders, setPrevOrders] = useState<Order[]>([]);
  const [notification, setNotification] = useState<NewOrderNotification>({
    isVisible: false,
    order: null,
  });
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
  const [isPortrait, setIsPortrait] = useState<boolean>(true); // Yön durumu

  // Test için yeni sipariş ekleme fonksiyonu
  const addNewOrder = () => {
    if (currentOrderIndex < newOrdersDummy.length) {
      const newOrder = newOrdersDummy[currentOrderIndex];
      setNotification({
        isVisible: true,
        order: newOrder,
      });

      // 5 saniye sonra bildirimi kapat
      setTimeout(() => {
        setNotification({
          isVisible: false,
          order: null,
        });
      }, 5000);

      // Siparişi listeye ekle
      setPrevOrders(orders);
      setOrders((prev) => [...prev, newOrder]);
      setCurrentOrderIndex((prev) => prev + 1);
    }
  };

  // Veriyi Fetch Eden Fonksiyon
  const fetchOrders = async (): Promise<void> => {
    // Test için gerçek API çağrısını simüle ediyoruz
    addNewOrder();
  };

  // Yeni sipariş kontrolü
  const isNewOrder = (order: Order) => {
    return !prevOrders.find((prevOrder) => prevOrder.id === order.id);
  };

  // Yönü Kontrol Etme
  const checkOrientation = () => {
    setIsPortrait(window.matchMedia("(orientation: portrait)").matches);
  };

  useEffect(() => {
    const intervalId = setInterval(fetchOrders, 8000); // 8 saniyede bir yeni sipariş ekle

    checkOrientation(); // Yönü kontrol et
    window.addEventListener("resize", checkOrientation); // Ekran boyutları değiştiğinde kontrol et

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("resize", checkOrientation);
    };
  }, [currentOrderIndex]);

  if (notification.isVisible && notification.order) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-90 z-50">
        {notification.order.status === "preparing" && <Confetti />}
        <div className="relative w-[800px] flex flex-col items-center space-y-8">
          <img
            src="/images/colored.svg"
            alt="Logo"
            className="w-[400px] object-contain"
          />
          <div className="relative w-full flex justify-center">
            <img
              src="/images/chicken.png"
              className="w-[600px] h-auto"
              alt="Ticket Background"
            />
            <div
              className={`absolute top-1/2 left-[540px] transform -translate-x-1/2 -translate-y-1/2
                         text-3xl font-extrabold text-white rotate-[-7deg]
                         ${
                           notification.order.status === "preparing"
                             ? "neon-text-preparing"
                             : "neon-text-ready"
                         }`}
            >
              <div className="number-animation">
                {notification.order.number.split("").map((digit, index) => (
                  <span
                    key={index}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {digit}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="text-white text-center space-y-4">
            <h2
              className={`text-5xl font-bold ${
                notification.order.status === "preparing"
                  ? "neon-text-preparing"
                  : "neon-text-ready"
              }`}
            >
              {notification.order.status === "preparing"
                ? "Yeni Sipariş"
                : "Sipariş Hazır"}
            </h2>
            <p
              className={`text-3xl ${
                notification.order.status === "preparing"
                  ? "neon-text-preparing"
                  : "neon-text-ready"
              }`}
            >
              Sipariş Numarası:
              <span className="number-animation ml-2">
                {notification.order.number.split("").map((digit, index) => (
                  <span
                    key={index}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {digit}
                  </span>
                ))}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} 
        bg-white min-h-screen w-screen overflow-hidden select-none
        flex flex-col items-center space-y-2 sm:space-y-4 p-2 sm:p-4 md:p-8 lg:p-12 
        font-[family-name:var(--font-nunito)]`}
    >
      <style jsx>{`
        @keyframes neonGlowPreparing {
          0% {
            text-shadow: 0 0 10px rgba(245, 158, 11, 0.7),
              0 0 20px rgba(245, 158, 11, 0.5), 0 0 30px rgba(245, 158, 11, 0.3);
          }
          50% {
            text-shadow: 0 0 20px rgba(245, 158, 11, 0.9),
              0 0 40px rgba(245, 158, 11, 0.7), 0 0 60px rgba(245, 158, 11, 0.5);
          }
          100% {
            text-shadow: 0 0 10px rgba(245, 158, 11, 0.7),
              0 0 20px rgba(245, 158, 11, 0.5), 0 0 30px rgba(245, 158, 11, 0.3);
          }
        }

        @keyframes neonGlowReady {
          0% {
            text-shadow: 0 0 10px rgba(16, 185, 129, 0.7),
              0 0 20px rgba(16, 185, 129, 0.5), 0 0 30px rgba(16, 185, 129, 0.3);
          }
          50% {
            text-shadow: 0 0 20px rgba(16, 185, 129, 0.9),
              0 0 40px rgba(16, 185, 129, 0.7), 0 0 60px rgba(16, 185, 129, 0.5);
          }
          100% {
            text-shadow: 0 0 10px rgba(16, 185, 129, 0.7),
              0 0 20px rgba(16, 185, 129, 0.5), 0 0 30px rgba(16, 185, 129, 0.3);
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

        .neon-text-preparing {
          animation: neonGlowPreparing 2s ease-in-out infinite;
          animation-duration: 10s;
        }

        .neon-text-ready {
          animation: neonGlowReady 2s ease-in-out infinite;
          animation-duration: 10s;
        }

        .order-card {
          backdrop-filter: blur(8px);
          transition: all 0.3s ease;
        }

        .order-card:not(.new-order-preparing):not(.new-order-ready):hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1),
            0 4px 6px -4px rgb(0 0 0 / 0.1);
        }
      `}</style>

      <div className="w-full items-center justify-between py-2 flex flex-col slide-in">
        <img
          className="h-20 object-contain pointer-events-none"
          src={"/images/colored.svg"}
          alt="Logo"
          draggable="false"
        />
      </div>

      <div className="w-full h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-4 lg:gap-8">
        <div
          className="w-full flex flex-col gap-2 sm:gap-4 px-2 sm:px-4 md:px-6 lg:px-8 slide-in"
          style={{ animationDelay: "0.2s" }}
        >
          <span className="text-4xl sm:text-5xl lg:text-6xl text-black text-center font-bold pointer-events-none">
            Hazırlanıyor
          </span>
          <div className="w-full border border-black bg-black h-1 sm:h-2"></div>
          <div
            className={`grid w-full h-full mx-auto gap-4 sm:gap-6 md:gap-5 
              auto-rows-min grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 
              justify-items-center content-start overflow-y-auto`}
          >
            {orders
              .filter((order) => order.status === "preparing")
              .sort((a, b) => b.id - a.id)
              .map((order, index) => (
                <span
                  key={order.id}
                  className={`text-4xl sm:text-5xl lg:text-6xl xl:text-6xl
                    font-extrabold p-2 sm:p-3 md:p-4 
                    border-2 items-center flex justify-center 
                    w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] md:w-[160px] md:h-[160px]
                    rounded-xl border-gray-600 text-black shadow-md
                    pointer-events-none select-none order-card slide-in
                    ${isNewOrder(order) ? "new-order-preparing" : ""}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {order.number}
                </span>
              ))}
          </div>
        </div>

        <div
          className="w-full flex flex-col gap-2 sm:gap-4 px-2 sm:px-4 md:px-6 lg:px-8 slide-in"
          style={{ animationDelay: "0.4s" }}
        >
          <span className="text-4xl sm:text-5xl lg:text-6xl text-black text-center font-bold pointer-events-none">
            Hazırlandı
          </span>
          <div className="w-full border border-black bg-black h-1 sm:h-2"></div>
          <div
            className={`grid w-full h-full mx-auto gap-4 sm:gap-6 md:gap-5 
              auto-rows-min grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 
              justify-items-center content-start overflow-y-auto`}
          >
            {orders
              .filter((order) => order.status === "ready")
              .sort((a, b) => b.id - a.id)
              .map((order, index) => (
                <span
                  key={order.id}
                  className={`text-4xl sm:text-5xl lg:text-6xl xl:text-6xl
                    font-extrabold p-2 sm:p-3 md:p-4 
                    border-2 items-center flex justify-center 
                    w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] md:w-[160px] md:h-[160px]
                    rounded-xl border-gray-600 text-black shadow-md
                    pointer-events-none select-none order-card slide-in
                    ${isNewOrder(order) ? "new-order-ready" : ""}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {order.number}
                </span>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
